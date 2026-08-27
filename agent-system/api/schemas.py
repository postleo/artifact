"""
api/schemas.py — request and response Pydantic schemas for the HTTP API.
Separate from store/models.py to keep the DB shape and API contract decoupled.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class BriefIn(BaseModel):
    what: str
    on_screen: List[str] = Field(default_factory=list)
    era: str = ""
    constraints: List[str] = Field(default_factory=list)


class CreatePropRequest(BaseModel):
    project_id: str = ""
    brief: BriefIn
    reference_image_refs: List[str] = Field(default_factory=list)
    n_options: int = Field(default=4, ge=1, le=10)
    budget_ceiling_usd: float = Field(default=5.0, gt=0)


class SelectionRequest(BaseModel):
    chosen_option_id: str
    chosen_by: str
    why: str


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class OptionOut(BaseModel):
    id: str
    rationale: str
    image_urls: List[str] = Field(default_factory=list)


class SelectionOut(BaseModel):
    chosen: str
    by: str
    why: str
    at: datetime


class FinalAssetsOut(BaseModel):
    turnaround: List[str] = Field(default_factory=list)
    detail_callouts: List[str] = Field(default_factory=list)
    material_spec: Optional[str] = None
    variants: List[str] = Field(default_factory=list)
    build_spec: Optional[str] = None


class CostOut(BaseModel):
    nb2_images: int
    nbpro_images: int
    est_usd: float


class FlagsOut(BaseModel):
    trademark_risk: str
    moderation: str


class PropOut(BaseModel):
    id: str
    project_id: str
    status: str
    brief: BriefIn
    reference_image_refs: List[str]
    options: List[OptionOut] = Field(default_factory=list)
    selection: Optional[SelectionOut] = None
    final_assets: FinalAssetsOut = Field(default_factory=FinalAssetsOut)
    cost: CostOut
    flags: FlagsOut
    job_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CreatePropResponse(BaseModel):
    prop_id: str
    job_id: str
    status: str


class JobHandleResponse(BaseModel):
    prop_id: str
    job_id: str
    status: str


class ExportResponse(BaseModel):
    prop_id: str
    dam_ref: str
    status: str


class ScheduledCheckResponse(BaseModel):
    failed: List[str]
    overdue_review: List[str]
    overdue_finalize: List[str]
    budget_exceeded: List[str]
