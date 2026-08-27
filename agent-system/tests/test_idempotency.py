"""
tests/test_idempotency.py — idempotency key tests.
Verifies that duplicate idempotency keys are rejected (preventing double-spend).
"""
import pytest

from store.models import Brief, PropRecord, PropStatus
from store.repository import InMemoryPropRepository


@pytest.mark.asyncio
async def test_idempotency_key_recorded_and_detected():
    repo = InMemoryPropRepository()
    prop = PropRecord(brief=Brief(what="A sword"))
    await repo.create(prop)

    key = "idem-test-001"
    assert not await repo.idempotency_key_exists(key)

    await repo.record_idempotency_key(prop.id, key)
    assert await repo.idempotency_key_exists(key)


@pytest.mark.asyncio
async def test_second_use_of_same_key_detected():
    repo = InMemoryPropRepository()
    prop = PropRecord(brief=Brief(what="A crown"))
    await repo.create(prop)

    key = "idem-duplicate-key"
    await repo.record_idempotency_key(prop.id, key)

    # Simulating the API check: key already used → reject.
    exists = await repo.idempotency_key_exists(key)
    assert exists, "Duplicate key must be detected"


@pytest.mark.asyncio
async def test_different_keys_are_independent():
    repo = InMemoryPropRepository()
    prop = PropRecord(brief=Brief(what="A relic"))
    await repo.create(prop)

    await repo.record_idempotency_key(prop.id, "key-A")
    assert await repo.idempotency_key_exists("key-A")
    assert not await repo.idempotency_key_exists("key-B")
