# Session Log — Artifact Agent System Build

**Repo:** github.com/postleo/artifact  
**Branch:** main  
**Session date:** 2025 (current workspace session)  
**Engineer:** Bob (IBM AI Software Engineer)

---

## Overview

This log records all work completed in the current workspace session for the **Artifact Agent System** — a production-grade Google ADK / Vertex AI agent pipeline for AI-generated property marketing assets.

---

## Chronological Work Log

### Phase 1 — Spec Ingestion & Understanding

**Files read:**
- `01-project-spec (1).md` — product overview, prop lifecycle, DAM integration
- `02-agent-system-spec (1).md` — agent architecture, state machine, gate ordering, cost model
- `03-agent-build-prompt-ibm-bob.md` — build prompt, test requirements, deployment targets

**Key decisions extracted:**
- State machine: `PENDING → OPTIONS_READY → SELECTED → ASSETS_GENERATING → ASSETS_READY → APPROVED → PUBLISHED`
- Two AI image tiers: Nano Banana 2 (`gemini-3.1-flash-image`) and Nano Banana Pro (`gemini-3-pro-image`)
- Budget guardrail: hard cap per property, abort if exceeded
- Safety gate: Cloud Vision SafeSearch + Gemini vision — must pass before ASSETS_READY
- Idempotency: duplicate create/transition calls must be safe (no double-charge)
- Firestore for prod persistence; InMemoryRepository for tests
- FastAPI + Uvicorn for the HTTP layer
- Google ADK for agent orchestration

---

### Phase 2 — Workspace Organisation

Created top-level directory structure:
```
agent-system/
├── api/
├── agent/
├── store/
├── gen/
├── integrations/
├── tests/
docs/
```

---

### Phase 3 — Core Build (agent-system/)

#### `config.py`
- Pydantic `Settings` model reading all env vars
- Keys: `FIRESTORE_PROJECT`, `KAFKA_ENABLED`, `KAFKA_BOOTSTRAP`, `BUDGET_USD_DEFAULT`, `GCS_BUCKET`, `DAM_WEBHOOK_URL`, `NOTIFICATION_WEBHOOK_URL`, `GOOGLE_CLOUD_PROJECT`, `VERTEX_LOCATION`

#### `store/models.py`
- `PropStatus` enum (7 states)
- `Prop` dataclass with full field set including `budget_used_usd`, `selected_option_id`, `asset_urls`, `safety_passed`
- `PropOption` dataclass

#### `store/repository.py`
- `PropRepository` abstract base
- `FirestoreRepository` — Firestore collection `agent_props`
- `InMemoryRepository` — dict-backed, thread-safe with `asyncio.Lock`
- `publish_prop_event` wired at every `create()` and `transition()` — strict no-op when `KAFKA_ENABLED=false`

#### `agent/orchestrator.py`
- `PropOrchestrator` — central coordinator
- Routes by current state to correct sub-agent
- Handles transition locking + idempotency checks

#### `agent/options_generator.py`
- Calls Gemini to generate 3 creative brief options per property
- Writes options to store; transitions prop to `OPTIONS_READY`

#### `agent/selection_recorder.py`
- Validates selected option exists
- Records `selected_option_id`; transitions to `SELECTED`

#### `agent/asset_finisher.py`
- Calls `gen/image_jobs.py` for image generation
- Runs safety gate after generation
- Transitions to `ASSETS_READY` on pass, `PENDING` (retry) on fail
- Enforces budget cap — aborts and records reason if exceeded

#### `agent/platform_adapter.py`
- 3-tier adapter: `StubAdapter` → `LocalADKAdapter` → `AgentEngineAdapter`
- Selected at startup via env var `PLATFORM_TIER`

#### `agent/safety_service.py`
- `SafetyService.check(image_bytes)` — real Cloud Vision SafeSearch
- Falls back to Gemini vision check if Cloud Vision unavailable
- Returns `SafetyResult(passed: bool, reason: str)`

#### `gen/image_jobs.py`
- `generate_images(brief, tier)` — calls Gemini `generate_content` with `response_modalities=["IMAGE"]`
- Model IDs: `NB2=gemini-3.1-flash-image`, `NBPro=gemini-3-pro-image`
- Returns list of `ImageResult(url, cost_usd)`

#### `gen/cost_service.py`
- `CostService.record(prop_id, amount_usd)` — accumulates cost
- `CostService.check_budget(prop_id)` — raises `BudgetExceededError` if over cap

#### `api/app.py`, `api/routes.py`, `api/schemas.py`, `api/storage.py`, `api/dependencies.py`
- FastAPI app with lifespan context manager
- Routes: `POST /props`, `GET /props/{id}`, `POST /props/{id}/select`, `POST /props/{id}/advance`, `GET /health`
- Pydantic schemas for all request/response bodies
- GCS signed-URL upload helper in `storage.py`
- Dependency injection for repository + orchestrator

#### `integrations/dam_adapter.py`
- `DAMAdapter.publish(prop)` — HTTP POST to DAM webhook with asset URLs
- Fire-and-forget, logs errors, never raises

#### `integrations/notifications.py`
- `notify(prop, event)` — HTTP POST to notification webhook
- Triggered on `ASSETS_READY` and `PUBLISHED`

#### `integrations/scheduled_check.py`
- `run_scheduled_checks()` — async background task
- Polls for stalled props and re-queues
- Fixed `timezone` import bug (was `from datetime import timezone` — needed `import datetime; datetime.timezone.utc`)

---

### Phase 4 — Tests (21/21 passing)

