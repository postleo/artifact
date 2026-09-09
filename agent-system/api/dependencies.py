"""
api/dependencies.py — FastAPI dependency injection.
Builds and caches service instances; reads env/secrets at startup.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

from agent.asset_finisher import AssetFinisherAgent
from agent.options_generator import OptionsGeneratorAgent
from agent.orchestrator import Orchestrator
from agent.platform_adapter import (
    AgentEngineAdapter,
    AgentPlatformAdapter,
    LocalADKAdapter,
    StubAgentPlatformAdapter,
)
from agent.safety_service import GeminiSafetyService, SafetyService, StubSafetyService
from agent.selection_recorder import SelectionRecorderAgent
from gen.cost_service import CostService
from gen.image_jobs import GCSImageJobRunner, ImageJobRunner, StubImageJobRunner
from integrations.dam_adapter import DAMAdapter, HttpDAMAdapter, StubDAMAdapter
from integrations.notifications import EmailWebhookNotificationAdapter, NotificationAdapter, StubNotificationAdapter
from store.repository import FirestorePropRepository, InMemoryPropRepository, PropRepository


def _is_stub_mode() -> bool:
    return os.environ.get("USE_STUBS", "false").lower() == "true"


@lru_cache(maxsize=1)
def get_repo() -> PropRepository:
    if _is_stub_mode():
        return InMemoryPropRepository()
    return FirestorePropRepository()


@lru_cache(maxsize=1)
def get_platform_adapter() -> AgentPlatformAdapter:
    if _is_stub_mode():
        return StubAgentPlatformAdapter()
    # Prefer a deployed Vertex AI Agent Engine when configured; otherwise run the
    # ADK agents in-process.
    from config import AGENT_ENGINE_RESOURCE_NAME

    if AGENT_ENGINE_RESOURCE_NAME:
        return AgentEngineAdapter()
    return LocalADKAdapter()


@lru_cache(maxsize=1)
def get_safety_service() -> SafetyService:
    if _is_stub_mode():
        return StubSafetyService()
    return GeminiSafetyService(get_platform_adapter())


@lru_cache(maxsize=1)
def get_image_runner() -> ImageJobRunner:
    if _is_stub_mode():
        return StubImageJobRunner()
    from google.cloud import storage  # type: ignore
    return GCSImageJobRunner(get_repo(), storage.Client())


@lru_cache(maxsize=1)
def get_cost_service() -> CostService:
    return CostService(get_repo())


@lru_cache(maxsize=1)
def get_dam_adapter() -> DAMAdapter:
    # Use the no-op stub in stub mode OR when no DAM/asset-library is configured
    # (DAM_API_URL unset). This lets export succeed with a stub reference instead of
    # crashing a deployment that has no external DAM wired up.
    import os
    if _is_stub_mode() or not os.environ.get("DAM_API_URL"):
        return StubDAMAdapter()
    return HttpDAMAdapter()


@lru_cache(maxsize=1)
def get_notifier() -> NotificationAdapter:
    if _is_stub_mode():
        return StubNotificationAdapter()
    return EmailWebhookNotificationAdapter()


@lru_cache(maxsize=1)
def get_orchestrator() -> Orchestrator:
    adapter = get_platform_adapter()
    repo = get_repo()
    gemini_client = None  # injected at runtime via platform adapter
    return Orchestrator(
        repo=repo,
        options_agent=OptionsGeneratorAgent(adapter, gemini_client),
        selection_agent=SelectionRecorderAgent(adapter),
        asset_agent=AssetFinisherAgent(adapter, gemini_client),
        image_job_runner=get_image_runner(),
        cost_service=get_cost_service(),
        safety_service=get_safety_service(),
    )
