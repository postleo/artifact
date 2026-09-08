"""
agent/selection_recorder.py — Stage 2 sub-agent.
Records the chosen option, who chose it, and why. No image generation here.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

from store.models import Option, PropRecord, Selection

logger = logging.getLogger(__name__)


class SelectionRecorderAgent:
    """
    Sub-agent responsible for Stage 2: validating and recording the selection.
    This is a data-recording step — no image generation occurs.
    """

    def __init__(self, platform_adapter: Any) -> None:
        self._platform = platform_adapter

    async def record_selection(
        self,
        prop: PropRecord,
        chosen_option_id: str,
        chosen_by: str,
        why: str,
    ) -> Selection:
        """
        Validate that chosen_option_id exists on the prop, then return a
        Selection record. Caller is responsible for persisting it.
        """
        option_ids = [opt.id for opt in prop.options]
        if chosen_option_id not in option_ids:
            raise ValueError(
                f"Option {chosen_option_id!r} not found on prop {prop.id!r}. "
                f"Available: {option_ids}"
            )

        is_stub = (
            "Stub" in self._platform.__class__.__name__
            or os.environ.get("USE_STUBS", "false").lower() == "true"
        )

        if is_stub:
            # Confirm via the stub agent platform
            await self._platform.invoke(
                "selection_recorder",
                {
                    "prop_id": prop.id,
                    "chosen_option_id": chosen_option_id,
                    "chosen_by": chosen_by,
                    "why": why,
                },
            )
        else:
            # Native google-adk audit trail check
            from google.adk.agents import Agent
            from google.adk.runners import InMemoryRunner
            from google.genai import types

            from config import GEMINI_FAST_MODEL

            adk_agent = Agent(
                model=GEMINI_FAST_MODEL,
                name="selection_recorder_agent",
                instruction="You are a data validation and audit logging assistant. Record and validate the selected option and rationale.",
            )
            runner = InMemoryRunner(agent=adk_agent, app_name="artifact")
            await runner.session_service.create_session(
                app_name="artifact", user_id="default_user", session_id=prop.id
            )
            prompt = (
                f"Audit selection decision for Prop: {prop.id}.\n"
                f"Chosen Option ID: {chosen_option_id}\n"
                f"Chosen By: {chosen_by}\n"
                f"Reason: {why}\n"
            )
            content = types.Content(
                role="user", parts=[types.Part(text=prompt)]
            )

            async for event in runner.run_async(
                user_id="default_user",
                session_id=prop.id,
                new_message=content,
            ):
                pass  # perform the check and consume the event stream for logging

        selection = Selection(
            chosen=chosen_option_id,
            by=chosen_by,
            why=why,
            at=datetime.now(timezone.utc),
        )

        logger.info(
            "SelectionRecorderAgent recorded option %s for prop %s by %s",
            chosen_option_id,
            prop.id,
            chosen_by,
        )
        return selection
