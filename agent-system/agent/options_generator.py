"""
agent/options_generator.py — Stage 1 sub-agent.
Reads the brief, writes N option records, and triggers Nano Banana 2 generation jobs.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from store.models import Brief, Option, PropRecord

logger = logging.getLogger(__name__)


class OptionsGeneratorAgent:
    """
    Sub-agent responsible for Stage 1: producing N concept options with rationales.
    Image generation is delegated to gen/image_jobs.py (run as background jobs).
    """

    def __init__(self, platform_adapter: Any, gemini_client: Any) -> None:
        self._platform = platform_adapter
        self._gemini = gemini_client  # google.generativeai / google-genai client

    async def generate_options(
        self,
        prop: PropRecord,
        n_options: int,
    ) -> list[Option]:
        """
        Call the platform agent role to produce N option rationales from the brief.
        Returns a list of Option objects (image_refs filled in later by the job).
        """
        from config import GEMINI_FAST_MODEL

        brief = prop.brief
        prompt = (
            f"You are a prop design specialist for a film production.\n\n"
            f"Prop brief:\n"
            f"  What it is: {brief.what}\n"
            f"  On-screen moments: {', '.join(brief.on_screen) or 'unspecified'}\n"
            f"  Era / world: {brief.era or 'unspecified'}\n"
            f"  Constraints: {', '.join(brief.constraints) or 'none'}\n\n"
            f"Generate exactly {n_options} distinct concept directions for this hero prop.\n"
            f"Each direction must be a coherent design take with a one-line rationale "
            f"(max 20 words) explaining why that direction serves the brief.\n"
            f"Label any speculative detail as 'Proposed:'.\n"
            f"Respond as a JSON array: "
            f'[{{"rationale": "..."}}]'
        )

        response = await self._platform.invoke(
            "options_generator",
            {
                "model": GEMINI_FAST_MODEL,
                "prompt": prompt,
                "n": n_options,
                "brief": brief.model_dump(),
            },
        )

        raw_options: list[dict] = response.get("options", [])

        options = []
        for raw in raw_options[:n_options]:
            opt = Option(
                id=f"opt_{uuid.uuid4().hex[:6]}",
                rationale=raw.get("rationale", ""),
                image_refs=[],  # populated after generation job completes
            )
            options.append(opt)

        # Pad with placeholders if the agent returned fewer than requested.
        while len(options) < n_options:
            options.append(
                Option(
                    id=f"opt_{uuid.uuid4().hex[:6]}",
                    rationale="Proposed: alternative direction",
                    image_refs=[],
                )
            )

        logger.info(
            "OptionsGeneratorAgent produced %d options for prop %s",
            len(options),
            prop.id,
        )
        return options
