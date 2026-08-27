"""
tests/test_gate_ordering.py — gate enforcement tests.
Verifies that finalize and export refuse to run out of order.
"""
import pytest
import pytest_asyncio

from store.models import Brief, PropRecord, PropStatus
from store.repository import InMemoryPropRepository
from agent.orchestrator import Orchestrator
from agent.options_generator import OptionsGeneratorAgent
from agent.selection_recorder import SelectionRecorderAgent
from agent.asset_finisher import AssetFinisherAgent
from agent.platform_adapter import StubAgentPlatformAdapter
from agent.safety_service import StubSafetyService
from gen.image_jobs import StubImageJobRunner
from gen.cost_service import CostService


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


async def _create_prop(repo, status: PropStatus = PropStatus.DRAFT) -> PropRecord:
    prop = PropRecord(
        brief=Brief(what="A ceremonial sword", on_screen=["drawn in sc 7"], era="bronze age"),
        status=status,
    )
    await repo.create(prop)
    return prop


@pytest.mark.asyncio
async def test_finalize_refuses_if_not_selection_confirmed():
    repo = InMemoryPropRepository()
    orch = _make_orchestrator(repo)
    prop = await _create_prop(repo, PropStatus.DRAFT)

    with pytest.raises(ValueError, match="selection_confirmed"):
        await orch.start_stage3(prop.id)


@pytest.mark.asyncio
async def test_finalize_refuses_if_awaiting_review():
    repo = InMemoryPropRepository()
    orch = _make_orchestrator(repo)
    prop = await _create_prop(repo, PropStatus.AWAITING_OPTIONS_REVIEW)

    with pytest.raises(ValueError, match="selection_confirmed"):
        await orch.start_stage3(prop.id)


@pytest.mark.asyncio
async def test_selection_refuses_if_not_awaiting_review():
    repo = InMemoryPropRepository()
    orch = _make_orchestrator(repo)
    prop = await _create_prop(repo, PropStatus.DRAFT)

    with pytest.raises(ValueError, match="awaiting_options_review"):
        await orch.record_selection(prop.id, "opt_abc", "designer", "looks great")


@pytest.mark.asyncio
async def test_full_flow_gates_pass():
    """Walk through stage1 → selection → stage3 with stubs; no errors raised."""
    repo = InMemoryPropRepository()
    orch = _make_orchestrator(repo)

    prop = await _create_prop(repo, PropStatus.DRAFT)

    # Stage 1
    job_id = await orch.start_stage1(prop.id, 3)
    assert job_id

    # Simulate job completion.
    prop = await repo.get(prop.id)
    image_refs = {opt.id: [f"stubs/{opt.id}/draft.png"] for opt in prop.options}
    await orch.complete_stage1(prop.id, image_refs)

    prop = await repo.get(prop.id)
    assert prop.status == PropStatus.AWAITING_OPTIONS_REVIEW

    # Gate 2 — selection
    chosen = prop.options[0].id
    await orch.record_selection(prop.id, chosen, "prod_designer", "silhouette reads on camera")

    prop = await repo.get(prop.id)
    assert prop.status == PropStatus.SELECTION_CONFIRMED
    assert prop.selection.chosen == chosen

    # Stage 3
    job_id = await orch.start_stage3(prop.id)
    assert job_id

    asset_refs = {
        "turnaround": ["stubs/t1.png"],
        "detail_callouts": ["stubs/d1.png"],
        "variants": ["stubs/v_hero.png", "stubs/v_stunt.png"],
    }
    await orch.complete_stage3(prop.id, asset_refs)

    prop = await repo.get(prop.id)
    assert prop.status == PropStatus.ASSETS_READY
    assert prop.final_assets.turnaround == ["stubs/t1.png"]
