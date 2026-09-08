"""
api/routes.py — all FastAPI route handlers.
Long operations return a job handle immediately; progress arrives via /events.
"""
from __future__ import annotations

import asyncio
import logging
import os
import secrets
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status, BackgroundTasks, Query
from fastapi.responses import StreamingResponse

from api.dependencies import (
    get_dam_adapter,
    get_notifier,
    get_orchestrator,
    get_repo,
)
from api.schemas import (
    CreatePropRequest,
    CreatePropResponse,
    ExportResponse,
    FinalAssetsOut,
    FlagsOut,
    JobHandleResponse,
    OptionOut,
    PropOut,
    ScheduledCheckResponse,
    SelectionOut,
    SelectionRequest,
)
from api.storage import resolve_signed_urls
from integrations.scheduled_check import ScheduledCheckService
from store.models import PropRecord, PropStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1")

# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------
_BEARER_TOKEN = os.environ.get("API_BEARER_TOKEN", "")
_USE_STUBS = os.environ.get("USE_STUBS", "false").lower() == "true"

# Fail-closed authentication on module load in production
if not _USE_STUBS and not _BEARER_TOKEN:
    raise RuntimeError(
        "FATAL SECURITY MISCONFIGURATION: API_BEARER_TOKEN must be specified in production "
        "to secure the money-spending image generation pipelines."
    )


def _check_auth(authorization: str = Header(default="")) -> None:
    if not _BEARER_TOKEN:
        return  # auth disabled in dev
    
    # Constant-time comparison to prevent timing attacks
    if not secrets.compare_digest(authorization, f"Bearer {_BEARER_TOKEN}"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


def _check_internal_auth(authorization: str = Header(default="")) -> None:
    """Verifies either the static API bearer token or a valid Google OIDC token."""
    if not _BEARER_TOKEN:
        return
    
    if secrets.compare_digest(authorization, f"Bearer {_BEARER_TOKEN}"):
        return

    # Decode and verify Google-signed OIDC token (from Cloud Scheduler)
    if authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1]
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            id_info = id_token.verify_oauth2_token(
                token, google_requests.Request()
            )
            if id_info["iss"] in ["accounts.google.com", "https://accounts.google.com"]:
                return
        except Exception as exc:
            logger.warning("OIDC validation failed: %s", exc)

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


# ---------------------------------------------------------------------------
# Prop record → API response shape
# ---------------------------------------------------------------------------

