# AGENTS.md — Ask mode

This file provides guidance to agents when working with code in this repository.

## Non-obvious documentation context

- **`agent/adk/`** contains TWO separate ADK layers: `core.py` is a custom lightweight, offline-safe implementation used by the CLI and tests; `root_agent.py` / `subagents.py` use the real `google.adk` for Vertex AI Agent Engine deployment. They are not interchangeable.
- **`app-backend/` replaces the earlier plain-JS `web-app/`** (which is on the `web-app` branch). The `main` branch uses the full TypeScript app-backend with Firestore and Kafka.
- **`events/schema.py` is the shared Kafka wire contract** — it must stay in sync with `app-backend/src/events/kafkaConsumer.ts`. The only status mapping divergence: internal `awaiting_options_review` → wire `options_ready`.
- **`docs/kafka-event-backbone.md`** is the authoritative architecture doc for the Confluent/Kafka integration — covers enabling, contract, limitations, and known issues.
- **`handoff/sample-scripts/`** contains 3 fictional screenplays for pipeline demos — not tests or fixtures, just demo content.
- **`verification/gen_log.md`** is a live GCP deployment log — records what was actually verified end-to-end on Cloud Run.
- **`deploy/deploy_agent_engine.py`** deploys only the ADK root agent to Vertex AI — it does NOT deploy the FastAPI service (that's via `gcloud run deploy` or Cloud Build).
- **`app/src/services/artifactAgentClient.ts`** calls `app-backend` (not the agent-system directly) for screenplay analysis. The agent-system is only called by the backend.
- **The `app-backend` Dockerfile exposes port 8080**, not 5000 — Cloud Run rewrites `PORT`; `process.env.PORT` is used. Local dev uses 5000 via `.env`.
- **`app/nginx.conf`** rewrites all routes to `index.html` (SPA routing) and listens on port 8080 for Cloud Run.
