"""
tests/test_budget_guardrail.py — budget ceiling tests.
Verifies that cost is tracked and generation is paused when the ceiling is hit.
"""
import pytest

from store.models import Brief, PropRecord, PropStatus
from store.repository import InMemoryPropRepository
from gen.cost_service import CostService
from agent.orchestrator import Orchestrator
from agent.options_generator import OptionsGeneratorAgent
from agent.selection_recorder import SelectionRecorderAgent
from agent.asset_finisher import AssetFinisherAgent
from agent.platform_adapter import StubAgentPlatformAdapter
from agent.safety_service import StubSafetyService
from gen.image_jobs import StubImageJobRunner
from config import COST_PER_NBPRO_IMAGE_USD


def _make_orchestrator(repo):
    adapter = StubAgentPlatformAdapter()
    return Orchestrator(
        repo=repo,
        options_agent=OptionsGeneratorAgent(adapter, None),
        selection_agent=SelectionRecorderAgent(adapter),
        asset_agent=AssetFinisherAgent(adapter, None),
        image_job_runner=StubImageJobRunner(),
        cost_service=CostService(repo),
        safety_service=StubSafetyService(),
    )


@pytest.mark.asyncio
async def test_cost_is_tracked_after_nb2():
    repo = InMemoryPropRepository()
    cost_svc = CostService(repo)
    prop = PropRecord(brief=Brief(what="A lantern"), budget_ceiling_usd=10.0)
    await repo.create(prop)

    await cost_svc.record_nb2(prop.id, 4)

    updated = await repo.get(prop.id)
    assert updated.cost.nb2_images == 4
    assert updated.cost.est_usd > 0


@pytest.mark.asyncio
async def test_cost_is_tracked_after_nbpro():
    repo = InMemoryPropRepository()
    cost_svc = CostService(repo)
    prop = PropRecord(brief=Brief(what="A crown"), budget_ceiling_usd=10.0)
    await repo.create(prop)

    await cost_svc.record_nbpro(prop.id, 8)

    updated = await repo.get(prop.id)
    assert updated.cost.nbpro_images == 8
    from config import COST_PER_NBPRO_IMAGE_USD
    assert abs(updated.cost.est_usd - 8 * COST_PER_NBPRO_IMAGE_USD) < 0.0001


@pytest.mark.asyncio
async def test_finalize_blocked_when_budget_exceeded():
    """
    If cost already >= budget ceiling before finalize, the orchestrator must
    transition to BUDGET_EXCEEDED and raise.
    """
    repo = InMemoryPropRepository()
    orch = _make_orchestrator(repo)

    # Create prop with a tiny budget and pre-fill cost to exceed it.
    prop = PropRecord(
        brief=Brief(what="A sword"),
        status=PropStatus.SELECTION_CONFIRMED,
        budget_ceiling_usd=0.01,  # $0.01 ceiling — almost instantly exceeded
    )
    from store.models import Selection, Option
    from datetime import datetime, timezone
    opt = Option(id="opt_abc", rationale="test")
    prop.options = [opt]
    prop.selection = Selection(chosen="opt_abc", by="designer", why="test", at=datetime.now(timezone.utc))
    prop.cost.est_usd = 0.50  # already over the $0.01 ceiling
    await repo.create(prop)

    with pytest.raises(ValueError, match="budget ceiling"):
        await orch.start_stage3(prop.id)

    # Status must have transitioned to BUDGET_EXCEEDED.
    updated = await repo.get(prop.id)
    assert updated.status == PropStatus.BUDGET_EXCEEDED


@pytest.mark.asyncio
async def test_budget_check_returns_false_when_over():
    repo = InMemoryPropRepository()
    cost_svc = CostService(repo)
    prop = PropRecord(brief=Brief(what="A ring"), budget_ceiling_usd=0.05)
    prop.cost.est_usd = 0.10  # already over
    await repo.create(prop)

    within = await cost_svc.check_budget(prop.id)
    assert not within


@pytest.mark.asyncio
async def test_budget_check_returns_true_when_under():
    repo = InMemoryPropRepository()
    cost_svc = CostService(repo)
    prop = PropRecord(brief=Brief(what="A shield"), budget_ceiling_usd=10.0)
    await repo.create(prop)

    within = await cost_svc.check_budget(prop.id)
    assert within
