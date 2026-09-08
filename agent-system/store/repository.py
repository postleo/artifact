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

    @abc.abstractmethod
    async def get_by_idempotency_key(self, key: str) -> Optional[PropRecord]:
        """Return the prop previously associated with ``key``, or None if unknown."""
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
        from google.cloud import firestore  # type: ignore
        doc_ref = self._col.document(prop_id)
        transaction = self._db.transaction()

        @firestore.async_transactional
        async def _txn(txn):  # type: ignore
            snapshot = await doc_ref.get(transaction=txn)
            if not snapshot.exists:
                raise ValueError(f"Prop {prop_id!r} not found")
            data = snapshot.to_dict()
            current = PropStatus(data["status"])
            assert_valid_transition(current, target_status)
            data["status"] = target_status.value
            data["updated_at"] = datetime.now(timezone.utc).isoformat()
            txn.set(doc_ref, data)
            return PropRecord(**data)

        return await _txn(transaction)

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

    async def get_by_idempotency_key(self, key: str) -> Optional[PropRecord]:
        doc = await self._db.collection("idempotency_keys").document(key).get()
        if not doc.exists:
            return None
        prop_id = (doc.to_dict() or {}).get("prop_id")
        if not prop_id:
            return None
        return await self.get(prop_id)


# ---------------------------------------------------------------------------
# In-memory implementation (for tests / local dev without GCP)
# ---------------------------------------------------------------------------

class InMemoryPropRepository(PropRepository):
    """Thread-unsafe in-memory store — suitable for unit tests and local CLI."""

    def __init__(self) -> None:
        self._props: dict[str, PropRecord] = {}
        self._idem_keys: dict[str, str] = {}   # idempotency key -> prop_id

    async def get(self, prop_id: str) -> Optional[PropRecord]:
        prop = self._props.get(prop_id)
        if prop is None:
            return None
        return prop.model_copy(deep=True)

    async def create(self, prop: PropRecord) -> PropRecord:
        prop.created_at = datetime.now(timezone.utc)
        prop.updated_at = datetime.now(timezone.utc)
        self._props[prop.id] = prop.model_copy(deep=True)
        return prop.model_copy(deep=True)

    async def update(self, prop: PropRecord) -> PropRecord:
        prop.updated_at = datetime.now(timezone.utc)
        self._props[prop.id] = prop.model_copy(deep=True)
        return prop.model_copy(deep=True)

    async def transition(
        self, prop_id: str, target_status: PropStatus
    ) -> PropRecord:
        prop = self._props.get(prop_id)
        if prop is None:
            raise ValueError(f"Prop {prop_id!r} not found")
        assert_valid_transition(prop.status, target_status)
        prop.status = target_status
        prop.updated_at = datetime.now(timezone.utc)
        self._props[prop_id] = prop.model_copy(deep=True)
        return prop.model_copy(deep=True)

    async def list_by_status(self, status: PropStatus) -> List[PropRecord]:
        return [p for p in self._props.values() if p.status == status]

    async def idempotency_key_exists(self, key: str) -> bool:
        return key in self._idem_keys

    async def record_idempotency_key(self, prop_id: str, key: str) -> None:
        self._idem_keys[key] = prop_id

    async def get_by_idempotency_key(self, key: str) -> Optional[PropRecord]:
        prop_id = self._idem_keys.get(key)
        if prop_id is None:
            return None
        prop = self._props.get(prop_id)
        return prop.model_copy(deep=True) if prop is not None else None
