# Artifact App Backend API

The standalone **App Backend API** for the Artifact Studio app. It provides **password → JWT auth**,
**serverless Firestore persistence**, and acts as a smart proxy to the **Artifact Agent System**.

---

## Features
1. **Auth:** `POST /api/login` verifies a shared password (`APP_ACCESS_PASSWORD`) and issues a
   short-lived HS256 **JWT** signed with `APP_JWT_SECRET`; middleware guards all `/api` routes.
   Leave both unset in local dev to disable auth.
2. **Firestore persistence:** production profile + prop slate live in Firestore (Native) —
   collections `app_profiles`, `app_props`, `app_studio_state`. No SQL, scales to zero.
3. **Agent proxy + sync-on-read:** relays create/select/finalize to the agent and, on
   `GET /api/props/:id`, refreshes the local mirror from the agent (mapped options + signed URLs).
4. **Live updates:** SSE at `GET /api/props/:id/live`; optional token-auth event webhook at
   `POST /hooks/prop-event` (push model — see the Confluent/event-backbone docs).

---

## Run locally
```bash
npm install
cp .env.example .env
#   Set GCP_PROJECT_ID=demo-artifact and FIRESTORE_EMULATOR_HOST=localhost:8085
#   (run `gcloud emulators firestore start --host-port=localhost:8085` in another terminal),
#   or point at a real Firestore. Leave APP_ACCESS_PASSWORD/APP_JWT_SECRET unset to disable auth.
npm run dev          # http://localhost:5000  (tsx watch)
# build + start:
npm run build && npm start
```

Key env: `PORT`, `GCP_PROJECT_ID`, `FIRESTORE_EMULATOR_HOST` (dev), `AGENT_SYSTEM_API_URL`
(default `http://localhost:8080/v1`), `APP_CORS_ORIGIN`, `APP_ACCESS_PASSWORD`, `APP_JWT_SECRET`,
`AGENT_SYSTEM_BEARER_TOKEN`, `APP_EVENT_WEBHOOK_TOKEN`.

---

## Deploy to Google Cloud (Cloud Run + Firestore)
Firestore is serverless — no database instance to provision. A source deploy preserves existing
env/secrets.

```bash
export PROJECT=YOUR_PROJECT REGION=us-central1
gcloud run deploy artifact-backend --source . --region $REGION --allow-unauthenticated \
  --min-instances 0 \
  --set-env-vars NODE_ENV=production,GCP_PROJECT_ID=$PROJECT,AGENT_SYSTEM_API_URL=https://YOUR_AGENT_URL/v1,APP_CORS_ORIGIN=https://YOUR_FRONTEND_URL \
  --set-secrets APP_ACCESS_PASSWORD=artifact-login-password:latest,APP_JWT_SECRET=artifact-jwt-secret:latest,AGENT_SYSTEM_BEARER_TOKEN=artifact-agent-token:latest
```

The runtime service account needs `roles/datastore.user` (Firestore) and
`roles/secretmanager.secretAccessor`. Data layer: [`src/db.ts`](/app-backend/src/db.ts),
[`src/models/`](/app-backend/src/models); routes/auth/webhook: [`src/index.ts`](/app-backend/src/index.ts).

> Note: the earlier Cloud SQL / Sequelize path has been replaced by serverless Firestore so the
> whole stack idles at ~$0.
