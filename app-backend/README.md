# Artifact App Backend API

This is the standalone **App Backend API** for the Artifact Onboarding and Studio application. It provides database persistence (SQLite locally, PostgreSQL in production) and acts as a secure, smart proxy to coordinate state and operations with the standalone **Artifact Agent System**.

---

## 🛠️ Features
1. **Persistent SQLite/Postgres DB:** Keeps track of your team's `Production Profile` and the full list of `PropItems` in a structured database, replacing fragile `localStorage`.
2. **Seamless Agent System Proxying:** Intermediates and relays requests securely to the Python Agent System (creating props, selections, finalizations, and exports).
3. **Smart State Synchronizer:** Intercepts real-time events on the Server-Sent Events (SSE) `/events` stream to trigger background, transaction-safe updates from the Agent System and automatically update the local database.

---

## 🚀 How to Run Locally

### 1. Configure Environment variables
Copy the `.env.example` to `.env`:
```bash
cp .env.example .env
```

Review or edit `.env` parameters if needed:
- `PORT=5000` (The Express server port)
- `AGENT_SYSTEM_API_URL=http://localhost:8080/v1` (URL of the standalone agent system)

---

### 2. Install Dependencies
Make sure you have Node.js / Bun installed, then run:
```bash
npm install
# or
bun install
```

---

### 3. Run Development Server
Start the Express server with live TypeScript reloading:
```bash
npm run dev
# or
bun run dev
```

---

### 4. Build & Start for Production
Compile TypeScript and start the production build:
```bash
npm run build
npm run start
```


---

## ☁️ Deploying to Google Cloud (Cloud Run + Cloud SQL)

The backend is the authoritative data store on GCP: **Cloud SQL for PostgreSQL**,
with the app running on **Cloud Run**. (Locally it falls back to SQLite.)

### 1. Create a Cloud SQL Postgres instance and database

```bash
gcloud sql instances create artifact-db --database-version=POSTGRES_15 \
  --tier=db-f1-micro --region=us-central1
gcloud sql databases create artifact --instance=artifact-db
gcloud sql users set-password postgres --instance=artifact-db --password=CHANGE_ME
```

### 2. Build and deploy to Cloud Run with the Cloud SQL connector

```bash
export PROJECT_ID=YOUR_GCP_PROJECT_ID
export REGION=us-central1
export INSTANCE=$PROJECT_ID:$REGION:artifact-db

gcloud builds submit --tag gcr.io/$PROJECT_ID/artifact-app-backend

gcloud run deploy artifact-app-backend \
  --image gcr.io/$PROJECT_ID/artifact-app-backend \
  --region $REGION --platform managed \
  --add-cloudsql-instances $INSTANCE \
  --set-env-vars NODE_ENV=production,INSTANCE_CONNECTION_NAME=$INSTANCE,PGDATABASE=artifact,PGUSER=postgres,APP_CORS_ORIGIN=https://YOUR_FRONTEND_URL,AGENT_SYSTEM_API_URL=https://YOUR_AGENT_URL/v1 \
  --set-secrets PGPASSWORD=artifact-db-password:latest,APP_API_TOKEN=artifact-app-token:latest,AGENT_SYSTEM_BEARER_TOKEN=artifact-api-token:latest
```

The app connects to Cloud SQL over the Unix socket at
`/cloudsql/$INSTANCE_CONNECTION_NAME` (mounted by `--add-cloudsql-instances`).
Set `APP_API_TOKEN` to require a bearer token on `/api`, and `APP_CORS_ORIGIN`
to your deployed frontend origin.
