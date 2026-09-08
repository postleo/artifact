"""
gen/cost_service.py — tracks image generation spend per prop.
Enforces the budget ceiling; raises a budget flag when exceeded.
"""
from __future__ import annotations

import logging
from typing import Any

from config import COST_PER_NB2_IMAGE_USD, COST_PER_NBPRO_IMAGE_USD

logger = logging.getLogger(__name__)


class CostService:
    """
    Reads/writes cost records on the prop via the repository.
    Enforces the per-prop budget ceiling before recording spend.
    """

    def __init__(self, repo: Any) -> None:
        self._repo = repo

    async def record_nb2(self, prop_id: str, n_images: int) -> None:
        await self._record(prop_id, nb2=n_images, nbpro=0)

    async def record_nbpro(self, prop_id: str, n_images: int) -> None:
        await self._record(prop_id, nb2=0, nbpro=n_images)

    async def _record(self, prop_id: str, nb2: int, nbpro: int) -> None:
        prop = await self._repo.get(prop_id)
        if prop is None:
            raise ValueError(f"Prop {prop_id!r} not found")

        prop.cost.nb2_images += nb2
        prop.cost.nbpro_images += nbpro
        prop.cost.est_usd += (
            nb2 * COST_PER_NB2_IMAGE_USD + nbpro * COST_PER_NBPRO_IMAGE_USD
        )

        if prop.cost.est_usd > prop.budget_ceiling_usd:
            logger.warning(
                "Prop %s exceeded budget ceiling $%.2f (current $%.2f)",
                prop_id,
                prop.budget_ceiling_usd,
                prop.cost.est_usd,
            )
            prop.flags.budget_exceeded = True
            # Budget flag is surfaced via prop.cost.est_usd > prop.budget_ceiling_usd
            # The orchestrator checks this before starting Stage 3 and transitions to BUDGET_EXCEEDED.

        await self._repo.update(prop)
        logger.info(
            "Cost updated for prop %s: nb2=%d nbpro=%d est_usd=%.4f",
            prop_id,
            prop.cost.nb2_images,
            prop.cost.nbpro_images,
            prop.cost.est_usd,
        )

    async def check_budget(self, prop_id: str) -> bool:
        """Returns True if the prop is within its budget ceiling."""
        prop = await self._repo.get(prop_id)
        if prop is None:
            return False
        return prop.cost.est_usd < prop.budget_ceiling_usd
