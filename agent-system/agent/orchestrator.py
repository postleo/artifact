"""
agent/orchestrator.py — the routing core.
Decomposes jobs, enforces the two human gates, and coordinates the three sub-agents.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from store.models import (
    FinalAssets,
    Option,
    PropRecord,
    PropStatus,
    Selection,
)

logger = logging.getLogger(__name__)


class Orchestrator:
    """
    Routes each prop through Stage 1 → Gate → Stage 2 → Gate → Stage 3.
    Reads/writes prop state through the repository (single source of truth).
    Enforces that finalize and export cannot run out of order.
    """

    def __init__(
        self,
        repo: Any,
        options_agent: Any,
        selection_agent: Any,
        asset_agent: Any,
        image_job_runner: Any,
        cost_service: Any,
        safety_service: Any,
    ) -> None:
        self._repo = repo
        self._options_agent = options_agent
        self._selection_agent = selection_agent
        self._asset_agent = asset_agent
        self._image_runner = image_job_runner
        self._cost = cost_service
        self._safety = safety_service

    # ------------------------------------------------------------------
    # Stage 1 — Options generation
    # ------------------------------------------------------------------

    async def start_stage1(self, prop_id: str, n_options: int) -> str:
        """
        Transition prop to generating_options, produce option rationales,
        and enqueue a Nano Banana 2 image job per option.
        Returns a job handle.
        """
        prop = await self._repo.get(prop_id)
        if prop is None:
            raise ValueError(f"Prop {prop_id!r} not found")

        await self._repo.transition(prop_id, PropStatus.GENERATING_OPTIONS)

        # Trademark screen before generation.
        tm_result = await self._safety.trademark_screen(prop.brief.what)
        if tm_result != "none":
            prop = await self._repo.get(prop_id)
            prop.flags.trademark_risk = tm_result
            await self._repo.update(prop)
            logger.warning("Trademark risk %s flagged for prop %s", tm_result, prop_id)

        # Generate option rationales via sub-agent.
        prop = await self._repo.get(prop_id)
        options = await self._options_agent.generate_options(prop, n_options)
        prop.options = options
        await self._repo.update(prop)

        # Enqueue one image generation job per option (Nano Banana 2).
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        await self._image_runner.enqueue_options_job(prop_id, job_id, options)

        prop.job_id = job_id
        await self._repo.update(prop)

        logger.info("Stage 1 started for prop %s, job %s", prop_id, job_id)
        return job_id

    async def complete_stage1(self, prop_id: str, image_refs_by_option: dict[str, list[str]]) -> None:
        """
        Called by the generation job when Nano Banana 2 images are ready.
        Attaches image refs to options, runs post-generation moderation + TM screen,
        then transitions to awaiting_options_review.
        """
        prop = await self._repo.get(prop_id)
        if prop is None:
            raise ValueError(f"Prop {prop_id!r} not found")

        for opt in prop.options:
            opt.image_refs = image_refs_by_option.get(opt.id, [])

        # Moderation on every generated image.
        all_refs = [ref for refs in image_refs_by_option.values() for ref in refs]
        mod_result = await self._safety.moderate_images(all_refs)
        prop.flags.moderation = mod_result

        # Post-generation trademark screen.
        tm_result = await self._safety.trademark_screen_images(all_refs)
        if tm_result != "none":
            prop.flags.trademark_risk = tm_result

        # Update cost.
        n_images = len(all_refs)
        await self._cost.record_nb2(prop_id, n_images)
        prop = await self._repo.get(prop_id)

        await self._repo.transition(prop_id, PropStatus.AWAITING_OPTIONS_REVIEW)
        logger.info("Stage 1 complete for prop %s (%d images)", prop_id, n_images)

    # ------------------------------------------------------------------
    # Stage 2 — Selection (Gate 2)
    # ------------------------------------------------------------------

    async def record_selection(
        self,
        prop_id: str,
        chosen_option_id: str,
        chosen_by: str,
        why: str,
    ) -> Selection:
        """Gate 2: record the chosen option. Refuses if not at awaiting_options_review."""
        prop = await self._repo.get(prop_id)
        if prop is None:
            raise ValueError(f"Prop {prop_id!r} not found")

        if prop.status != PropStatus.AWAITING_OPTIONS_REVIEW:
            raise ValueError(
                f"Cannot record selection: prop is in status {prop.status!r}. "
                "Must be 'awaiting_options_review'."
            )

        selection = await self._selection_agent.record_selection(
            prop, chosen_option_id, chosen_by, why
        )

        prop.selection = selection
        await self._repo.update(prop)
        await self._repo.transition(prop_id, PropStatus.SELECTION_CONFIRMED)

        logger.info("Selection recorded for prop %s: option %s", prop_id, chosen_option_id)
        return selection

    # ------------------------------------------------------------------
    # Stage 3 — Asset Finisher
    # ------------------------------------------------------------------

    async def start_stage3(self, prop_id: str) -> str:
        """
        Gate check + start Stage 3. Refuses if selection is not confirmed.
        Triggers Nano Banana Pro image job for the selected option.
        Returns a job handle.
        """
        prop = await self._repo.get(prop_id)
        if prop is None:
            raise ValueError(f"Prop {prop_id!r} not found")

        if prop.status != PropStatus.SELECTION_CONFIRMED:
            raise ValueError(
                f"Cannot finalize: prop is in status {prop.status!r}. "
                "Must be 'selection_confirmed'."
            )

        # Budget check before spending.
        if prop.cost.est_usd >= prop.budget_ceiling_usd:
            await self._repo.transition(prop_id, PropStatus.BUDGET_EXCEEDED)
            raise ValueError(
                f"Prop {prop_id!r} has exceeded its budget ceiling "
                f"(${prop.budget_ceiling_usd:.2f}). Approve budget increase to continue."
            )

        await self._repo.transition(prop_id, PropStatus.GENERATING_FINAL)

        # Generate spec text via sub-agent.
        spec_texts = await self._asset_agent.generate_spec_text(prop)
        prop = await self._repo.get(prop_id)
        prop.final_assets.material_spec = spec_texts["material_spec"]
        prop.final_assets.build_spec = spec_texts["build_spec"]
        await self._repo.update(prop)

        # Enqueue Nano Banana Pro image job.
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        if prop.selection:
            await self._image_runner.enqueue_final_job(prop_id, job_id, prop.selection.chosen)

        prop.job_id = job_id
        await self._repo.update(prop)

        logger.info("Stage 3 started for prop %s, job %s", prop_id, job_id)
        return job_id

    async def complete_stage3(self, prop_id: str, asset_refs: dict[str, list[str]]) -> None:
        """
        Called by the generation job when Nano Banana Pro images are ready.
        Attaches final asset refs, runs moderation, updates cost, transitions to assets_ready.
        """
        prop = await self._repo.get(prop_id)
        if prop is None:
            raise ValueError(f"Prop {prop_id!r} not found")

        prop.final_assets.turnaround = asset_refs.get("turnaround", [])
        prop.final_assets.detail_callouts = asset_refs.get("detail_callouts", [])
        prop.final_assets.variants = asset_refs.get("variants", [])
        await self._repo.update(prop)

        # Moderation on every final image.
        all_refs = [r for refs in asset_refs.values() for r in refs]
        mod_result = await self._safety.moderate_images(all_refs)
        prop = await self._repo.get(prop_id)
        prop.flags.moderation = mod_result
        await self._repo.update(prop)

        # Update cost.
        await self._cost.record_nbpro(prop_id, len(all_refs))

        await self._repo.transition(prop_id, PropStatus.ASSETS_READY)
        logger.info("Stage 3 complete for prop %s", prop_id)
