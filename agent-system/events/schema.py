"""
events/schema.py — the shared prop-lifecycle event contract (producer side).

Both independent services (this agent-system producer and the app-backend
consumer) must agree on EXACTLY this wire format:

    Kafka topic  : value of env KAFKA_TOPIC (default "artifact.prop.events")
    Message key  : prop_id (UTF-8 string)
    Message value: UTF-8 JSON
        {
          "schema_version": 1,
          "prop_id": "prop_xxx",
          "status": "<one of PropEventStatus>",
          "job_id": "..." | null,
          "cost": { ... } | null,
          "flags": { ... } | null,
          "revision": <int, monotonically increasing per prop_id, from 1>,
          "timestamp": "<ISO-8601 UTC, e.g. 2026-09-09T06:00:00Z>",
          "source": "agent-system"
        }

This module is deliberately dependency-light: it must import cleanly whether or
not ``confluent_kafka`` is installed and regardless of the ``KAFKA_ENABLED``
flag. It only depends on the stdlib + pydantic (already a project dependency).
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional, Union

from pydantic import BaseModel, Field

# Current schema version. Bump only with a coordinated contract change on BOTH
# the producer and the consumer.
SCHEMA_VERSION: int = 1

# The producer identity stamped on every event emitted from this service.
EVENT_SOURCE: str = "agent-system"


class PropEventStatus(str, Enum):
    """Canonical lifecycle statuses carried on the wire.

    These values are the *contract* values and MUST match the consumer exactly.
    Note the deliberate divergence from the internal ``store.models.PropStatus``:
    the internal ``awaiting_options_review`` state is published on the wire as
    ``options_ready`` (see :data:`_INTERNAL_STATUS_TO_EVENT`).
    """

    DRAFT = "draft"
    GENERATING_OPTIONS = "generating_options"
    OPTIONS_READY = "options_ready"
    SELECTION_CONFIRMED = "selection_confirmed"
    GENERATING_FINAL = "generating_final"
    ASSETS_READY = "assets_ready"
    EXPORTED = "exported"
    FAILED_OPTIONS = "failed_options"
    FAILED_FINAL = "failed_final"
    FAILED_EXPORT = "failed_export"
    BUDGET_EXCEEDED = "budget_exceeded"


# Maps the internal ``store.models.PropStatus`` *values* onto the wire contract.
# Keyed by string so this module never needs to import the store layer (avoids
# any import cycle: store.repository -> events.producer -> events.schema).
_INTERNAL_STATUS_TO_EVENT: Dict[str, PropEventStatus] = {
    "draft": PropEventStatus.DRAFT,
    "generating_options": PropEventStatus.GENERATING_OPTIONS,
    # Internal "awaiting_options_review" surfaces on the wire as "options_ready".
    "awaiting_options_review": PropEventStatus.OPTIONS_READY,
    "options_ready": PropEventStatus.OPTIONS_READY,
    "selection_confirmed": PropEventStatus.SELECTION_CONFIRMED,
    "generating_final": PropEventStatus.GENERATING_FINAL,
    "assets_ready": PropEventStatus.ASSETS_READY,
    "exported": PropEventStatus.EXPORTED,
    "failed_options": PropEventStatus.FAILED_OPTIONS,
    "failed_final": PropEventStatus.FAILED_FINAL,
    "failed_export": PropEventStatus.FAILED_EXPORT,
    "budget_exceeded": PropEventStatus.BUDGET_EXCEEDED,
}


def map_status(status: Any) -> PropEventStatus:
    """Coerce an internal ``PropStatus``/enum/str into a :class:`PropEventStatus`.

    Raises ``ValueError`` for an unknown status so mistakes surface loudly at the
    (guarded) call site rather than silently emitting a bad contract value.
    """
    if isinstance(status, PropEventStatus):
        return status
    raw = status.value if isinstance(status, Enum) else str(status)
    mapped = _INTERNAL_STATUS_TO_EVENT.get(raw)
    if mapped is None:
        # Fall back to a direct enum lookup; raises ValueError if truly unknown.
        return PropEventStatus(raw)
    return mapped


def utc_now_iso() -> str:
    """Return the current UTC time as an ISO-8601 string with a ``Z`` suffix.

    Second precision, e.g. ``2026-09-09T06:00:00Z`` — matching the contract's
    canonical example.
    """
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class PropEvent(BaseModel):
    """A single prop lifecycle event, matching the shared wire contract exactly.

    Field order here mirrors the contract; :meth:`to_json_bytes` re-materialises
    that order explicitly so serialization never depends on model field order.
    """

    schema_version: int = SCHEMA_VERSION
    prop_id: str
    status: PropEventStatus
    job_id: Optional[str] = None
    cost: Optional[Dict[str, Any]] = None
    flags: Optional[Dict[str, Any]] = None
    revision: int = Field(..., ge=1)
    timestamp: str = Field(default_factory=utc_now_iso)
    source: str = EVENT_SOURCE

    # ------------------------------------------------------------------
    # Construction helpers
    # ------------------------------------------------------------------
    @classmethod
    def build(
        cls,
        *,
        prop_id: str,
        status: Any,
        revision: int,
        job_id: Optional[str] = None,
        cost: Optional[Dict[str, Any]] = None,
        flags: Optional[Dict[str, Any]] = None,
        timestamp: Optional[str] = None,
    ) -> "PropEvent":
        """Build a fully-populated event, mapping ``status`` to the wire enum."""
        return cls(
            schema_version=SCHEMA_VERSION,
            prop_id=prop_id,
            status=map_status(status),
            job_id=job_id,
            cost=cost,
            flags=flags,
            revision=revision,
            timestamp=timestamp or utc_now_iso(),
            source=EVENT_SOURCE,
        )

    @classmethod
    def from_prop_record(
        cls,
        prop: Any,
        *,
        revision: int,
        status: Any = None,
        timestamp: Optional[str] = None,
    ) -> "PropEvent":
        """Build an event from a ``store.models.PropRecord``.

        ``status`` may be provided to override the record's current status (useful
        if the caller knows the target status before the record is refreshed);
        otherwise ``prop.status`` is used. ``cost`` and ``flags`` are serialized to
        plain dicts (or ``None`` if absent).
        """
        effective_status = status if status is not None else getattr(prop, "status", None)

        cost_obj = getattr(prop, "cost", None)
        cost_dict = _to_plain_dict(cost_obj)

        flags_obj = getattr(prop, "flags", None)
        flags_dict = _to_plain_dict(flags_obj)

        return cls.build(
            prop_id=getattr(prop, "id"),
            status=effective_status,
            revision=revision,
            job_id=getattr(prop, "job_id", None),
            cost=cost_dict,
            flags=flags_dict,
            timestamp=timestamp,
        )

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------
    def to_dict(self) -> Dict[str, Any]:
        """Return the event as an ordered plain dict matching the contract order."""
        return {
            "schema_version": self.schema_version,
            "prop_id": self.prop_id,
            "status": self.status.value,
            "job_id": self.job_id,
            "cost": self.cost,
            "flags": self.flags,
            "revision": self.revision,
            "timestamp": self.timestamp,
            "source": self.source,
        }

    def to_json_bytes(self) -> bytes:
        """Serialize to compact UTF-8 JSON bytes — the exact Kafka message value."""
        return json.dumps(
            self.to_dict(),
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")

    def key_bytes(self) -> bytes:
        """The Kafka message key: the prop_id as UTF-8 bytes."""
        return self.prop_id.encode("utf-8")


def _to_plain_dict(obj: Any) -> Optional[Dict[str, Any]]:
    """Best-effort conversion of a pydantic model / dict / None to a plain dict."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj
    # pydantic v2 model
    model_dump = getattr(obj, "model_dump", None)
    if callable(model_dump):
        try:
            return model_dump(mode="json")
        except Exception:
            return model_dump()
    # pydantic v1 fallback
    dict_fn = getattr(obj, "dict", None)
    if callable(dict_fn):
        return dict_fn()
    return None
