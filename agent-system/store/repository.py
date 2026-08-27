"""
store/repository.py — Abstract repository interface + Firestore implementation.
All DB access goes through PropRepository so the underlying store is swappable.
"""
from __future__ import annotations

import abc
import os
from datetime import datetime, timezone
from typing import List, Optional

from store.models import PropRecord, PropStatus, assert_valid_transition


# ---------------------------------------------------------------------------
# Abstract interface
# ---------------------------------------------------------------------------

class PropRepository(abc.ABC):
    """All reads and writes to prop state go through this interface."""

    @abc.abstractmethod
    async def get(self, prop_id: str) -> Optional[PropRecord]:
        ...

    @abc.abstractmethod
    async def create(self, prop: PropRecord) -> PropRecord:
        ...

    @abc.abstractmethod
    async def update(self, prop: PropRecord) -> PropRecord:
        ...

    @abc.abstractmethod
    async def transition(
        self, prop_id: str, target_status: PropStatus
    ) -> PropRecord:
        """Atomically validate and apply a state-machine transition."""
        ...

    @abc.abstractmethod
    async def list_by_status(self, status: PropStatus) -> List[PropRecord]:
        ...

    @abc.abstractmethod
    async def idempotency_key_exists(self, key: str) -> bool:
        ...

    @abc.abstractmethod
    async def record_idempotency_key(self, prop_id: str, key: str) -> None:
        ...


# ---------------------------------------------------------------------------
# Firestore implementation
# ---------------------------------------------------------------------------

COLLECTION = "props"


class FirestorePropRepository(PropRepository):
    """
    Stores prop records as Firestore documents.
    Requires: GCP_PROJECT_ID env var and Application Default Credentials.
    """

    def __init__(self) -> None:
        from google.cloud import firestore  # type: ignore
        project = os.environ.get("GCP_PROJECT_ID", "")
        self._db = firestore.AsyncClient(project=project)
        self._col = self._db.collection(COLLECTION)

    async def get(self, prop_id: str) -> Optional[PropRecord]:
        doc = await self._col.document(prop_id).get()
        if not doc.exists:
            return None
        return PropRecord(**doc.to_dict())

    async def create(self, prop: PropRecord) -> PropRecord:
        prop.created_at = datetime.now(timezone.utc)
        prop.updated_at = datetime.now(timezone.utc)
        await self._col.document(prop.id).set(prop.model_dump(mode="json"))
        return prop

    async def update(self, prop: PropRecord) -> PropRecord:
        prop.updated_at = datetime.now(timezone.utc)
        await self._col.document(prop.id).set(prop.model_dump(mode="json"))
        return prop

    async def transition(
        self, prop_id: str, target_status: PropStatus
    ) -> PropRecord:
        doc_ref = self._col.document(prop_id)

        @self._db.transaction
        async def _txn(transaction):  # type: ignore
            snapshot = await doc_ref.get(transaction=transaction)
            if not snapshot.exists:
                raise ValueError(f"Prop {prop_id!r} not found")
            data = snapshot.to_dict()
            current = PropStatus(data["status"])
            assert_valid_transition(current, target_status)
            data["status"] = target_status.value
            data["updated_at"] = datetime.now(timezone.utc).isoformat()
            transaction.set(doc_ref, data)
            return PropRecord(**data)

        return await _txn()  # type: ignore

    async def list_by_status(self, status: PropStatus) -> List[PropRecord]:
        query = self._col.where("status", "==", status.value)
        docs = await query.get()
        return [PropRecord(**d.to_dict()) for d in docs]

    async def idempotency_key_exists(self, key: str) -> bool:
        doc = await self._db.collection("idempotency_keys").document(key).get()
        return doc.exists

    async def record_idempotency_key(self, prop_id: str, key: str) -> None:
        await self._db.collection("idempotency_keys").document(key).set(
            {"prop_id": prop_id, "created_at": datetime.now(timezone.utc).isoformat()}
        )


# ---------------------------------------------------------------------------
# In-memory implementation (for tests / local dev without GCP)
# ---------------------------------------------------------------------------

class InMemoryPropRepository(PropRepository):
    """Thread-unsafe in-memory store — suitable for unit tests only."""

    def __init__(self) -> None:
        self._props: dict[str, PropRecord] = {}
        self._idem_keys: set[str] = set()

    async def get(self, prop_id: str) -> Optional[PropRecord]:
        return self._props.get(prop_id)

    async def create(self, prop: PropRecord) -> PropRecord:
        prop.created_at = datetime.now(timezone.utc)
        prop.updated_at = datetime.now(timezone.utc)
        self._props[prop.id] = prop
        return prop

    async def update(self, prop: PropRecord) -> PropRecord:
        prop.updated_at = datetime.now(timezone.utc)
        self._props[prop.id] = prop
        return prop

    async def transition(
        self, prop_id: str, target_status: PropStatus
    ) -> PropRecord:
        prop = self._props.get(prop_id)
        if prop is None:
            raise ValueError(f"Prop {prop_id!r} not found")
        assert_valid_transition(prop.status, target_status)
        prop.status = target_status
        prop.updated_at = datetime.now(timezone.utc)
        return prop

    async def list_by_status(self, status: PropStatus) -> List[PropRecord]:
        return [p for p in self._props.values() if p.status == status]

    async def idempotency_key_exists(self, key: str) -> bool:
        return key in self._idem_keys

    async def record_idempotency_key(self, prop_id: str, key: str) -> None:
        self._idem_keys.add(key)
