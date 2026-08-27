"""
agent/platform_adapter.py — isolates all Gemini Enterprise Agent Platform API calls.
Swap or update the platform integration here without touching any other file.
"""
from __future__ import annotations

import abc
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Abstract adapter interface
# ---------------------------------------------------------------------------

class AgentPlatformAdapter(abc.ABC):
    """Interface for invoking a named agent role/playbook on the platform."""

    @abc.abstractmethod
    async def invoke(self, role: str, payload: dict[str, Any]) -> dict[str, Any]:
        """
        Invoke a named agent role with the given payload.
        Returns the agent's structured response as a dict.
        """
        ...


# ---------------------------------------------------------------------------
# Gemini Enterprise Agent Platform (Dialogflow CX / Vertex AI Agent Builder)
# ---------------------------------------------------------------------------

class GeminiAgentPlatformAdapter(AgentPlatformAdapter):
    """
    Calls agents defined on the Gemini Enterprise Agent Platform via its REST API.
    Credentials come from Application Default Credentials (ADC) or the
    GOOGLE_APPLICATION_CREDENTIALS env var — never hard-coded.

    Environment variables consumed:
      GCP_PROJECT_ID, GCP_REGION, AGENT_PLATFORM_ENDPOINT
    """

    def __init__(self) -> None:
        import google.auth  # type: ignore
        import google.auth.transport.requests  # type: ignore

        self._project = os.environ["GCP_PROJECT_ID"]
        self._region = os.environ.get("GCP_REGION", "us-central1")
        self._endpoint = os.environ.get(
            "AGENT_PLATFORM_ENDPOINT", "https://dialogflow.googleapis.com"
        )
        self._credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        self._auth_request = google.auth.transport.requests.Request()

    async def invoke(self, role: str, payload: dict[str, Any]) -> dict[str, Any]:
        import httpx

        self._credentials.refresh(self._auth_request)
        token = self._credentials.token

        url = (
            f"{self._endpoint}/v3/projects/{self._project}/"
            f"locations/{self._region}/agents/{role}:detectIntent"
        )
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()


# ---------------------------------------------------------------------------
# Stub adapter (local dev / tests — no GCP required)
# ---------------------------------------------------------------------------

class StubAgentPlatformAdapter(AgentPlatformAdapter):
    """
    Returns canned responses for each agent role.
    Used in unit tests and local development.
    """

    async def invoke(self, role: str, payload: dict[str, Any]) -> dict[str, Any]:
        logger.debug("StubAgentPlatformAdapter.invoke role=%s", role)
        if role == "options_generator":
            return {
                "options": [
                    {"rationale": "Bold silhouette; reads at distance"},
                    {"rationale": "Intricate surface detail; close-up appeal"},
                    {"rationale": "Minimalist form; stunt-safe lightweight"},
                ]
            }
        if role == "selection_recorder":
            return {"recorded": True}
        if role == "asset_finisher":
            return {
                "material_spec": "Proposed: hand-hammered bronze with verdigris patina",
                "build_spec": "Proposed: 900mm blade length, 200mm handle, total 1.1kg",
            }
        return {}
