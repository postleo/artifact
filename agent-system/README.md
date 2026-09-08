# Artifact — Agent System

The **Artifact Agent System** is a standalone Python service that takes a single film hero prop
from a brief to a build-ready asset package in three stages with two human approval gates.

---

## Architecture

```
api/           FastAPI routes + schemas + signed-URL helper
agent/         Orchestrator + 3 sub-agents + platform adapter + safety service
store/         Pydantic models + repository interface + Firestore impl + in-memory stub
gen/           Image job runner (Nano Banana 2 / Pro via Gen AI SDK) + cost service
integrations/  DAM/asset-library adapter + notification adapter + scheduled check
config.py      ALL model IDs, budgets, SLAs — one file, no hard-coded values
tests/         Unit tests: state machine, gate ordering, idempotency, budget guardrail
Dockerfile     Container image for Cloud Run (scale-to-zero)
```

---

## Prerequisites

- Python 3.11+
- A Google Cloud project with:
  - Firestore enabled (or set `USE_STUBS=true` for local dev)
  - Cloud Storage bucket
  - Secret Manager (for production credentials)
  - Application Default Credentials (`gcloud auth application-default login`)

---

## Local development (stub mode — no GCP required)

```bash
cd agent-system

# Create a virtual environment.
python -m venv .venv && source .venv/bin/activate

# Install dependencies.
pip install -r requirements.txt

# Run with all external services stubbed.
USE_STUBS=true uvicorn api.app:app --reload --port 8080
```

The API will be available at `http://localhost:8080`.
Swagger UI: `http://localhost:8080/docs`.

---

## 🎨 Interactive CLI Mode (Standalone/No-Server Utility)

In addition to running as a REST API server, you can execute the entire hero prop design pipeline interactively in your terminal! This tool is 100% self-contained and allows you to test briefs, review concepts, make gates selections, and compile specs offline.

To start the interactive CLI, run:
```bash
# Set stub mode to true to run offline with local stubs
USE_STUBS=true python cli.py
```
This script will guide you through entering the prop's brief, generating draft concepts, picking an option, and writing build-ready specification dossiers in a beautiful terminal dashboard.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `USE_STUBS` | No | Set `true` for local dev — uses in-memory DB and stub adapters |
| `GCP_PROJECT_ID` | Yes (prod) | Google Cloud project ID |
| `GCP_REGION` | No | GCP region (default: `us-central1`) |
| `GCS_BUCKET_NAME` | Yes (prod) | Cloud Storage bucket for generated images |
| `GOOGLE_API_KEY` | Yes (prod) | Google Gen AI SDK key (from Secret Manager) |
| `GEMINI_FAST_MODEL` | No | Fast reasoning model ID (default: `gemini-2.0-flash`) |
| `GEMINI_PRO_MODEL` | No | Strong reasoning model ID (default: `gemini-2.5-pro`) |
| `NB2_MODEL` | No | Nano Banana 2 = Gemini 3.1 Flash Image (default: `gemini-3.1-flash-image`) |
| `NBPRO_MODEL` | No | Nano Banana Pro = Gemini 3 Pro Image (default: `gemini-3-pro-image`) |
| `DEFAULT_BUDGET_CEILING_USD` | No | Per-prop budget ceiling in USD (default: `5.0`) |
| `OPTIONS_REVIEW_SLA_HOURS` | No | SLA before overdue-review alert (default: `48`) |
| `SELECTION_SLA_HOURS` | No | SLA before overdue-finalize alert (default: `24`) |
| `API_BEARER_TOKEN` | No | Bearer token for API auth (omit to disable in dev) |
| `DAM_API_URL` | Yes (prod) | Asset library / DAM base URL |
| `DAM_API_KEY` | Yes (prod) | DAM API key (from Secret Manager) |
| `SENDGRID_API_KEY` | No | SendGrid key for email notifications |
| `NOTIFICATION_FROM_EMAIL` | No | Sender email address |
| `NOTIFICATION_TO_EMAIL` | No | Recipient email address |
| `NOTIFICATION_WEBHOOK_URL` | No | Slack/Teams incoming webhook URL |

> **Never hard-code secrets.** In production, load all credentials from Google Secret Manager
> and inject them as environment variables via Cloud Run's secret integration.

---

## Running tests

```bash
cd agent-system
pip install -r requirements.txt
pytest tests/ -v
```

