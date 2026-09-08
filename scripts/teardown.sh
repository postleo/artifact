#!/usr/bin/env bash
#
# teardown.sh — delete all GCP resources created for the Artifact deployment.
#
# Deletes: 3 Cloud Run services, the Cloud SQL instance, the Vertex AI Agent Engine,
# the GCS buckets (and their contents), and (optionally) the Secret Manager secret
# and the Artifact Registry repo.
#
# SAFETY: this is destructive and irreversible. It only runs when you pass --yes.
#
# Usage:
#   ./scripts/teardown.sh --yes                       # use current gcloud project
#   PROJECT=my-proj REGION=us-central1 ./scripts/teardown.sh --yes
#   ./scripts/teardown.sh --yes --include-registry    # also delete the AR repo
#
set -uo pipefail

PROJECT="${PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
AGENT_ENGINE_ID="${AGENT_ENGINE_ID:-}"   # optional: reasoning engine id or full resource name

RUN_SERVICES=(artifact-frontend artifact-backend artifact-agent)
SQL_INSTANCE="artifact-sql"
BUCKETS=("gs://${PROJECT}-artifact-assets" "gs://${PROJECT}-artifact-staging")
SECRET="artifact-login-password"
AR_REPO="cloud-run-source-deploy"

if [[ "${1:-}" != "--yes" ]]; then
  cat <<EOF
This will PERMANENTLY DELETE the following in project '${PROJECT}' (region ${REGION}):
  - Cloud Run services : ${RUN_SERVICES[*]}
  - Cloud SQL instance : ${SQL_INSTANCE}
  - GCS buckets        : ${BUCKETS[*]}
  - Secret Manager     : ${SECRET}
  - Agent Engine       : ${AGENT_ENGINE_ID:-<auto-detect all reasoningEngines>}
  - Artifact Registry  : ${AR_REPO}   (only with --include-registry)

Re-run with --yes to proceed:  ./scripts/teardown.sh --yes
EOF
  exit 1
fi

echo "== Deleting Cloud Run services =="
for svc in "${RUN_SERVICES[@]}"; do
  gcloud run services delete "$svc" --region "$REGION" --quiet 2>/dev/null \
    && echo "  deleted $svc" || echo "  (skip $svc - not found)"
done

echo "== Deleting Cloud SQL instance =="
gcloud sql instances delete "$SQL_INSTANCE" --quiet 2>/dev/null \
  && echo "  deleted $SQL_INSTANCE" || echo "  (skip $SQL_INSTANCE - not found)"

echo "== Deleting Vertex AI Agent Engine(s) =="
python3 - "$PROJECT" "$REGION" "$AGENT_ENGINE_ID" <<'PY' 2>/dev/null || echo "  (agent engine deletion skipped/failed)"
import sys
project, region, engine_id = sys.argv[1], sys.argv[2], sys.argv[3]
import vertexai
from vertexai import agent_engines
vertexai.init(project=project, location=region)
if engine_id:
    target = engine_id if engine_id.startswith("projects/") else next(
        (e.resource_name for e in agent_engines.list() if e.resource_name.endswith("/" + engine_id)), None)
    if target:
        agent_engines.delete(target, force=True); print("  deleted", target)
else:
    for e in agent_engines.list():
        agent_engines.delete(e.resource_name, force=True); print("  deleted", e.resource_name)
PY

echo "== Deleting GCS buckets =="
for b in "${BUCKETS[@]}"; do
  gcloud storage rm -r "$b" --quiet 2>/dev/null \
    && echo "  deleted $b" || echo "  (skip $b - not found)"
done

echo "== Deleting Secret Manager secret =="
gcloud secrets delete "$SECRET" --quiet 2>/dev/null \
  && echo "  deleted $SECRET" || echo "  (skip $SECRET - not found)"

if [[ "${2:-}" == "--include-registry" ]]; then
  echo "== Deleting Artifact Registry repo =="
  gcloud artifacts repositories delete "$AR_REPO" --location "$REGION" --quiet 2>/dev/null \
    && echo "  deleted $AR_REPO" || echo "  (skip $AR_REPO - not found)"
fi

echo
echo "Teardown complete. Note: the Firestore default database is NOT deleted by this"
echo "script (it cannot be removed via gcloud); delete it from the console if desired."
