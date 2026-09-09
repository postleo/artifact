#!/usr/bin/env bash
#
# confluent-cluster.sh — one-command lifecycle for the Artifact prop-event Kafka backbone.
#
# Provisions a Confluent Cloud **Basic** cluster (cheap, scales within the free eCKU) with a
# storage-capped topic, stores the credentials in Secret Manager, and toggles the feature flag
# on the Cloud Run services. Designed so a new user can start/stop the whole thing easily.
#
# COST CONTROLS:
#   * Basic cluster: $0/month base; stays within the 1 free eCKU at our event volume.
#   * Topic is created with retention.bytes=100MiB/partition x 3 partitions = 300MiB max,
#     so storage is capped at ~0.29 GB x $0.08/GB-mo = ~$0.023/month (< $0.10, guaranteed).
#   * `down` DELETES the cluster to stop all charges — this is the "auto-delete when idle"
#     mechanism. Run it after a demo, or schedule it (see AUTO-DELETE below).
#
# PREREQUISITES (one-time, cannot be automated — needs a Confluent Cloud account):
#   * confluent CLI logged in:  `confluent login`  (or export CONFLUENT_CLOUD_API_KEY /
#     CONFLUENT_CLOUD_API_SECRET for a Cloud-level key). This script auto-installs the CLI.
#   * gcloud authenticated with the project set (for Secret Manager + Cloud Run).
#
# USAGE:
#   ./scripts/confluent-cluster.sh up                # provision + enable
#   ./scripts/confluent-cluster.sh status            # show state
#   ./scripts/confluent-cluster.sh disable           # stop consuming/producing (keep cluster)
#   ./scripts/confluent-cluster.sh enable            # resume (keep cluster)
#   ./scripts/confluent-cluster.sh down --yes        # disable + DELETE cluster (stops charges)
#
# AUTO-DELETE WHEN NOT IN USE (optional, hands-off):
#   Schedule a nightly teardown so an idle cluster never lingers, e.g. cron:
#     0 3 * * *  /path/to/scripts/confluent-cluster.sh down --yes >> /var/log/confluent-down.log 2>&1
#   or a Cloud Scheduler HTTP job hitting a tiny Cloud Run job that runs `down --yes`.
#
set -uo pipefail

# ------------------------------------------------------------------ config
PROJECT="${PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
CLOUD="${CLOUD:-gcp}"
CLUSTER_NAME="${CLUSTER_NAME:-artifact-events}"
CLUSTER_TYPE="basic"
TOPIC="${KAFKA_TOPIC:-artifact.prop.events}"
PARTITIONS="${PARTITIONS:-3}"
RETENTION_MS="${RETENTION_MS:-86400000}"          # 1 day
RETENTION_BYTES="${RETENTION_BYTES:-104857600}"   # 100 MiB / partition -> storage < $0.10/mo
CONSUMER_GROUP="${KAFKA_CONSUMER_GROUP_ID:-artifact-backend-prop-events}"
RUNTIME_SA="${RUNTIME_SA:-166915348796-compute@developer.gserviceaccount.com}"
BACKEND_SVC="artifact-backend"
AGENT_SVC="artifact-agent"
SECRET_KEY="confluent-api-key"
SECRET_SECRET="confluent-api-secret"
SECRET_BOOTSTRAP="confluent-bootstrap"

log() { echo "[confluent-cluster] $*"; }
die() { echo "[confluent-cluster] ERROR: $*" >&2; exit 1; }

# ------------------------------------------------------------------ helpers
ensure_cli() {
  if ! command -v confluent >/dev/null 2>&1; then
    log "Confluent CLI not found — installing to ./bin ..."
    mkdir -p "$HOME/.local/bin"
    curl -sL --http1.1 https://cnfl.io/cli | sh -s -- -b "$HOME/.local/bin" \
      || die "Failed to install the Confluent CLI. Install manually: https://docs.confluent.io/confluent-cli/current/install.html"
    export PATH="$HOME/.local/bin:$PATH"
  fi
  # Verify authentication (works whether via `confluent login` or CONFLUENT_CLOUD_API_KEY).
  if ! confluent environment list >/dev/null 2>&1; then
    die "Confluent CLI is not authenticated. Run 'confluent login' (or export CONFLUENT_CLOUD_API_KEY/CONFLUENT_CLOUD_API_SECRET) and retry."
  fi
}

pyjson() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null; }

current_env_id() {
  # Use the active environment, else the first available one.
  confluent environment list -o json 2>/dev/null \
    | python3 -c "import sys,json;e=json.load(sys.stdin);a=[x for x in e if x.get('is_current')];print((a[0] if a else e[0])['id'] if e else '')" 2>/dev/null
}

