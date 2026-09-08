"""
agent/options_generator.py — Stage 1 sub-agent.
Reads the brief, writes N option records, and triggers Nano Banana 2 generation jobs.
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Any

from pydantic import BaseModel, Field
from store.models import Brief, Option, PropRecord

logger = logging.getLogger(__name__)


# Pydantic schemas for google-adk structured output
class ConceptOptionRaw(BaseModel):
    rationale: str = Field(
        description="One-line rationale explaining why this direction serves the brief (max 20 words). Label speculative details as 'Proposed:'."
    )


class OptionsResponseSchema(BaseModel):
    options: list[ConceptOptionRaw] = Field(
        description="List of distinct concept directions"
    )


class OptionsGeneratorAgent:
    """
    Sub-agent responsible for Stage 1: producing N concept options with rationales.
    Utilizes google-adk for structured generation in production, falling back to
    the platform adapter for unit tests and local stub development.
    """

    def __init__(self, platform_adapter: Any, gemini_client: Any) -> None:
        self._platform = platform_adapter
        self._gemini = gemini_client

    async def generate_options(
        self,
        prop: PropRecord,
        n_options: int,
    ) -> list[Option]:
        """
        Call the ADK agent or the stub platform to produce N option rationales from the brief.
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
        )

        is_stub = (
            "Stub" in self._platform.__class__.__name__
            or os.environ.get("USE_STUBS", "false").lower() == "true"
        )

        raw_options: list[dict] = []

        if is_stub:
            # Fall back to stub platform adapter
            response = await self._platform.invoke(
                "options_generator",
                {
                    "model": GEMINI_FAST_MODEL,
                    "prompt": prompt,
                    "n": n_options,
                    "brief": brief.model_dump(),
                },
            )
            raw_options = response.get("options", [])
        else:
            # Native google-adk Agent & InMemoryRunner workflow
            from google.adk.agents import Agent
            from google.adk.runners import InMemoryRunner
            from google.genai import types

            adk_agent = Agent(
                model=GEMINI_FAST_MODEL,
                name="options_generator_agent",
                instruction=(
                    "You are a prop design specialist for a film production. Generate distinct concept directions for the hero prop brief.\n"
                    "Return exactly the requested number of options, each containing a one-line rationale (max 20 words).\n"
                    "Label any speculative detail as 'Proposed:'."
                ),
                output_schema=OptionsResponseSchema,
            )
            runner = InMemoryRunner(agent=adk_agent)
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
                raw_options = parsed.get("options", [])
            except Exception as e:
                logger.error("Failed to parse ADK options generator output: %s. Output: %r", e, accumulated_text)
                raw_options = []

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
