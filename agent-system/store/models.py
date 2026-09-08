"""
store/models.py — Pydantic models for the prop record and all sub-structures.
These are the canonical data shapes used everywhere in the service.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# State machine
# ---------------------------------------------------------------------------

class PropStatus(str, Enum):
    DRAFT = "draft"
    GENERATING_OPTIONS = "generating_options"
    AWAITING_OPTIONS_REVIEW = "awaiting_options_review"
    SELECTION_CONFIRMED = "selection_confirmed"
    GENERATING_FINAL = "generating_final"
    ASSETS_READY = "assets_ready"
    EXPORTED = "exported"

    # Failure states — monitored by the scheduled check.
    FAILED_OPTIONS = "failed_options"
    FAILED_FINAL = "failed_final"
    FAILED_EXPORT = "failed_export"

    # Budget paused
    BUDGET_EXCEEDED = "budget_exceeded"


VALID_TRANSITIONS: dict[PropStatus, list[PropStatus]] = {
    PropStatus.DRAFT: [PropStatus.GENERATING_OPTIONS],
    PropStatus.GENERATING_OPTIONS: [
        PropStatus.AWAITING_OPTIONS_REVIEW,
        PropStatus.FAILED_OPTIONS,
    ],
    PropStatus.AWAITING_OPTIONS_REVIEW: [PropStatus.SELECTION_CONFIRMED],
    PropStatus.SELECTION_CONFIRMED: [
        PropStatus.GENERATING_FINAL,
        PropStatus.BUDGET_EXCEEDED,
    ],
    PropStatus.GENERATING_FINAL: [
        PropStatus.ASSETS_READY,
        PropStatus.FAILED_FINAL,
    ],
    PropStatus.ASSETS_READY: [PropStatus.EXPORTED, PropStatus.FAILED_EXPORT],
    PropStatus.EXPORTED: [],
    PropStatus.FAILED_OPTIONS: [PropStatus.GENERATING_OPTIONS],
    PropStatus.FAILED_FINAL: [PropStatus.GENERATING_FINAL],
    PropStatus.FAILED_EXPORT: [PropStatus.EXPORTED],
    PropStatus.BUDGET_EXCEEDED: [PropStatus.GENERATING_FINAL],
}


def assert_valid_transition(current: PropStatus, target: PropStatus) -> None:
    """Raise ValueError if the transition is not allowed by the state machine."""
    allowed = VALID_TRANSITIONS.get(current, [])
    if target not in allowed:
        raise ValueError(
            f"Invalid state transition: {current!r} → {target!r}. "
            f"Allowed: {[s.value for s in allowed]}"
        )


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class Brief(BaseModel):
    what: str
    on_screen: List[str] = Field(default_factory=list)
    era: str = ""
    constraints: List[str] = Field(default_factory=list)


class Option(BaseModel):
    id: str = Field(default_factory=lambda: f"opt_{uuid.uuid4().hex[:6]}")
    rationale: str = ""
    image_refs: List[str] = Field(default_factory=list)


class Selection(BaseModel):
    chosen: str          # option id
    by: str              # user / role identifier
    why: str
    at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FinalAssets(BaseModel):
    turnaround: List[str] = Field(default_factory=list)
    detail_callouts: List[str] = Field(default_factory=list)
    material_spec: Optional[str] = None
    variants: List[str] = Field(default_factory=list)
    build_spec: Optional[str] = None


class CostRecord(BaseModel):
    nb2_images: int = 0
    nbpro_images: int = 0
    est_usd: float = 0.0


class Flags(BaseModel):
    trademark_risk: str = "none"   # "none" | "low" | "high"
    moderation: str = "clean"      # "clean" | "flagged"
    budget_exceeded: bool = False


# ---------------------------------------------------------------------------
# Top-level prop record
# ---------------------------------------------------------------------------

class PropRecord(BaseModel):
    id: str = Field(default_factory=lambda: f"prop_{uuid.uuid4().hex[:8]}")
    project_id: str = ""
    brief: Brief
    reference_image_refs: List[str] = Field(default_factory=list)
    options: List[Option] = Field(default_factory=list)
    selection: Optional[Selection] = None
    final_assets: FinalAssets = Field(default_factory=FinalAssets)
    cost: CostRecord = Field(default_factory=CostRecord)
    flags: Flags = Field(default_factory=Flags)
    status: PropStatus = PropStatus.DRAFT
    budget_ceiling_usd: float = 5.0
    idempotency_keys: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    job_id: Optional[str] = None   # active background job handle
