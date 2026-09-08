"""
agent/adk/core.py — lightweight, self-contained Agent Development Kit (ADK) layer.

This is an in-house, dependency-light abstraction (Agent / Tool / AgentSession /
AgentResult / ReasoningEngine) used by the specialized sub-agents in
``agent/adk/subagents.py``. It is intentionally offline-safe: an ``Agent`` delegates
reasoning to an injected async ``responder`` callable (e.g. a platform adapter or a
google-genai client wrapper). When no responder is supplied it produces a
deterministic echo response so the kit remains fully usable in tests and local dev.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Optional


# ---------------------------------------------------------------------------
# Tool
# ---------------------------------------------------------------------------

@dataclass
class Tool:
    """A named capability an agent may invoke.

    ``func`` may be sync or async; :meth:`invoke` awaits async callables.
    """

    name: str
    description: str
    func: Callable[..., Any]

    async def invoke(self, *args: Any, **kwargs: Any) -> Any:
        result = self.func(*args, **kwargs)
        if hasattr(result, "__await__"):
            return await result
        return result


# ---------------------------------------------------------------------------
# Result + Session
# ---------------------------------------------------------------------------

@dataclass
class AgentResult:
    """Structured output of a single agent run."""

    output: str
    agent_name: str
    session_id: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentSession:
    """Holds conversational state across one or more agent runs."""

    session_id: str = field(default_factory=lambda: f"sess_{uuid.uuid4().hex[:12]}")
    history: list[dict[str, str]] = field(default_factory=list)

    def add(self, role: str, content: str) -> None:
        self.history.append({"role": role, "content": content})


# A responder turns (instruction, prompt, session) into text output.
Responder = Callable[[str, str, AgentSession], Awaitable[str]]


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class Agent:
    """A single reasoning agent with an instruction, optional tools, and a model id.

    Reasoning is delegated to an injected async ``responder``. If none is provided a
    deterministic fallback is used, keeping the agent usable without any network/GCP.
    """

    def __init__(
        self,
        name: str,
        instruction: str,
        model: str = "",
        tools: Optional[list[Tool]] = None,
        responder: Optional[Responder] = None,
    ) -> None:
        self.name = name
        self.instruction = instruction
        self.model = model
        self.tools = tools or []
        self._responder = responder

    async def run(self, prompt: str, session: Optional[AgentSession] = None) -> AgentResult:
        session = session or AgentSession()
        session.add("user", prompt)

        if self._responder is not None:
            output = await self._responder(self.instruction, prompt, session)
        else:
            # Deterministic offline fallback.
            output = f"[{self.name}] {self.instruction.strip()} :: {prompt.strip()}"

        session.add("assistant", output)
        return AgentResult(
            output=output,
            agent_name=self.name,
            session_id=session.session_id,
            metadata={"model": self.model, "tools": [t.name for t in self.tools]},
        )


# ---------------------------------------------------------------------------
# ReasoningEngine
# ---------------------------------------------------------------------------

class ReasoningEngine:
    """Runs an ordered chain of agents, threading a shared session and passing each
    agent's output as context to the next. Returns every step's result."""

    def __init__(self, agents: Optional[list[Agent]] = None) -> None:
        self.agents = agents or []

    def register(self, agent: Agent) -> None:
        self.agents.append(agent)

    async def run_chain(
        self, initial_prompt: str, session: Optional[AgentSession] = None
    ) -> list[AgentResult]:
        session = session or AgentSession()
        results: list[AgentResult] = []
        prompt = initial_prompt
        start = time.perf_counter()
        for agent in self.agents:
            result = await agent.run(prompt, session)
            results.append(result)
            # Feed forward: next agent sees the prior output.
            prompt = result.output
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        if results:
            results[-1].metadata["chain_elapsed_ms"] = elapsed_ms
        return results
