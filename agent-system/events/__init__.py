"""
events/ — the prop lifecycle event backbone (producer side).

This package publishes prop status-transition events to a Confluent/Kafka topic
using a shared event contract. It is entirely feature-flagged behind the
``KAFKA_ENABLED`` setting: when disabled (the default), everything here is a
strict no-op and the ``confluent_kafka`` client library is never imported.

Public surface:
    - :class:`events.schema.PropEventStatus`  — the contract status enum.
    - :class:`events.schema.PropEvent`         — the wire message model.
    - :class:`events.producer.PropEventProducer` — the Kafka producer wrapper.
    - :func:`events.producer.get_producer`       — process-wide singleton accessor.
    - :func:`events.producer.publish_prop_event` — convenience publish helper used
      by the store/state-machine layer on every transition.
"""

from events.schema import PropEvent, PropEventStatus  # noqa: F401

__all__ = ["PropEvent", "PropEventStatus"]