find_cluster_id() {
  confluent kafka cluster list -o json 2>/dev/null \
    | python3 -c "import sys,json;c=[x for x in json.load(sys.stdin) if x.get('name')=='$CLUSTER_NAME'];print(c[0]['id'] if c else '')" 2>/dev/null
}

strip_scheme() { sed -E 's#^[A-Za-z_]+://##'; }

put_secret() { # name value
  if gcloud secrets describe "$1" >/dev/null 2>&1; then
    printf '%s' "$2" | gcloud secrets versions add "$1" --data-file=- >/dev/null 2>&1
  else
    printf '%s' "$2" | gcloud secrets create "$1" --data-file=- >/dev/null 2>&1
  fi
  gcloud secrets add-iam-policy-binding "$1" --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null 2>&1 || true
}

set_flag_on_services() { # true|false
  local val="$1"
  log "Setting KAFKA_ENABLED=${val} on ${BACKEND_SVC} and ${AGENT_SVC} ..."
  gcloud run services update "$BACKEND_SVC" --region "$REGION" \
    --update-env-vars "KAFKA_ENABLED=${val}" >/dev/null 2>&1 && log "  ${BACKEND_SVC} updated" || log "  (skip ${BACKEND_SVC})"
  gcloud run services update "$AGENT_SVC" --region "$REGION" \
    --update-env-vars "KAFKA_ENABLED=${val}" >/dev/null 2>&1 && log "  ${AGENT_SVC} updated" || log "  (skip ${AGENT_SVC})"
}

# ------------------------------------------------------------------ commands
cmd_up() {
  ensure_cli
  [ -n "$PROJECT" ] || die "No gcloud project set."
  local env_id; env_id="$(current_env_id)"
  [ -n "$env_id" ] || die "No Confluent environment found."
  confluent environment use "$env_id" >/dev/null 2>&1
  log "Using Confluent environment ${env_id}."

  local cid; cid="$(find_cluster_id)"
  if [ -n "$cid" ]; then
    log "Cluster '${CLUSTER_NAME}' already exists (${cid}); reusing."
  else
    log "Creating Basic cluster '${CLUSTER_NAME}' in ${CLOUD}/${REGION} ..."
    confluent kafka cluster create "$CLUSTER_NAME" --cloud "$CLOUD" --region "$REGION" \
      --type "$CLUSTER_TYPE" -o json >/tmp/.cc_cluster.json 2>/tmp/.cc_err \
      || { cat /tmp/.cc_err >&2; die "Cluster create failed."; }
    cid="$(pyjson "d['id']" </tmp/.cc_cluster.json)"
    log "Created cluster ${cid}. Waiting for it to become ready ..."
    for _ in $(seq 1 30); do
      local st; st="$(confluent kafka cluster describe "$cid" -o json 2>/dev/null | pyjson "d.get('status','')")"
      [ "$st" = "UP" ] && break; sleep 5
    done
  fi
  confluent kafka cluster use "$cid" >/dev/null 2>&1

  local bootstrap; bootstrap="$(confluent kafka cluster describe "$cid" -o json 2>/dev/null | pyjson "d.get('endpoint','')" | strip_scheme)"
  [ -n "$bootstrap" ] || die "Could not resolve cluster bootstrap endpoint."
  log "Bootstrap: ${bootstrap}"

  # Topic with the storage cap (idempotent).
  if confluent kafka topic describe "$TOPIC" --cluster "$cid" >/dev/null 2>&1; then
    log "Topic '${TOPIC}' exists; ensuring retention config ..."
    confluent kafka topic update "$TOPIC" --cluster "$cid" \
      --config "retention.ms=${RETENTION_MS},retention.bytes=${RETENTION_BYTES}" >/dev/null 2>&1 || true
  else
    log "Creating topic '${TOPIC}' (${PARTITIONS} partitions, storage-capped) ..."
    confluent kafka topic create "$TOPIC" --cluster "$cid" --partitions "$PARTITIONS" \
      --config "retention.ms=${RETENTION_MS},retention.bytes=${RETENTION_BYTES}" \
      || die "Topic create failed."
  fi

  log "Creating cluster API key ..."
  confluent api-key create --resource "$cid" -o json >/tmp/.cc_key.json 2>/tmp/.cc_err \
    || { cat /tmp/.cc_err >&2; die "API key create failed."; }
  local api_key api_secret
  api_key="$(pyjson "d.get('api_key') or d.get('key')" </tmp/.cc_key.json)"
  api_secret="$(pyjson "d.get('api_secret') or d.get('secret')" </tmp/.cc_key.json)"
  rm -f /tmp/.cc_key.json
  [ -n "$api_key" ] && [ -n "$api_secret" ] || die "Could not parse API key/secret."

  log "Storing credentials in Secret Manager ..."
  put_secret "$SECRET_KEY" "$api_key"
  put_secret "$SECRET_SECRET" "$api_secret"
  put_secret "$SECRET_BOOTSTRAP" "$bootstrap"

  log "Enabling on Cloud Run services ..."
  gcloud run services update "$BACKEND_SVC" --region "$REGION" \
    --update-env-vars "KAFKA_ENABLED=true,KAFKA_BOOTSTRAP_SERVERS=${bootstrap},KAFKA_TOPIC=${TOPIC},KAFKA_CONSUMER_GROUP_ID=${CONSUMER_GROUP},KAFKA_SECURITY_PROTOCOL=SASL_SSL,KAFKA_SASL_MECHANISM=PLAIN" \
    --update-secrets "KAFKA_API_KEY=${SECRET_KEY}:latest,KAFKA_API_SECRET=${SECRET_SECRET}:latest" >/dev/null 2>&1 \
    && log "  ${BACKEND_SVC} enabled" || log "  (WARN: ${BACKEND_SVC} update failed)"
  gcloud run services update "$AGENT_SVC" --region "$REGION" \
    --update-env-vars "KAFKA_ENABLED=true,KAFKA_BOOTSTRAP_SERVERS=${bootstrap},KAFKA_TOPIC=${TOPIC},KAFKA_SECURITY_PROTOCOL=SASL_SSL,KAFKA_SASL_MECHANISM=PLAIN" \
    --update-secrets "KAFKA_API_KEY=${SECRET_KEY}:latest,KAFKA_API_SECRET=${SECRET_SECRET}:latest" >/dev/null 2>&1 \
    && log "  ${AGENT_SVC} enabled" || log "  (WARN: ${AGENT_SVC} update failed)"

  log "UP complete. Cluster ${cid}, topic ${TOPIC}. Storage capped ~0.29GB (~\$0.023/mo max)."
  log "Tear down when done:  $0 down --yes"
}

