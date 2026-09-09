"""
agent/asset_finisher.py — Stage 3 sub-agent.
For the selected option, generates the full asset package and writes spec text.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

from pydantic import BaseModel, Field
from store.models import FinalAssets, PropRecord

logger = logging.getLogger(__name__)


# Pydantic schema for google-adk structured output
class AssetFinisherResponseSchema(BaseModel):
    material_spec: str = Field(
        description="The material specifications for the prop. Label speculative text as 'Proposed:'."
    )
    build_spec: str = Field(
        description="The build specifications and design layout details. Label speculative text as 'Proposed:'."
    )


class AssetFinisherAgent:
    """
    Sub-agent responsible for Stage 3: producing spec text (material spec, build spec)
    for the selected option. Image generation (Nano Banana Pro) is handled by
    gen/image_jobs.py. This agent writes the text-based deliverables using google-adk.
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

        is_stub = (
            "Stub" in self._platform.__class__.__name__
            or os.environ.get("USE_STUBS", "false").lower() == "true"
        )

        material_spec = ""
        build_spec = ""

        if is_stub:
            # Fall back to stub platform adapter
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
        else:
            # Native google-adk Agent & InMemoryRunner workflow
            from google.adk.agents import Agent
            from google.adk.runners import InMemoryRunner
            from google.genai import types

            adk_agent = Agent(
                model=model,
                name="asset_finisher_agent",
                instruction=(
                    "You are a master prop builder and materials designer. Generate the material specifications and build specifications "
                    "for the selected concept design option.\n"
                    "Label any speculative detail as 'Proposed:'."
                ),
                output_schema=AssetFinisherResponseSchema,
            )
            runner = InMemoryRunner(agent=adk_agent, app_name="artifact")
            await runner.session_service.create_session(
                app_name="artifact", user_id="default_user", session_id=prop.id
            )
            prompt = (
                f"Write material_spec and build_spec based on:\n"
                f"Prop Brief What: {brief.what}\n"
                f"Chosen Concept Rationale: {rationale}\n"
                f"User Selection Notes: {selection.why}\n"
            )
            content = types.Content(
                role="user", parts=[types.Part(text=prompt)]
            )

            accumulated_text = ""
            async for event in runner.run_async(
                user_id="default_user",
                session_id=prop.id,
                new_message=content,
            ):
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            accumulated_text += part.text

            try:
                parsed = json.loads(accumulated_text)
                material_spec = parsed.get("material_spec", "")
                build_spec = parsed.get("build_spec", "")
            except Exception as e:
                logger.error("Failed to parse ADK asset finisher output: %s. Output: %r", e, accumulated_text)

        # Ground the output — label any speculative text.
        if material_spec and not material_spec.startswith("Proposed"):
            material_spec = f"Proposed: {material_spec}"
        if build_spec and not build_spec.startswith("Proposed"):
            build_spec = f"Proposed: {build_spec}"

        logger.info("AssetFinisherAgent wrote spec text for prop %s", prop.id)
        return {"material_spec": material_spec, "build_spec": build_spec}