**Files:** `tests/test_state_machine.py`, `tests/test_gate_ordering.py`, `tests/test_idempotency.py`, `tests/test_budget_guardrail.py`

All tests use `InMemoryRepository` + mocked external calls.  
All async tests decorated with `@pytest.mark.asyncio` (strict mode).

| Test file | Tests | Result |
|-----------|-------|--------|
| test_state_machine.py | 6 | ✅ all pass |
| test_gate_ordering.py | 5 | ✅ all pass |
| test_idempotency.py | 5 | ✅ all pass |
| test_budget_guardrail.py | 5 | ✅ all pass |
| **Total** | **21** | **✅ 21/21** |

---

### Phase 5 — Bug Fixes During Build

1. **`timezone` import** in `scheduled_check.py` — fixed incorrect import path
2. **Model IDs** — corrected from speculative names to confirmed Gemini image model IDs:
   - `NB2`: `gemini-3.1-flash-image`
   - `NBPro`: `gemini-3-pro-image`
3. **Image generation API** — corrected from `generate_images()` to `generate_content()` with `response_modalities=["IMAGE"]` (Gemini SDK v2 pattern)
4. **asyncio_mode STRICT** — added `@pytest.mark.asyncio` to every async test function

---

### Phase 6 — Dockerisation & Deploy Config

- `Dockerfile` — multi-stage, Python 3.12-slim, non-root user
- `requirements.txt` — pinned deps including `google-adk`, `google-cloud-firestore`, `google-cloud-vision`, `fastapi`, `uvicorn`, `kafka-python`, `httpx`
- `README.md` — setup, env vars, local run, test, deploy instructions

---

### Phase 7 — Git Operations

**Repo created:** `github.com/postleo/artifact` (initially `artifact-agent`, renamed)

**Commits pushed to `main`:**
1. `feat: initial agent-system scaffold` — config, models, repository
2. `feat: agent pipeline` — orchestrator, sub-agents, platform adapter, safety service
3. `feat: API layer` — FastAPI app, routes, schemas, storage, dependencies
4. `feat: integrations + tests` — DAM adapter, notifications, scheduled check, 21 tests
5. `feat: docker + docs` — Dockerfile, requirements.txt, README.md
6. `fix: asyncio strict mode + model IDs + image generation API` — test fixes + model corrections

All commits include `Co-authored-by: Bob <bob@ibm.com>`.

---

### Phase 8 — Web App (web-app branch)

Built a plain-JS / Node.js web app for the Artifact Agent System UI:

```
web-app/
├── client/          ← Vanilla HTML/CSS/JS frontend
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server/          ← Node/Express backend + SSE proxy
│   ├── index.js
│   ├── routes.js
│   └── package.json
└── render.yaml      ← Render free-tier deploy config
```

**Features:**
- Property creation form
- Real-time status updates via SSE
- Option selection UI
- Asset gallery on completion
- Render.yaml wiring both services (agent-system + web-app) for one-click deploy

**Branch:** `web-app` — pushed to `postleo/artifact`

---

### Phase 9 — AGENTS.md Files

Created guidance files for Bob AI modes:

| File | Purpose |
|------|---------|
| `AGENTS.md` (root) | Top-level agent guidance for the whole repo |
| `.bob/rules-agent/AGENTS.md` | Coding-mode rules — how to write/modify code in this repo |
| `.bob/rules-ask/AGENTS.md` | Ask-mode context — architecture overview, key patterns |
| `.bob/rules-plan/AGENTS.md` | Plan-mode constraints — ADR decisions, non-negotiables |

---

### Phase 10 — Spec Compliance Audit

Ran full 13-point checklist audit against both spec files.

**Result: 13/13 ✅ all items compliant**

Audit report saved to `docs/spec-compliance-audit.md` and `docs/checklist-audit-summary.md`.

---

## Environment Notes

- Python 3.12, pytest with `asyncio_mode = strict`
- All secrets in `/workspaces/workbase-1/.env` — never printed or logged
- Firestore collection for agent-system: `agent_props` (not `props`, to avoid collision with app-backend's `app_props`)
- `KAFKA_ENABLED=false` → Kafka calls are strict no-ops (no error raised)
- `VITE_BACKEND_URL` baked at build time — cannot change at runtime
- Platform adapter tier selected via `PLATFORM_TIER` env var: `stub` | `local` | `agent_engine`

---

## Files Created This Session

```
/workspaces/workbase-1/
├── AGENTS.md
├── .bob/
│   ├── session-log.md                  ← this file
│   ├── reports/
│   │   ├── build-report.md
│   │   └── audit-report.md
│   ├── rules-agent/AGENTS.md
│   ├── rules-ask/AGENTS.md
│   └── rules-plan/AGENTS.md
├── agent-system/
│   ├── config.py
│   ├── api/app.py
│   ├── api/routes.py
│   ├── api/schemas.py
│   ├── api/storage.py
│   ├── api/dependencies.py
│   ├── agent/orchestrator.py
│   ├── agent/options_generator.py
│   ├── agent/selection_recorder.py
│   ├── agent/asset_finisher.py
│   ├── agent/platform_adapter.py
│   ├── agent/safety_service.py
│   ├── store/models.py
│   ├── store/repository.py
│   ├── gen/image_jobs.py
│   ├── gen/cost_service.py
│   ├── integrations/dam_adapter.py
│   ├── integrations/notifications.py
│   ├── integrations/scheduled_check.py
│   ├── tests/test_state_machine.py
│   ├── tests/test_gate_ordering.py
│   ├── tests/test_idempotency.py
│   ├── tests/test_budget_guardrail.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
```

---

*Log generated by Bob — IBM AI Software Engineer*
