# Artifact — Agent System

Artifact takes a single film **hero prop** — the object a story depends on and the camera studies closely — from a short brief all the way to a **build-ready asset package**.

It runs three stages with two human approval gates:

```
Brief  ──▶  1. Concept Options  ──[gate]──▶  2. Selection  ──[gate]──▶  3. Final Assets  ──▶  Export
               N directions                   choose one,                turnaround, callouts,
               + rationale                    record why                 material spec, variants,
               (Nano Banana 2)                                           build spec
                                                                         (Nano Banana Pro)
```

---

## What this repo contains

```
agent-system/       Standalone Python service — the reasoning core
  api/              FastAPI routes, schemas, signed-URL helper, DI wiring
  agent/            Orchestrator + 3 sub-agents + platform adapter + safety service
  store/            Prop record models + Firestore repository + in-memory stub
  gen/              Image job runner (NB2 / NBPro) + cost service
  integrations/     DAM/asset-library adapter + notifications + scheduled check
  config.py         All model IDs, budgets, SLAs — one file
  Dockerfile        Cloud Run container (scale-to-zero)
  README.md         Local run + full GCP deploy guide

docs/
  spec-compliance-audit.md    Full §-by-§ audit against the agent system spec
  checklist-audit-summary.md  Acceptance checklist result (13/13 ✅)
```

---

## Quick start (local, no GCP needed)

```bash
cd agent-system
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run with all external services stubbed (in-memory DB, no cloud calls)
USE_STUBS=true uvicorn api.app:app --reload --port 8080
```

API available at `http://localhost:8080` · Swagger UI at `http://localhost:8080/docs`

---

## Run tests

```bash
cd agent-system
USE_STUBS=true pytest tests/ -v
# 21 passed
```

Tests cover: state machine · gate ordering · idempotency · budget guardrail

---

## Key design decisions

| Concern | Choice |
|---|---|
| Language | Python 3.11+ |
| API framework | FastAPI |
| Reasoning (fast) | `gemini-2.0-flash` |
| Reasoning (strong) | `gemini-2.5-pro` — escalated only for hard reasoning |
| Concept draft images | `gemini-3.1-flash-image` (Nano Banana 2 — cheap, low-res) |
| Final hero images | `gemini-3-pro-image` (Nano Banana Pro — high fidelity, seed-locked) |
| Database | Firestore (single source of truth) |
| Image storage | Cloud Storage — API returns signed URLs only, never raw bytes |
| Secrets | Environment / GCP Secret Manager — nothing hard-coded |
| Deployment | Cloud Run, scale-to-zero |

All external platforms (Gemini Agent Platform, image models, Firestore, DAM, notifications) are behind abstract adapter interfaces — swap or rename in one place.

---

## Deploy to Google Cloud

See [`agent-system/README.md`](agent-system/README.md) for the full step-by-step:
`gcloud run deploy` · Cloud Storage bucket · Firestore setup · Secret Manager · Cloud Scheduler for the scheduled check.
