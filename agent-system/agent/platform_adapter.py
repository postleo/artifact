"""
agent/platform_adapter.py — isolates how named agent "roles" are invoked.

Three implementations:
  - StubAgentPlatformAdapter : canned responses (tests / local dev).
  - LocalADKAdapter          : runs an ADK LlmAgent in-process via InMemoryRunner
                               (used in production when no Agent Engine is configured).
  - AgentEngineAdapter       : queries an agent deployed to Vertex AI Agent Engine
                               (Agent Builder) via the Vertex SDK.

Swap or update the platform integration here without touching any other file.
All heavy imports (google.adk, vertexai) are performed lazily inside methods.
"""
from __future__ import annotations

import abc
import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Abstract adapter interface
# ---------------------------------------------------------------------------

class AgentPlatformAdapter(abc.ABC):
    """Interface for invoking a named agent role/playbook."""

    @abc.abstractmethod
    async def invoke(self, role: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Invoke a named agent role with the given payload; return a structured dict."""
        ...


# Role → instruction used to elicit a strict-JSON answer from the model.
_ROLE_INSTRUCTIONS: dict[str, str] = {
    "trademark_screen": (
        "You screen a film prop description for trademark/brand-resemblance risk. "
        'Respond with ONLY JSON: {"trademark_risk": "none|low|high"}.'
    ),
    "options_generator": (
        "You are a prop design specialist. Propose distinct concept directions, each "
        'with a one-line rationale. Respond with ONLY JSON: {"options": [{"rationale": "..."}]}.'
    ),
    "selection_recorder": (
        'You audit a selection decision. Respond with ONLY JSON: {"recorded": true}.'
    ),
    "asset_finisher": (
        "You author build-ready specs. Respond with ONLY JSON: "
        '{"material_spec": "...", "build_spec": "..."}.'
    ),
}


def _parse_json_object(text: str) -> dict[str, Any]:
    """Best-effort extraction of the first JSON object from model text."""
    if not text:
        return {}
    try:
        return json.loads(text)
    except Exception:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            return {}
    return {}


# ---------------------------------------------------------------------------
# Local ADK adapter — runs an ADK LlmAgent in-process
# ---------------------------------------------------------------------------

class LocalADKAdapter(AgentPlatformAdapter):
    """Runs the requested role as a Google ADK LlmAgent using InMemoryRunner.

    Model access is via the Google Gen AI SDK (Vertex AI when
    GOOGLE_GENAI_USE_VERTEXAI=1 + ADC, otherwise the Gemini API key).
    """

    async def invoke(self, role: str, payload: dict[str, Any]) -> dict[str, Any]:
        from google.adk.agents import LlmAgent
        from google.adk.runners import InMemoryRunner
        from google.genai import types

        from config import GEMINI_FAST_MODEL

        instruction = _ROLE_INSTRUCTIONS.get(
            role, "Respond with ONLY a JSON object answering the request."
        )
        model = payload.get("model") or GEMINI_FAST_MODEL

        agent = LlmAgent(name=f"{role}_agent", model=model, instruction=instruction)
        runner = InMemoryRunner(agent=agent, app_name="artifact")
        user_id = "artifact-service"
        session_id = str(payload.get("prop_id") or "adhoc")
        await runner.session_service.create_session(
            app_name="artifact", user_id=user_id, session_id=session_id
        )

        message = json.dumps({"role": role, "payload": payload})
        content = types.Content(role="user", parts=[types.Part(text=message)])

        text = ""
        async for event in runner.run_async(
            user_id=user_id, session_id=session_id, new_message=content
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if getattr(part, "text", None):
                        text += part.text

        data = _parse_json_object(text)
        if role == "trademark_screen" and "trademark_risk" not in data:
            data = {"trademark_risk": "none"}  # safe default if parsing failed
        return data


# ---------------------------------------------------------------------------
# Agent Engine adapter — queries a deployed Vertex AI Agent Engine
# ---------------------------------------------------------------------------

class AgentEngineAdapter(AgentPlatformAdapter):
    """Queries an agent deployed to Vertex AI Agent Engine (Agent Builder).

    Requires AGENT_ENGINE_RESOURCE_NAME (and GCP project/region). Uses the Vertex
    SDK's stream_query. Falls back to safe defaults if the response can't be parsed.
    """

    def __init__(self) -> None:
        import vertexai  # lazy
        from vertexai import agent_engines

        from config import (
            AGENT_ENGINE_RESOURCE_NAME,
            GCP_PROJECT_ID,
            GCP_REGION,
            VERTEX_STAGING_BUCKET,
        )

        if not AGENT_ENGINE_RESOURCE_NAME:
            raise RuntimeError("AGENT_ENGINE_RESOURCE_NAME is not set.")

        vertexai.init(
            project=GCP_PROJECT_ID or None,
            location=GCP_REGION or None,
            staging_bucket=VERTEX_STAGING_BUCKET or None,
        )
        self._agent = agent_engines.get(AGENT_ENGINE_RESOURCE_NAME)

    async def invoke(self, role: str, payload: dict[str, Any]) -> dict[str, Any]:
        import asyncio

        instruction = _ROLE_INSTRUCTIONS.get(role, "")
        message = json.dumps({"role": role, "instruction": instruction, "payload": payload})

        def _run_query() -> str:
            text = ""
            for event in self._agent.stream_query(
                user_id=str(payload.get("prop_id") or "artifact-service"),
                message=message,
            ):
                # Events are dicts with content/parts when produced by an ADK app.
                content = event.get("content") if isinstance(event, dict) else None
                for part in (content or {}).get("parts", []) if content else []:
                    if isinstance(part, dict) and part.get("text"):
                        text += part["text"]
            return text

        # stream_query is blocking; run it off the event loop.
        text = await asyncio.to_thread(_run_query)
        data = _parse_json_object(text)
        if role == "trademark_screen" and "trademark_risk" not in data:
            data = {"trademark_risk": "none"}
        return data


# ---------------------------------------------------------------------------
# Stub adapter (local dev / tests — no GCP required)
# ---------------------------------------------------------------------------

class StubAgentPlatformAdapter(AgentPlatformAdapter):
    """Returns canned responses for each agent role. Used in tests and local dev."""

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
        if role == "trademark_screen":
            return {"trademark_risk": "none"}
        return {}
