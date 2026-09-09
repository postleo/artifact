"""
agent/adk/subagents.py — specialized sub-agents for the film art-department prop
workflow, built on the local ADK layer in ``agent/adk/core.py``.

Each class is a thin, importable factory around :class:`~agent.adk.core.Agent` with a
role-specific instruction and model tier (from ``config.py``). They accept an optional
``responder`` so callers can plug in a real backend (platform adapter / google-genai)
without changing call sites; without one they run deterministically for tests/local dev.
"""
from __future__ import annotations

from typing import Optional

from agent.adk.core import Agent, AgentResult, AgentSession, ReasoningEngine, Responder


def _fast_model() -> str:
    from config import GEMINI_FAST_MODEL

    return GEMINI_FAST_MODEL


def _pro_model() -> str:
    from config import GEMINI_PRO_MODEL

    return GEMINI_PRO_MODEL


class ScriptAnalystAgent(Agent):
    """Extracts scene headings, prop cues, and handling notes from screenplay text."""

    def __init__(self, responder: Optional[Responder] = None) -> None:
        super().__init__(
            name="ScriptAnalyst",
            instruction=(
                "Extract the hero prop, scene heading, era, on-screen function, and "
                "physical constraints from the screenplay excerpt."
            ),
            model=_fast_model(),
            responder=responder,
        )


class ContinuityGuardAgent(Agent):
    """Cross-references a prop brief against franchise continuity constraints."""

    def __init__(self, responder: Optional[Responder] = None) -> None:
        super().__init__(
            name="ContinuityGuard",
            instruction=(
                "Validate the prop brief against franchise canon and prior-film "
                "continuity; flag any deviations."
            ),
            model=_fast_model(),
            responder=responder,
        )


class StuntToleranceAgent(Agent):
    """Evaluates physical/stunt safety tolerances for a prop."""

    def __init__(self, responder: Optional[Responder] = None) -> None:
        super().__init__(
            name="StuntTolerance",
            instruction=(
                "Assess stunt-safety tolerances: weight balance, durometer, water/pyro "
                "exposure, and whether a stunt duplicate is required."
            ),
            model=_fast_model(),
            responder=responder,
        )


class ADKOptionsGenerator(Agent):
    """Generates divergent concept-option rationales for a prop brief."""

    def __init__(self, responder: Optional[Responder] = None) -> None:
        super().__init__(
            name="OptionsGenerator",
            instruction=(
                "Propose divergent, production-viable concept directions for the hero "
                "prop, each with a one-line rationale."
            ),
            model=_pro_model(),
            responder=responder,
        )


class ADKAssetFinisher(Agent):
    """Compiles build-ready material and construction specifications."""

    def __init__(self, responder: Optional[Responder] = None) -> None:
        super().__init__(
            name="AssetFinisher",
            instruction=(
                "Compile build-ready material and construction specifications for the "
                "selected concept."
            ),
            model=_pro_model(),
            responder=responder,
        )


def build_default_pipeline(responder: Optional[Responder] = None) -> ReasoningEngine:
    """Assemble the standard sub-agent chain used for screenplay onboarding."""

    return ReasoningEngine(
        agents=[
            ScriptAnalystAgent(responder),
            ContinuityGuardAgent(responder),
            StuntToleranceAgent(responder),
            ADKOptionsGenerator(responder),
        ]
    )


__all__ = [
    "ScriptAnalystAgent",
    "ContinuityGuardAgent",
    "StuntToleranceAgent",
    "ADKOptionsGenerator",
    "ADKAssetFinisher",
    "build_default_pipeline",
    "AgentResult",
    "AgentSession",
]