All tests run with in-memory stubs — no GCP credentials required.

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/props` | Create a prop from a brief; start Stage 1 |
| `GET` | `/v1/props/{id}` | Full prop record |
| `GET` | `/v1/props/{id}/options` | Concept options with signed image URLs |
| `POST` | `/v1/props/{id}/selection` | Record chosen option + who + why (Gate 2) |
| `POST` | `/v1/props/{id}/finalize` | Start Stage 3 (final asset generation) |
| `GET` | `/v1/props/{id}/assets` | Final asset package (signed URLs) |
| `POST` | `/v1/props/{id}/export` | Push package to DAM / asset library |
| `GET` | `/v1/props/{id}/events` | SSE status stream |
| `GET` | `/v1/healthz` | Health / readiness check |
| `POST` | `/v1/internal/scheduled-check` | Cloud Scheduler trigger — scan for issues |

Long operations (`POST /props`, `POST /finalize`) return `HTTP 202` with a `job_id`.
Progress arrives via `GET .../events` (Server-Sent Events).
All money-spending POSTs accept an `Idempotency-Key` header.

---

## Deploying to Google Cloud (Cloud Run — scale to zero)

### 1. Build and push the container

```bash
cd agent-system

# Set your project and region.
export PROJECT_ID=YOUR_GCP_PROJECT_ID
export REGION=us-central1
export IMAGE=gcr.io/$PROJECT_ID/artifact-agent:latest

gcloud auth configure-docker
docker build -t $IMAGE .
docker push $IMAGE
```

### 2. Deploy the API service

```bash
gcloud run deploy artifact-agent \
  --image $IMAGE \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=$PROJECT_ID,GCS_BUCKET_NAME=artifact-assets \
  --set-secrets GOOGLE_API_KEY=artifact-google-api-key:latest,API_BEARER_TOKEN=artifact-api-token:latest \
  --set-env-vars NB2_MODEL=gemini-3.1-flash-image,NBPRO_MODEL=gemini-3-pro-image \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi
```

> `--min-instances 0` enables scale-to-zero. Cold starts (~1–2 s) are acceptable for this
> internal tool.

### 3. Set up Cloud Scheduler for the scheduled check

```bash
# Create a job that calls the scheduled-check endpoint every 30 minutes.
gcloud scheduler jobs create http artifact-scheduled-check \
  --location $REGION \
  --schedule "*/30 * * * *" \
  --uri "https://YOUR_CLOUD_RUN_URL/v1/internal/scheduled-check" \
  --http-method POST \
  --oidc-service-account-email YOUR_SCHEDULER_SA@$PROJECT_ID.iam.gserviceaccount.com \
  --headers "Content-Type=application/json"
```

### 4. Infrastructure checklist

- [ ] Firestore database created in Native mode
- [ ] Cloud Storage bucket `artifact-assets` created
- [ ] Secrets created in Secret Manager:
  - `artifact-google-api-key`
  - `artifact-nb2-model` (real Gemini image model ID)
  - `artifact-nbpro-model` (real Gemini image model ID)
  - `artifact-api-token`
  - `artifact-dam-api-url` + `artifact-dam-api-key` (if DAM is live)
- [ ] Cloud Run service account has roles: `roles/datastore.user`, `roles/storage.objectAdmin`,
  `roles/secretmanager.secretAccessor`

---

## Prop state machine

```
draft
  └─▶ generating_options ──▶ awaiting_options_review
                                      └─▶ selection_confirmed
                                                └─▶ generating_final ──▶ assets_ready ──▶ exported
failed_options (retryable)
failed_final   (retryable)
failed_export  (retryable)
budget_exceeded (resume after approval)
```

---

## Image Model Strategy & Resolution Scaling

- **Concept Draft Options** (minor flows) are generated using the **Nano Banana 2** model at draft resolution for rapid, high-speed iteration.
- **Final Hero Assets** (key flows) are generated using the **Nano Banana Pro** model at full, high-fidelity resolution—unlocked specifically for the *selected* prop design.
- Image results are cached by `prop_id/option_id`; retries reuse prior images.
- Each prop carries a `budget_ceiling_usd` parameter; generation automatically pauses if cumulative operations exceed this ceiling, requiring explicit crew approval to continue.
- Cumulative resource usage indicators are surfaced directly in the Studio status board to allow the team to monitor project workloads in real time.

---

## Model IDs

| Role | Model ID | Notes |
|------|----------|-------|
| Fast reasoning | `gemini-2.0-flash` | Orchestration, parsing, brief writing |
| Strong reasoning | `gemini-2.5-pro` | Hard reasoning only, escalated selectively |
| Concept draft images (Nano Banana 2) | `gemini-3.1-flash-image` | Gemini 3.1 Flash Image — fast draft concept options (minor jobs) |
| Final hero images (Nano Banana Pro) | `gemini-3-pro-image` | Gemini 3 Pro Image — high-fidelity final assets (main jobs) |

All IDs default-coded in `config.py` and overridable via environment variables.
The image models are **Nano Banana** (Gemini image) models invoked via
`client.models.generate_content` with `response_modalities=["IMAGE"]`; they are not
Imagen models and are not called through `generate_images`.
