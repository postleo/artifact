"""
agent/adk — lightweight, in-house Agent Development Kit (ADK) layer.
Provides local abstractions: Agent, Tool, AgentSession, AgentResult, ReasoningEngine,
and specialized subagents for film art department prop workflows. Offline-safe and
dependency-light; a real backend (platform adapter / google-genai) can be injected via
each agent's `responder`.
"""
from agent.adk.core import Agent, Tool, AgentSession, AgentResult, ReasoningEngine
from agent.adk.subagents import (
    ScriptAnalystAgent,
    ContinuityGuardAgent,
    StuntToleranceAgent,
    ADKOptionsGenerator,
    ADKAssetFinisher,
    build_default_pipeline,
)

__all__ = [
    "Agent",
    "Tool",
    "AgentSession",
    "AgentResult",
    "ReasoningEngine",
    "ScriptAnalystAgent",
    "ContinuityGuardAgent",
    "StuntToleranceAgent",
    "ADKOptionsGenerator",
    "ADKAssetFinisher",
    "build_default_pipeline",
]
