"""
tests/test_prop_events.py — unit tests for the prop lifecycle event backbone.

These tests intentionally do NOT require ``confluent-kafka`` to be installed:
the producer imports it lazily inside the enable path only, and the disabled
path must never touch it. They must pass under:

    USE_STUBS=true python -m pytest tests/ -q
"""

from __future__ import annotations

import json
import re
import sys

import pytest

from events.producer import PropEventProducer, publish_prop_event, reset_producer_singleton
from events.schema import (
    EVENT_SOURCE,
    SCHEMA_VERSION,
    PropEvent,
    PropEventStatus,
    map_status,
)
from store.models import Brief, PropRecord, PropStatus

# Exact contract status values (must match the consumer verbatim).
CONTRACT_STATUSES = {
    "draft",
    "generating_options",
    "options_ready",
    "selection_confirmed",
    "generating_final",
    "assets_ready",
    "exported",
    "failed_options",
    "failed_final",
    "failed_export",
    "budget_exceeded",
}

_ISO_UTC_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


# ---------------------------------------------------------------------------
# (a) Serialization matches the contract
# ---------------------------------------------------------------------------

def test_prop_event_status_enum_matches_contract():
    assert {s.value for s in PropEventStatus} == CONTRACT_STATUSES


def test_serialization_matches_contract_shape_and_values():
    event = PropEvent.build(
        prop_id="prop_abc123",
        status=PropEventStatus.OPTIONS_READY,
        revision=1,
        job_id="job_deadbeef",
        cost={"nb2_images": 4, "nbpro_images": 0, "est_usd": 0.08},
        flags={"trademark_risk": "none", "moderation": "clean", "budget_exceeded": False},
        timestamp="2026-09-09T06:00:00Z",
    )

    raw = event.to_json_bytes()
    assert isinstance(raw, bytes)
    decoded = json.loads(raw.decode("utf-8"))

    # Exact key set and ordering per the contract.
    expected_keys = [
        "schema_version",
        "prop_id",
        "status",
        "job_id",
        "cost",
        "flags",
        "revision",
        "timestamp",
        "source",
    ]
    assert list(decoded.keys()) == expected_keys

    assert decoded["schema_version"] == SCHEMA_VERSION == 1
    assert decoded["prop_id"] == "prop_abc123"
    assert decoded["status"] == "options_ready"
    assert decoded["status"] in CONTRACT_STATUSES
    assert decoded["job_id"] == "job_deadbeef"
    assert decoded["cost"] == {"nb2_images": 4, "nbpro_images": 0, "est_usd": 0.08}
    assert decoded["flags"]["moderation"] == "clean"
    assert decoded["revision"] == 1 and isinstance(decoded["revision"], int)
    assert decoded["timestamp"] == "2026-09-09T06:00:00Z"
    assert decoded["source"] == EVENT_SOURCE == "agent-system"


def test_key_bytes_is_prop_id_utf8():
    event = PropEvent.build(prop_id="prop_xyz", status="draft", revision=1)
    assert event.key_bytes() == b"prop_xyz"


def test_nullable_fields_serialize_as_json_null():
    event = PropEvent.build(prop_id="prop_null", status="draft", revision=1)
    decoded = json.loads(event.to_json_bytes())
    assert decoded["job_id"] is None
    assert decoded["cost"] is None
    assert decoded["flags"] is None


def test_default_timestamp_is_iso8601_utc_z():
    event = PropEvent.build(prop_id="prop_ts", status="draft", revision=1)
    assert _ISO_UTC_RE.match(event.timestamp), event.timestamp


def test_internal_status_mapping_awaiting_review_becomes_options_ready():
    # The internal state machine's "awaiting_options_review" surfaces on the
    # wire as the contract value "options_ready".
    assert map_status(PropStatus.AWAITING_OPTIONS_REVIEW) is PropEventStatus.OPTIONS_READY
    assert map_status("awaiting_options_review") is PropEventStatus.OPTIONS_READY
    # All other internal statuses map to an identically-named contract value.
    for ps in PropStatus:
        if ps is PropStatus.AWAITING_OPTIONS_REVIEW:
            continue
        assert map_status(ps).value == ps.value


def test_from_prop_record_populates_contract_fields():
    prop = PropRecord(brief=Brief(what="an ancient astrolabe"))
    prop.job_id = "job_112233"
    event = PropEvent.from_prop_record(prop, revision=1)
    decoded = json.loads(event.to_json_bytes())
    assert decoded["prop_id"] == prop.id
    assert decoded["status"] == "draft"  # PropStatus.DRAFT
    assert decoded["job_id"] == "job_112233"
    # cost/flags default sub-models serialize to plain dicts.
    assert decoded["cost"] == {"nb2_images": 0, "nbpro_images": 0, "est_usd": 0.0}
    assert decoded["flags"]["trademark_risk"] == "none"


# ---------------------------------------------------------------------------
# (b) Producer is a strict no-op when disabled (no confluent_kafka import)
# ---------------------------------------------------------------------------

def test_producer_disabled_is_noop_and_no_kafka_import():
    # Make sure a stale import from another test doesn't mask the assertion.
    sys.modules.pop("confluent_kafka", None)

    producer = PropEventProducer(enabled=False)
    assert producer.enabled is False

    event = PropEvent.build(prop_id="prop_disabled", status="draft", revision=1)
    # Must not raise, must not create a client, must not import the kafka lib.
    producer.publish(event)
    producer.flush()
    producer.close()

    assert producer._producer is None
    assert "confluent_kafka" not in sys.modules


def test_publish_prop_event_helper_is_noop_when_disabled(monkeypatch):
    # Force a fresh singleton built with KAFKA_ENABLED unset → disabled.
    monkeypatch.delenv("KAFKA_ENABLED", raising=False)
    reset_producer_singleton()
    sys.modules.pop("confluent_kafka", None)

    prop = PropRecord(brief=Brief(what="a jewelled dagger"))
    # Should be a total no-op and never raise.
    publish_prop_event(prop)
    publish_prop_event(prop, status=PropStatus.GENERATING_OPTIONS)

    from events.producer import get_producer

    assert get_producer().enabled is False
    assert "confluent_kafka" not in sys.modules

    reset_producer_singleton()


def test_publish_never_raises_even_if_client_lib_absent():
    # When enabled but confluent-kafka is not installed, publish must swallow the
    # ImportError and never propagate it into the caller's request path.
    producer = PropEventProducer(
        enabled=True,
        bootstrap_servers="localhost:9092",
        api_key="k",
        api_secret="s",
        topic="artifact.prop.events",
    )
    assert producer.enabled is True
    event = PropEvent.build(prop_id="prop_enabled", status="draft", revision=1)
    # No exception should escape regardless of whether the lib is installed.
    producer.publish(event)


def test_revision_counter_is_monotonic_per_prop():
    producer = PropEventProducer(enabled=False)
    assert producer.next_revision("prop_a") == 1
    assert producer.next_revision("prop_a") == 2
    assert producer.next_revision("prop_a") == 3
    # Independent per prop_id.
    assert producer.next_revision("prop_b") == 1
    assert producer.next_revision("prop_a") == 4
