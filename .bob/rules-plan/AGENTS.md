# AGENTS.md — Plan mode

This file provides guidance to agents when working with code in this repository.

## Non-obvious architectural constraints

- **Three services share one Firestore database** but use different collections: agent-system uses `props` + `idempotency_keys`; app-backend uses `app_props`, `profiles`, `studio_states`. Naming collisions are a risk when adding new collections.
- **The agent-system is the source of truth for prop state** — app-backend mirrors it in `app_props`. The mirror is updated via Kafka events (when enabled) or by the backend re-fetching from the agent REST API on status change. Never treat the backend mirror as authoritative.
- **`start_stage*` and `run_stage*_pipeline` are intentionally separated** so the API returns immediately (job handle) while the pipeline runs in the background. Any new long operation must follow this pattern — do not make `start_*` methods blocking.
- **`confluent_kafka` (Python) and `kafkajs` (Node) are both optional at runtime** — the entire Kafka path is behind `KAFKA_ENABLED`. Adding any new Kafka dependency must maintain this strict no-import-when-disabled guarantee.
- **`AgentEngineAdapter` → `LocalADKAdapter` → `StubAgentPlatformAdapter`** is the fallback chain in `api/dependencies.py`. Any new agent invocation path must plug into this chain, never bypass it.
- **Firestore transactions in `FirestorePropRepository.transition()`** use the `@self._db.transaction` decorator pattern — the transaction callback must be synchronous-compatible with the Firestore client's async transaction API.
- **`VITE_BACKEND_URL` is baked at build time**, so the frontend and backend cannot be deployed independently without a frontend rebuild. Plan deployments accordingly.
- **Kafka revision counter is in-memory and resets on restart** — it is not coordinated across multiple agent-system instances. Any design requiring reliable event ordering across restarts must source revision from Firestore.
- **CORS `allow_credentials` is silently `False` when `CORS_ALLOW_ORIGINS=*`** — browsers reject wildcard + credentials. Production must set explicit origins, not `*`.
- **The `app/` Dockerfile bakes `VITE_BACKEND_URL` as a build-arg via `cloudbuild.yaml`** — Cloud Build is the production build path, not local Docker builds, because the URL is environment-specific.