cmd_down() {
  [ "${1:-}" = "--yes" ] || die "Refusing to delete without --yes. Run: $0 down --yes"
  ensure_cli
  set_flag_on_services "false"
  local cid; cid="$(find_cluster_id)"
  if [ -n "$cid" ]; then
    log "Deleting cluster '${CLUSTER_NAME}' (${cid}) to stop all charges ..."
    confluent kafka cluster delete "$cid" --force >/dev/null 2>&1 \
      && log "  deleted ${cid}" || log "  (WARN: delete failed; delete manually in the console)"
  else
    log "No cluster named '${CLUSTER_NAME}' found (already deleted?)."
  fi
  log "DOWN complete. Services set to KAFKA_ENABLED=false. (Secret Manager entries left in place; they are harmless and reused on next 'up'.)"
}

cmd_enable()  { ensure_cli >/dev/null 2>&1 || true; set_flag_on_services "true";  log "Enabled (cluster unchanged)."; }
cmd_disable() { set_flag_on_services "false"; log "Disabled (cluster unchanged)."; }

cmd_status() {
  ensure_cli
  local cid; cid="$(find_cluster_id)"
  if [ -n "$cid" ]; then
    local st; st="$(confluent kafka cluster describe "$cid" -o json 2>/dev/null | pyjson "d.get('status','?')")"
    echo "cluster '${CLUSTER_NAME}': ${cid} (status ${st})"
    confluent kafka topic list --cluster "$cid" 2>/dev/null | grep -i "$TOPIC" || echo "topic ${TOPIC}: (not found)"
  else
    echo "cluster '${CLUSTER_NAME}': NOT provisioned"
  fi
  for svc in "$BACKEND_SVC" "$AGENT_SVC"; do
    local v; v="$(gcloud run services describe "$svc" --region "$REGION" \
      --format="json" 2>/dev/null | python3 -c "import sys,json;e={x['name']:x.get('value','') for x in json.load(sys.stdin)['spec']['template']['spec']['containers'][0].get('env',[])};print(e.get('KAFKA_ENABLED','<unset>'))" 2>/dev/null)"
    echo "${svc}: KAFKA_ENABLED=${v:-<unknown>}"
  done
}

case "${1:-}" in
  up)      cmd_up ;;
  down)    shift; cmd_down "${1:-}" ;;
  enable)  cmd_enable ;;
  disable) cmd_disable ;;
  status)  cmd_status ;;
  *) cat <<EOF
Artifact Confluent cluster lifecycle.

Commands:
  up                 Provision Basic cluster + capped topic + API key, store secrets, enable services
  status             Show cluster/topic state and each service's KAFKA_ENABLED
  enable | disable   Toggle KAFKA_ENABLED on the services (cluster unchanged)
  down --yes         Disable services and DELETE the cluster (stops all charges)

Prereq (one-time): 'confluent login' (or CONFLUENT_CLOUD_API_KEY/SECRET) + gcloud project set.
EOF
     exit 1 ;;
esac