def _prop_to_out(prop: PropRecord) -> PropOut:
    options_out = [
        OptionOut(
            id=o.id,
            rationale=o.rationale,
            image_urls=resolve_signed_urls(o.image_refs),
        )
        for o in prop.options
    ]
    selection_out = None
    if prop.selection:
        selection_out = SelectionOut(**prop.selection.model_dump())

    final_out = FinalAssetsOut(
        turnaround=resolve_signed_urls(prop.final_assets.turnaround),
        detail_callouts=resolve_signed_urls(prop.final_assets.detail_callouts),
        material_spec=prop.final_assets.material_spec,
        variants=resolve_signed_urls(prop.final_assets.variants),
        build_spec=prop.final_assets.build_spec,
    )

    from api.schemas import BriefIn, CostOut, FlagsOut
    return PropOut(
        id=prop.id,
        project_id=prop.project_id,
        status=prop.status.value,
        brief=BriefIn(**prop.brief.model_dump()),
        reference_image_refs=prop.reference_image_refs,
        options=options_out,
        selection=selection_out,
        final_assets=final_out,
        cost=CostOut(**prop.cost.model_dump()),
        flags=FlagsOut(**prop.flags.model_dump()),
        job_id=prop.job_id,
        created_at=prop.created_at,
        updated_at=prop.updated_at,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/healthz")
async def healthz():
    return {"status": "ok"}


@router.post("/props", response_model=CreatePropResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_prop(
    body: CreatePropRequest,
    background_tasks: BackgroundTasks,
    idempotency_key: str = Header(default=""),
    repo=Depends(get_repo),
    orchestrator=Depends(get_orchestrator),
    _auth=Depends(_check_auth),
):
    """Create a prop from a brief and start Stage 1 (options generation) in the background."""
    from store.models import Brief, PropRecord

    # Secure transaction-safe idempotency key check.
    if idempotency_key:
        if await repo.idempotency_key_exists(idempotency_key):
            # Fetch existing to return
            existing_record = await repo.get_by_idempotency_key(idempotency_key)
            if existing_record:
                return CreatePropResponse(
                    prop_id=existing_record.id,
                    job_id=existing_record.job_id,
                    status=existing_record.status.value
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Idempotency key {idempotency_key!r} already used.",
            )

    prop = PropRecord(
        project_id=body.project_id,
        brief=Brief(**body.brief.model_dump()),
        reference_image_refs=body.reference_image_refs,
        budget_ceiling_usd=body.budget_ceiling_usd,
    )
    await repo.create(prop)

    if idempotency_key:
        await repo.record_idempotency_key(prop.id, idempotency_key)

    # Initialize Stage 1 synchronously
    job_id = await orchestrator.start_stage1(prop.id, body.n_options)

    # Dispatch core background execution (sub-agent call & image generation)
    background_tasks.add_task(
        orchestrator.run_stage1_pipeline, prop.id, body.n_options, job_id
    )

    return CreatePropResponse(prop_id=prop.id, job_id=job_id, status="generating_options")


@router.get("/props/{prop_id}", response_model=PropOut)
async def get_prop(
    prop_id: str,
    repo=Depends(get_repo),
    _auth=Depends(_check_auth),
):
    prop = await repo.get(prop_id)
    if prop is None:
        raise HTTPException(status_code=404, detail=f"Prop {prop_id!r} not found")
    return _prop_to_out(prop)


@router.get("/props/{prop_id}/options")
async def get_options(
    prop_id: str,
    repo=Depends(get_repo),
    _auth=Depends(_check_auth),
):
    prop = await repo.get(prop_id)
    if prop is None:
        raise HTTPException(status_code=404, detail=f"Prop {prop_id!r} not found")
    return [
        OptionOut(
            id=o.id,
            rationale=o.rationale,
            image_urls=resolve_signed_urls(o.image_refs),
        )
        for o in prop.options
    ]


@router.post("/props/{prop_id}/selection", response_model=PropOut)
async def record_selection(
    prop_id: str,
    body: SelectionRequest,
    repo=Depends(get_repo),
    orchestrator=Depends(get_orchestrator),
    _auth=Depends(_check_auth),
):
    """Gate 2: record the chosen option."""
    try:
        await orchestrator.record_selection(
            prop_id,
            body.chosen_option_id,
            body.chosen_by,
            body.why,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    prop = await repo.get(prop_id)
    return _prop_to_out(prop)


@router.post(
    "/props/{prop_id}/finalize",
    response_model=JobHandleResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def finalize_prop(
    prop_id: str,
    background_tasks: BackgroundTasks,
    idempotency_key: str = Header(default=""),
    repo=Depends(get_repo),
    orchestrator=Depends(get_orchestrator),
    _auth=Depends(_check_auth),
):
    """Start Stage 3 (final asset generation) in the background for the selected option."""
    if idempotency_key:
        if await repo.idempotency_key_exists(idempotency_key):
            raise HTTPException(status_code=409, detail=f"Idempotency key {idempotency_key!r} already used.")

    try:
        job_id = await orchestrator.start_stage3(prop_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if idempotency_key:
        await repo.record_idempotency_key(prop_id, idempotency_key)

    # Dispatch core background execution
    background_tasks.add_task(
        orchestrator.run_stage3_pipeline, prop_id, job_id
    )

    return JobHandleResponse(prop_id=prop_id, job_id=job_id, status="generating_final")


@router.get("/props/{prop_id}/assets")
async def get_assets(
    prop_id: str,
    repo=Depends(get_repo),
    _auth=Depends(_check_auth),
):
    prop = await repo.get(prop_id)
    if prop is None:
        raise HTTPException(status_code=404, detail=f"Prop {prop_id!r} not found")
    if prop.status not in (PropStatus.ASSETS_READY, PropStatus.EXPORTED):
        raise HTTPException(
            status_code=400,
            detail=f"Assets not ready. Current status: {prop.status.value}",
        )
    return FinalAssetsOut(
        turnaround=resolve_signed_urls(prop.final_assets.turnaround),
        detail_callouts=resolve_signed_urls(prop.final_assets.detail_callouts),
        material_spec=prop.final_assets.material_spec,
        variants=resolve_signed_urls(prop.final_assets.variants),
        build_spec=prop.final_assets.build_spec,
    )


@router.post("/props/{prop_id}/export", response_model=ExportResponse)
async def export_prop(
    prop_id: str,
    acknowledge_risk: bool = Query(default=False),
    repo=Depends(get_repo),
    dam=Depends(get_dam_adapter),
    _auth=Depends(_check_auth),
):
    """Push the final asset package to the DAM / asset library."""
    prop = await repo.get(prop_id)
    if prop is None:
        raise HTTPException(status_code=404, detail=f"Prop {prop_id!r} not found")
    if prop.status != PropStatus.ASSETS_READY:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot export: status is {prop.status.value!r}, expected 'assets_ready'.",
        )

    # Risk block safety guardrail
    is_high_risk = prop.flags.trademark_risk == "high" or prop.flags.moderation == "flagged"
    if is_high_risk and not acknowledge_risk:
        raise HTTPException(
            status_code=400,
            detail="Export rejected: This prop has high safety/trademark risks flagged. "
                   "Provide 'acknowledge_risk=true' to bypass this block."
        )

    asset_package = {
        "turnaround": prop.final_assets.turnaround,
        "detail_callouts": prop.final_assets.detail_callouts,
        "material_spec": prop.final_assets.material_spec,
        "variants": prop.final_assets.variants,
        "build_spec": prop.final_assets.build_spec,
    }

    try:
        dam_ref = await dam.export(prop_id, asset_package)
    except Exception as exc:
        logger.error("Export failed for prop %s: %s", prop_id, exc, exc_info=True)
        from store.models import PropStatus as PS
        await repo.transition(prop_id, PS.FAILED_EXPORT)
        # Low priority L1 fix: generic message without exception leakage
        raise HTTPException(status_code=502, detail="DAM export failed. Please inspect logs.")

    await repo.transition(prop_id, PropStatus.EXPORTED)
    return ExportResponse(prop_id=prop_id, dam_ref=dam_ref, status="exported")


@router.get("/props/{prop_id}/events")
async def events_stream(
    prop_id: str,
    repo=Depends(get_repo),
    _auth=Depends(_check_auth),
):
    """
    Server-Sent Events stream for live status updates.
    Polls the DB every 2 seconds and pushes status changes.
    Sends keep-alive comments every 15 seconds to prevent gateway timeouts.
    """
    async def _generate() -> AsyncGenerator[str, None]:
        last_status = None
        for i in range(150):  # max ~5 minutes of polling
            # SSE keep-alive comment (Defect 8)
            if i % 7 == 0:
                yield ": keep-alive\n\n"

            prop = await repo.get(prop_id)
            if prop is None:
                yield "data: {\"error\": \"prop not found\"}\n\n"
                return
            current = prop.status.value
            if current != last_status:
                last_status = current
                import json
                payload = json.dumps(
                    {
                        "status": current,
                        "job_id": prop.job_id,
                        "updated_at": prop.updated_at.isoformat(),
                    }
                )
                yield f"data: {payload}\n\n"
            if prop.status in (PropStatus.ASSETS_READY, PropStatus.EXPORTED, PropStatus.FAILED_OPTIONS, PropStatus.FAILED_FINAL, PropStatus.FAILED_EXPORT):
                return
            await asyncio.sleep(2)

    return StreamingResponse(_generate(), media_type="text/event-stream")


@router.post("/internal/scheduled-check", response_model=ScheduledCheckResponse)
async def scheduled_check(
    repo=Depends(get_repo),
    notifier=Depends(get_notifier),
    _auth=Depends(_check_internal_auth),
):
    """
    Called by Cloud Scheduler. Scans DB for failures, overdue items, and budget overruns.
    """
    svc = ScheduledCheckService(repo, notifier)
    result = await svc.run()
    return ScheduledCheckResponse(**result)
