"""
agent/asset_finisher.py — Stage 3 sub-agent.
For the selected option, generates the full asset package and writes spec text.
"""
from __future__ import annotations

import logging
from typing import Any

from store.models import FinalAssets, PropRecord

logger = logging.getLogger(__name__)


class AssetFinisherAgent:
    """
    Sub-agent responsible for Stage 3: producing spec text (material spec, build spec)
    for the selected option. Image generation (Nano Banana Pro) is handled by
    gen/image_jobs.py. This agent writes the text-based deliverables.
    """

    def __init__(self, platform_adapter: Any, gemini_client: Any) -> None:
        self._platform = platform_adapter
        self._gemini = gemini_client

    async def generate_spec_text(self, prop: PropRecord) -> dict[str, str]:
        """
        Produce material_spec and build_spec text for the selected option.
        Uses the fast Gemini tier; escalates to pro only for very complex briefs.
        Returns a dict with keys 'material_spec' and 'build_spec'.
        """
        from config import GEMINI_FAST_MODEL, GEMINI_PRO_MODEL

        if prop.selection is None:
            raise ValueError(
                f"Prop {prop.id!r} has no confirmed selection; cannot finalize."
            )

        selection = prop.selection
        chosen_opt = next(
            (o for o in prop.options if o.id == selection.chosen), None
        )
        rationale = chosen_opt.rationale if chosen_opt else ""

        brief = prop.brief
        is_complex = len(brief.constraints) > 3 or len(brief.on_screen) > 5
        model = GEMINI_PRO_MODEL if is_complex else GEMINI_FAST_MODEL

        response = await self._platform.invoke(
            "asset_finisher",
            {
                "model": model,
                "prop_id": prop.id,
                "brief": brief.model_dump(),
                "chosen_rationale": rationale,
                "selection_why": selection.why,
            },
        )

        material_spec = response.get("material_spec", "")
        build_spec = response.get("build_spec", "")

        # Ground the output — label any speculative text.
        if material_spec and not material_spec.startswith("Proposed"):
            material_spec = f"Proposed: {material_spec}"
        if build_spec and not build_spec.startswith("Proposed"):
            build_spec = f"Proposed: {build_spec}"

        logger.info("AssetFinisherAgent wrote spec text for prop %s", prop.id)
        return {"material_spec": material_spec, "build_spec": build_spec}
