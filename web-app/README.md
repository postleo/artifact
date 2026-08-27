# Artifact — Web App

React-style single-page app (plain JavaScript, plain CSS, no build step) that connects to the Artifact Agent System API and lets the team run a hero prop through the full pipeline.

---

## Stack

| Part | Tech |
|---|---|
| Backend | Node.js + Express — proxies agent API, serves static files |
| Frontend | Plain JavaScript + plain CSS (no framework, no bundler) |
| Hosting | Render free tier |

---

## Local development

```bash
cd web-app
npm install

# Point at a local or remote agent instance
AGENT_URL=http://localhost:8080 AGENT_TOKEN=your_token npm start
```

Open `http://localhost:3000`

---

## Deploy to Render (free tier)

Both services are defined in `render.yaml` at the repo root.

### Step-by-step

1. Push this repo to GitHub (already done).
2. In [Render Dashboard](https://dashboard.render.com) → **New → Blueprint** → connect the repo.
   Render will read `render.yaml` and create both services.
3. **Deploy `artifact-agent` first.** Once it's live, copy its URL (e.g. `https://artifact-agent.onrender.com`).
4. Set the following env vars on `artifact-web` in the Render dashboard:
   - `AGENT_URL` → the `artifact-agent` service URL
   - `AGENT_TOKEN` → the same value as `API_BEARER_TOKEN` on the agent service
5. Set the required env vars on `artifact-agent`:
   - `GCP_PROJECT_ID`, `GCS_BUCKET_NAME`, `GOOGLE_API_KEY`, `API_BEARER_TOKEN`
6. Redeploy both services.

> **Free tier note:** both services sleep after 15 minutes of inactivity and cold-start on the next request (~30 s). This is expected and acceptable for this internal tool.

---

## Environment variables

### artifact-web (Node)
| Variable | Required | Description |
|---|---|---|
| `AGENT_URL` | Yes | Full URL of the artifact-agent service |
| `AGENT_TOKEN` | No | Bearer token for the agent API |
| `PORT` | No | Port (Render sets this automatically) |

### artifact-agent (Python) — see `agent-system/README.md`
