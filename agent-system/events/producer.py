"""
events/producer.py — feature-flagged Confluent/Kafka producer for prop events.

Design goals (see the shared contract in :mod:`events.schema`):

* **Strict no-op when disabled.** When ``KAFKA_ENABLED`` is false/unset, no
  ``confluent_kafka`` import happens and no client is ever created. The library
  is therefore NOT required at runtime unless the flag is explicitly enabled.
* **Lazy client init.** ``confluent_kafka`` is imported *inside* the enable path
  only, on first publish, so a missing package can never break module import.
* **Never raise into callers.** Every public method swallows and logs errors so a
  Kafka hiccup can never break the main request path.
* **Thread-safe.** Lazy init and the per-prop revision counter are lock-guarded.
  ``confluent_kafka.Producer`` is itself thread-safe for ``produce()``.

Revision counter limitation
---------------------------
The per-prop ``revision`` is an in-memory, per-process counter. It is monotonic
within a single running process only. On restart it resets, and across multiple
processes/instances it is not coordinated. This is acceptable for the prototype;
a production deployment would source the revision from the persistent store
(e.g. a per-prop version column) so it survives restarts and scales out.
"""

from __future__ import annotations

import logging
import threading
from typing import Any, Dict, Optional

import config
from events.schema import PropEvent

logger = logging.getLogger(__name__)


class PropEventProducer:
    """Wraps ``confluent_kafka.Producer`` with a hard feature-flag gate.

    The client is created lazily on the first :meth:`publish` while enabled. When
    disabled, the producer holds no resources and does nothing.
    """

    def __init__(
        self,
        *,
        enabled: Optional[bool] = None,
        bootstrap_servers: Optional[str] = None,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        topic: Optional[str] = None,
        security_protocol: Optional[str] = None,
        sasl_mechanism: Optional[str] = None,
    ) -> None:
        # All settings default to the single-source-of-truth values in config.py.
        self._enabled: bool = config.KAFKA_ENABLED if enabled is None else bool(enabled)
        self._bootstrap_servers: str = (
            config.KAFKA_BOOTSTRAP_SERVERS if bootstrap_servers is None else bootstrap_servers
        )
        self._api_key: str = config.KAFKA_API_KEY if api_key is None else api_key
        self._api_secret: str = config.KAFKA_API_SECRET if api_secret is None else api_secret
        self._topic: str = config.KAFKA_TOPIC if topic is None else topic
        self._security_protocol: str = (
            config.KAFKA_SECURITY_PROTOCOL if security_protocol is None else security_protocol
        )
        self._sasl_mechanism: str = (
            config.KAFKA_SASL_MECHANISM if sasl_mechanism is None else sasl_mechanism
        )

        # Lazily-created client; None until first publish while enabled.
        self._producer: Any = None
        self._init_lock = threading.Lock()
        self._closed = False

        # Per-prop monotonic revision counter (in-memory; see module docstring).
        self._revisions: Dict[str, int] = {}
        self._rev_lock = threading.Lock()

        if self._enabled:
            logger.info(
                "PropEventProducer enabled (topic=%r, bootstrap=%r, protocol=%r, sasl=%r)",
                self._topic,
                self._bootstrap_servers,
                self._security_protocol,
                self._sasl_mechanism,
            )
        else:
            logger.info("PropEventProducer disabled (KAFKA_ENABLED is false) — no-op mode.")

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------
    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def topic(self) -> str:
        return self._topic

    # ------------------------------------------------------------------
    # Revision management
    # ------------------------------------------------------------------
    def next_revision(self, prop_id: str) -> int:
        """Return the next monotonically-increasing revision for ``prop_id``.

        Starts at 1 for a prop's first event. Thread-safe.
        """
        with self._rev_lock:
            nxt = self._revisions.get(prop_id, 0) + 1
            self._revisions[prop_id] = nxt
            return nxt

    # ------------------------------------------------------------------
    # Lazy client construction (import happens ONLY here, when enabled)
    # ------------------------------------------------------------------
    def _ensure_producer(self) -> Any:
        """Create the underlying confluent_kafka.Producer on first use.

        Imports ``confluent_kafka`` lazily. Returns ``None`` if construction fails
        (the caller treats a ``None`` client as a no-op).
        """
        if self._producer is not None:
            return self._producer
        with self._init_lock:
            if self._producer is not None:
                return self._producer
            # Lazy import — never at module top-level, never when disabled.
            from confluent_kafka import Producer  # type: ignore

            conf: Dict[str, Any] = {
                "bootstrap.servers": self._bootstrap_servers,
                "security.protocol": self._security_protocol,
                "sasl.mechanisms": self._sasl_mechanism,
                "sasl.username": self._api_key,
                "sasl.password": self._api_secret,
                # Reasonable, robust defaults for a Confluent Cloud client.
                "client.id": "artifact-agent-system",
                "acks": "all",
                "enable.idempotence": True,
                "retries": 5,
                "linger.ms": 20,
            }
            self._producer = Producer(conf)
            logger.info("confluent_kafka.Producer initialised for topic %r", self._topic)
            return self._producer

    def _delivery_callback(self, err: Any, msg: Any) -> None:
        """Async delivery report callback: log failures, debug-log successes."""
        if err is not None:
            logger.error(
                "Kafka delivery FAILED for prop-event (topic=%s): %s",
                self._topic,
                err,
            )
            return
        try:
            key = msg.key()
            key_str = key.decode("utf-8") if isinstance(key, (bytes, bytearray)) else key
            logger.debug(
                "Kafka delivery OK: topic=%s partition=%s offset=%s key=%s",
                msg.topic(),
                msg.partition(),
                msg.offset(),
                key_str,
            )
        except Exception:  # pragma: no cover - purely diagnostic
            logger.debug("Kafka delivery OK (details unavailable).")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def publish(self, event: PropEvent) -> None:
        """Publish a :class:`PropEvent`, keyed by ``prop_id``.

        Non-blocking (async delivery via the producer's background thread). A
        strict no-op when disabled or already closed. NEVER raises into callers —
        all errors are caught and logged so the main request path is unaffected.
        """
        if not self._enabled or self._closed:
            return
        try:
            producer = self._ensure_producer()
            if producer is None:
                return
            producer.produce(
                topic=self._topic,
                key=event.key_bytes(),
                value=event.to_json_bytes(),
                on_delivery=self._delivery_callback,
            )
            # Serve delivery callbacks without blocking.
            producer.poll(0)
            logger.debug(
                "Queued prop-event: prop_id=%s status=%s revision=%s",
                event.prop_id,
                event.status.value,
                event.revision,
            )
        except BufferError as exc:
            # Local queue full — try to drain briefly, then give up (no raise).
            logger.warning("Kafka local queue full for prop %s: %s", event.prop_id, exc)
            try:
                self._producer.poll(1)  # type: ignore[union-attr]
            except Exception:
                pass
        except Exception as exc:  # includes ImportError if the lib is absent
            logger.error(
                "Failed to publish prop-event for prop %s (status=%s): %s",
                event.prop_id,
                getattr(event.status, "value", event.status),
                exc,
                exc_info=True,
            )

    def flush(self, timeout: float = 10.0) -> int:
        """Block until outstanding messages are delivered or ``timeout`` elapses.

        Returns the number of messages still in the queue (0 == all delivered).
        No-op returning 0 when no client has been created. Never raises.
        """
        if self._producer is None:
            return 0
        try:
            remaining = self._producer.flush(timeout)
            return int(remaining) if remaining is not None else 0
        except Exception as exc:
            logger.error("Kafka flush failed: %s", exc, exc_info=True)
            return -1

    def close(self) -> None:
        """Flush and release the client. Idempotent; safe to call when disabled."""
        if self._closed:
            return
        self._closed = True
        if self._producer is None:
            return
        try:
            self._producer.flush(10.0)
            logger.info("PropEventProducer closed (flushed pending prop-events).")
        except Exception as exc:
            logger.error("Error during PropEventProducer.close(): %s", exc, exc_info=True)
        finally:
            self._producer = None


