# Prop Lifecycle Event Backbone (Confluent / Kafka)

A feature-flagged, production-grade event backbone that streams **prop lifecycle
events** from the agent-system (producer) to the app-backend (consumer), which
updates Firestore and fans events out to browsers over SSE.

**Default: OFF.** When `KAFKA_ENABLED` is not `true`, nothing changes — the Kafka
client libraries are never imported, no cluster is contacted, and the existing
SSE-proxy path (`GET /api/props/:id/events`) behaves exactly as before.

```
agent-system                         Confluent Cloud                app-backend
┌───────────────────────┐  produce   ┌───────────────────┐ consume ┌────────────────────────┐
│ store/repository.py    ├───────────▶│ topic:            ├────────▶│ events/kafkaConsumer.ts │
│  create()/transition() │  key=      │ artifact.prop.    │ group=  │  → Firestore (Prop)     │
│  → publish_prop_event  │  prop_id   │ events            │ backend │  → events/sseHub.ts     │
│ events/producer.py     │            │ (Schema Registry) │         │  → GET /api/props/:id/live
└───────────────────────┘            └───────────────────┘         └────────────────────────┘
```

## Shared event contract

- **Topic:** `KAFKA_TOPIC` (default `artifact.prop.events`)
- **Key:** `prop_id` (UTF-8 string) — preserves per-prop ordering across partitions.
- **Value (UTF-8 JSON):**
  ```json
  {
    "schema_version": 1,
    "prop_id": "prop_abc123",
    "status": "options_ready",
    "job_id": "job_..."|null,
    "cost": { "nb2_images": 2, "est_usd": 0.13 }|null,
    "flags": { "trademark_risk": "none" }|null,
    "revision": 3,
    "timestamp": "2026-09-09T06:00:00Z",
    "source": "agent-system"
  }
  ```
- **status** ∈ `draft, generating_options, options_ready, selection_confirmed,
  generating_final, assets_ready, exported, failed_options, failed_final,
  failed_export, budget_exceeded`.
- **revision:** monotonically increasing per `prop_id` (starts at 1). The consumer
  drops stale/replayed revisions so out-of-order delivery can't clobber newer state.

## Components

**Agent (Python) — producer**
- `agent-system/events/schema.py` — `PropEvent`, `PropEventStatus`, exact JSON
  serialization + agent→wire status mapping.
- `agent-system/events/producer.py` — `PropEventProducer` (lazy `confluent_kafka`
  init, thread-safe, async delivery + callbacks, `flush`/`close`, never raises),
  process singleton, and `publish_prop_event(prop, status=...)`.
- Wired in `agent-system/store/repository.py` at `create()` and every
  `transition()` — the single choke point all status changes flow through.
- Lifecycle managed in `agent-system/api/app.py` (init on startup, flush on shutdown).

**Backend (Node/TS) — consumer + fan-out**
- `app-backend/src/events/kafkaConsumer.ts` — kafkajs consumer (lazy dynamic
  import), validates events, upserts the Firestore `Prop` mirror, broadcasts to SSE.
  Crash-auto-restart; connection failures never block server startup.
- `app-backend/src/events/sseHub.ts` — in-process SSE client registry (per-prop +
  wildcard) with automatic disconnect cleanup.
- New endpoint `GET /api/props/:id/live` (behind existing JWT auth) — the
  Kafka-driven live stream. The legacy `/api/props/:id/events` proxy is untouched.
- Started from `src/index.ts` only when enabled; graceful `SIGTERM`/`SIGINT` stop.

## Configuration

Identical env var names in both services (store secrets in Secret Manager, not the bundle):

| Var | Default | Notes |
|---|---|---|
| `KAFKA_ENABLED` | `false` | Master switch. Off = full no-op. |
| `KAFKA_BOOTSTRAP_SERVERS` | — | Confluent Cloud bootstrap endpoint |
| `KAFKA_API_KEY` | — | Confluent Cloud API key (SASL username) |
| `KAFKA_API_SECRET` | — | Confluent Cloud API secret (SASL password) |
| `KAFKA_TOPIC` | `artifact.prop.events` | |
| `KAFKA_SECURITY_PROTOCOL` | `SASL_SSL` | |
| `KAFKA_SASL_MECHANISM` | `PLAIN` | Confluent Cloud API keys use PLAIN |
| `KAFKA_CONSUMER_GROUP_ID` | `artifact-backend-prop-events` | backend only |

## Enabling it (Confluent Cloud)

1. Create a **Basic** cluster in `us-central1` (GCP) and a topic `artifact.prop.events`
   (e.g., 6 partitions). Create an API key/secret.
2. Store the key/secret in Secret Manager and bind on both Cloud Run services:
   ```bash
   # backend + agent
   gcloud run services update artifact-backend --region us-central1 \
     --update-env-vars KAFKA_ENABLED=true,KAFKA_BOOTSTRAP_SERVERS=<bootstrap>,KAFKA_CONSUMER_GROUP_ID=artifact-backend-prop-events \
     --update-secrets KAFKA_API_KEY=confluent-api-key:latest,KAFKA_API_SECRET=confluent-api-secret:latest
   gcloud run services update artifact-agent --region us-central1 \
     --update-env-vars KAFKA_ENABLED=true,KAFKA_BOOTSTRAP_SERVERS=<bootstrap> \
     --update-secrets KAFKA_API_KEY=confluent-api-key:latest,KAFKA_API_SECRET=confluent-api-secret:latest
   ```
   (The agent image must have `confluent-kafka` installed — it's in `requirements.txt`.)
3. Point a browser/EventSource at `GET /api/props/:id/live` (with the JWT) and create a
   prop; lifecycle events flow agent → Kafka → backend → Firestore + SSE.

## Verification status

- Backend `npm run build` (tsc): **clean**.
- Agent `USE_STUBS=true pytest tests/`: **34 passed** (23 existing + 11 new); confirmed the
  disabled path does **not** import `confluent_kafka`.
- Live end-to-end requires a provisioned Confluent Cloud cluster + credentials (not yet
  created). Everything else is built and unit-verified.

## Known limitations (prototype)

- **Revision counter** is in-memory per process (resets on restart, not coordinated across
  instances). Production should source `revision` from a persistent per-prop version.
- The consumer creates a **minimal** mirror record if it sees an event for an unknown prop;
  the REST sync path backfills richer detail (options, final assets, brief) on next fetch.
- Cost note: Confluent Basic is ~$0 at this volume but is an always-on service (does not
  cold-start to zero like Cloud Run/Firestore). Delete the cluster when not in use.
