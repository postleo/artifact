"""
tests/test_background_pipeline.py — unit tests for the background tasks pipeline.
"""
import pytest
import pytest_asyncio

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
async def test_stage1_background_pipeline_end_to_end():
    repo = InMemoryPropRepository()
    orch = _make_orchestrator(repo)

    prop = PropRecord(brief=Brief(what="Medieval sword", era="15th century"))
    await repo.create(prop)

    # Start Stage 1 synchronously
    job_id = await orch.start_stage1(prop.id, 3)

    # Prop is currently generating_options and options have rationales
    prop = await repo.get(prop.id)
    assert prop.status == PropStatus.GENERATING_OPTIONS
    assert len(prop.options) == 3

    # Execute background pipeline runner
    await orch.run_stage1_pipeline(prop.id, 3, job_id)

    # After pipeline completion, status must be awaiting review & images populated
    prop = await repo.get(prop.id)
    assert prop.status == PropStatus.AWAITING_OPTIONS_REVIEW
    assert len(prop.options[0].image_refs) > 0


@pytest.mark.asyncio
async def test_stage3_background_pipeline_end_to_end():
    repo = InMemoryPropRepository()
    orch = _make_orchestrator(repo)

    prop = PropRecord(brief=Brief(what="Sci-fi laser gun", era="future"))
    await repo.create(prop)
    await repo.transition(prop.id, PropStatus.GENERATING_OPTIONS)

    # Populate options
    prop = await repo.get(prop.id)
    from store.models import Option
    prop.options = [Option(id="opt_1", rationale="Sleek neon design")]
    await repo.update(prop)
    await repo.transition(prop.id, PropStatus.AWAITING_OPTIONS_REVIEW)

    # Confirm selection
    await orch.record_selection(prop.id, "opt_1", "director", "neon theme fits the movie aesthetic")
    prop = await repo.get(prop.id)
    assert prop.status == PropStatus.SELECTION_CONFIRMED

    # Start Stage 3 finalization
    job_id = await orch.start_stage3(prop.id)
    prop = await repo.get(prop.id)
    assert prop.status == PropStatus.GENERATING_FINAL

    # Execute background pipeline runner
    await orch.run_stage3_pipeline(prop.id, job_id)

    # Assert final assets populated and state transitioned to ready
    prop = await repo.get(prop.id)
    assert prop.status == PropStatus.ASSETS_READY
    assert len(prop.final_assets.turnaround) > 0
    assert prop.final_assets.material_spec is not None
    assert prop.final_assets.build_spec is not None