# ---------------------------------------------------------------------------
# Process-wide singleton
# ---------------------------------------------------------------------------
_singleton: Optional[PropEventProducer] = None
_singleton_lock = threading.Lock()


def get_producer() -> PropEventProducer:
    """Return the shared, process-wide :class:`PropEventProducer` singleton."""
    global _singleton
    if _singleton is None:
        with _singleton_lock:
            if _singleton is None:
                _singleton = PropEventProducer()
    return _singleton


def reset_producer_singleton() -> None:
    """Testing helper: drop the cached singleton so the next call rebuilds it."""
    global _singleton
    with _singleton_lock:
        if _singleton is not None:
            _singleton.close()
        _singleton = None


def publish_prop_event(prop: Any, *, status: Any = None) -> None:
    """Publish a lifecycle event for ``prop`` via the shared producer.

    This is the single entry point used by the store/state-machine layer on every
    prop status transition. It is a strict no-op when Kafka is disabled (returns
    before doing any work — and, crucially, before importing ``confluent_kafka``),
    and it NEVER raises: any failure is caught and logged so the caller's control
    flow is never affected.

    Args:
        prop:   a ``store.models.PropRecord`` (duck-typed: needs ``id``, ``status``,
                and optionally ``job_id``/``cost``/``flags``).
        status: optional explicit status override (internal ``PropStatus`` or a
                contract value); defaults to ``prop.status``.
    """
    try:
        producer = get_producer()
        if not producer.enabled:
            return
        prop_id = getattr(prop, "id", None)
        if not prop_id:
            logger.warning("Skipping prop-event publish: prop has no id.")
            return
        revision = producer.next_revision(prop_id)
        event = PropEvent.from_prop_record(prop, revision=revision, status=status)
        producer.publish(event)
    except Exception as exc:  # defensive: this helper must never raise
        logger.error("publish_prop_event failed (ignored): %s", exc, exc_info=True)
