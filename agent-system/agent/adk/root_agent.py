"""
agent/adk/root_agent.py — the root ADK agent deployed to Vertex AI Agent Engine.

This composes the specialized reasoning sub-agents (options generation, selection
audit, asset spec authoring, plus trademark screening) under a single coordinator
`LlmAgent`, which is what gets packaged and deployed to Agent Engine. Model access
uses the Google Gen AI SDK (Vertex AI when GOOGLE_GENAI_USE_VERTEXAI=1 + ADC).

All google.adk imports are performed lazily inside build_root_agent() so importing
this module never requires google-adk at import time (keeps stubs/tests light).
"""
from __future__ import annotations

from typing import Any


def build_root_agent() -> Any:
    """Construct and return the root ADK LlmAgent with its sub-agents.

    Returns a `google.adk.agents.LlmAgent`. Raises ImportError if google-adk is not
    installed (only needed for the production/Agent Engine path).
    """
    from google.adk.agents import LlmAgent

    from config import GEMINI_FAST_MODEL, GEMINI_PRO_MODEL

    options_agent = LlmAgent(
        name="options_generator",
        model=GEMINI_PRO_MODEL,
        description="Generates divergent hero-prop concept directions with rationales.",
        instruction=(
            "You are a prop design specialist for a film production. Given a hero-prop "
            "brief, propose distinct, production-viable concept directions, each with a "
            "one-line rationale (max 20 words). Label speculative details as 'Proposed:'."
        ),
    )

    selection_agent = LlmAgent(
        name="selection_recorder",
        model=GEMINI_FAST_MODEL,
        description="Validates and audits the selected concept option.",
        instruction=(
            "You are a data validation and audit assistant. Validate the chosen option "
            "and rationale, and produce a concise audit note."
        ),
    )

    asset_agent = LlmAgent(
        name="asset_finisher",
        model=GEMINI_PRO_MODEL,
        description="Authors build-ready material and construction specifications.",
        instruction=(
            "You are a master prop builder and materials designer. Author material_spec "
            "and build_spec for the selected concept. Label speculative detail as 'Proposed:'."
        ),
    )

    trademark_agent = LlmAgent(
        name="trademark_screen",
        model=GEMINI_FAST_MODEL,
        description="Screens prop descriptions for trademark risk.",
        instruction=(
            "Assess the description for trademark/brand-resemblance risk. Reply with the "
            "risk level: none, low, or high."
        ),
    )

    root_agent = LlmAgent(
        name="artifact_orchestrator",
        model=GEMINI_FAST_MODEL,
        description=(
            "Coordinates the Artifact hero-prop pipeline: options generation, selection "
            "audit, asset spec authoring, and trademark screening."
        ),
        instruction=(
            "You orchestrate a film hero-prop design pipeline. Delegate to the appropriate "
            "sub-agent based on the request: options generation, selection audit, asset "
            "spec authoring, or trademark screening. Always ground outputs and label "
            "speculation as 'Proposed:'."
        ),
        sub_agents=[options_agent, selection_agent, asset_agent, trademark_agent],
    )
    return root_agent


# ADK's `adk` CLI and Agent Engine look for a module-level `root_agent`. Build lazily
# via a module attribute accessor so importing this module stays dependency-light.
def __getattr__(name: str):  # PEP 562
    if name == "root_agent":
        return build_root_agent()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
