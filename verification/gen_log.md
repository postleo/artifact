# Verification — Test Generation Record

Project: gen-lang-client-0929483169
Started: 2026-09-08T14:27:39Z

| timestamp (UTC) | type | model | prompt (trunc) | output | bytes |
|---|---|---|---|---|---|
| 2026-09-08T14:28:36.954158Z | image | gemini-3.1-flash-image | Concept art of a brass steampunk astral ... | verification/images/nb2_20260908T142824Z.png (loc=global) | 1877535 |
| 2026-09-08T14:30:41.344407Z | image | gemini-3-pro-image | High-fidelity front turnaround of a bras... | verification/images/nbpro_20260908T142824Z.png (loc=global) | 1922435 |
| 2026-09-08T14:39:20.685242+00:00 | agent-engine-query | 2248999907325116416 | trademark screen test | '' | 0 |
| 2026-09-08T14:43:41.495072+00:00 | agent-engine-query | 3102432036711825408 | trademark screen: brass astral compass | 'low' | 3 |
| 2026-09-08T14:44:08.180863+00:00 | AgentEngineAdapter.invoke | 3102432036711825408 | trademark_screen | "{'trademark_risk': 'none'}" | - |
| 2026-09-08T14:45:13.412263+00:00 | AgentEngineAdapter.invoke(hardened) | 3102432036711825408 | plain vs branded | {'trademark_risk': 'none'}/{'trademark_risk': 'high'} | - |

## Firestore migration — end-to-end verified

Migrated app-backend off Cloud SQL to Firestore (Native, serverless, scales to zero).
Verified live: studio profile + props persist to Firestore; prop `prop_33fe2525`
("Firestore Migration Test Compass", 2 options) created via backend→agent→Agent
Engine→Nano Banana and read back from the Firestore `app_props` collection (HTTP 200).

## Full-stack GCP deployment — end-to-end verified

Deployed services (all Cloud Run, us-central1):
- Frontend: https://artifact-frontend-166915348796.us-central1.run.app
- Backend:  https://artifact-backend-166915348796.us-central1.run.app  (Cloud SQL Postgres artifact-sql)
- Agent:    https://artifact-agent-166915348796.us-central1.run.app  (/v1; Agent Engine 3102432036711825408, Firestore, GCS)

End-to-end run (POST /api/props "Astral Brass Compass"):
| item | result |
|---|---|
| backend->agent create prop | HTTP 201 prop_42459ef1, job_79423748 |
| Cloud SQL record | status=generating (persisted) |
| Firestore record (agent) | status=generating_options, 2 options |
| Nano Banana images -> GCS | gs://<proj>-artifact-assets/prop_42459ef1/option_opt_*/*.png (x2) |
| /v1/props/:id/options (signed URLs) | HTTP 200, V4 IAM-signed |
| signed image fetch | HTTP 200, 2,395,265 bytes image/png |
