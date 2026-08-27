"""
integrations/dam_adapter.py — DAM / asset-library integration.
All export calls are routed through this interface; swap the real adapter here.
"""
from __future__ import annotations

import abc
import logging
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Abstract interface
# ---------------------------------------------------------------------------

class DAMAdapter(abc.ABC):
    """Interface for pushing a finalized prop package to the asset library / DAM."""

    @abc.abstractmethod
    async def export(self, prop_id: str, asset_package: dict[str, Any]) -> str:
        """
        Export the asset package. Returns an external asset library reference / URL.
        """
        ...


# ---------------------------------------------------------------------------
# Stub adapter (tests / local dev)
# ---------------------------------------------------------------------------

class StubDAMAdapter(DAMAdapter):
    """Logs the export and returns a fake reference. No external calls."""

    async def export(self, prop_id: str, asset_package: dict[str, Any]) -> str:
        logger.info(
            "StubDAMAdapter.export prop_id=%s keys=%s",
            prop_id,
            list(asset_package.keys()),
        )
        return f"dam://stub/{prop_id}"


# ---------------------------------------------------------------------------
# Real adapter skeleton — replace with the production DAM's API
# ---------------------------------------------------------------------------

class HttpDAMAdapter(DAMAdapter):
    """
    Pushes the asset package to an external DAM via its HTTP API.
    Configure via env vars:
      DAM_API_URL   — base URL of the asset library API
      DAM_API_KEY   — bearer token (loaded from Secret Manager at startup)
    """

    def __init__(self) -> None:
        import os
        self._base_url = os.environ["DAM_API_URL"]
        self._api_key = os.environ["DAM_API_KEY"]

    async def export(self, prop_id: str, asset_package: dict[str, Any]) -> str:
        import httpx

        payload = {"prop_id": prop_id, "assets": asset_package}
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self._base_url}/v1/assets",
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("asset_id", "")
