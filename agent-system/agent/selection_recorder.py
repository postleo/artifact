"""
agent/selection_recorder.py — Stage 2 sub-agent.
Records the chosen option, who chose it, and why. No image generation here.
"""
from __future__ import annotations

import logging
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

        # Confirm via the agent platform (audit trail / guardrail check).
        await self._platform.invoke(
            "selection_recorder",
            {
                "prop_id": prop.id,
                "chosen_option_id": chosen_option_id,
                "chosen_by": chosen_by,
                "why": why,
            },
        )

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
