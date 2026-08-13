#!/usr/bin/env bash
# cw process "spacetimedb": launch AND publish as one command.
#
# The SEPARATE production SpacetimeDB instance (own port, own persistent
# data dir — never the dev one on 3000) starts in the background; because
# launch and publish share this one process, the SUBSTITUTED real port in
# our own env is exactly the right address for the local publish — no port
# handoff, no TLS gymnastics. The fixed TRPG_STDB_PORT value remains the
# TLS/wss face for browsers only.
#
# Whether publish wipes the database is an EXPLICIT deploy-time decision:
# TRPG_STDB_DELETE_DATA must be exactly "true" (pre-alpha posture — the
# schema is churning and an incompatible change would otherwise brick the
# deploy) or "false" (data persists; an incompatible schema change fails
# loudly, taking this process down so the deploy reads as unhealthy,
# rather than wiping anything). No default: the operator states it.
set -euo pipefail
: "${TRPG_STDB_PORT:?TRPG_STDB_PORT must be set}"
: "${TRPG_STDB_DATA_DIR:?TRPG_STDB_DATA_DIR must be set}"
: "${TRPG_STDB_DELETE_DATA:?TRPG_STDB_DELETE_DATA must be set to \"true\" or \"false\"}"
: "${TRPG_ADMIN_TOKEN:?TRPG_ADMIN_TOKEN must be set (provisional admin password)}"
case "${TRPG_STDB_DELETE_DATA}" in
  true) PUBLISH_DATA_ARGS=(--delete-data) ;;
  false) PUBLISH_DATA_ARGS=() ;;
  *)
    echo "TRPG_STDB_DELETE_DATA must be exactly \"true\" or \"false\"; got \"${TRPG_STDB_DELETE_DATA}\"." >&2
    exit 1
    ;;
esac
mkdir -p "${TRPG_STDB_DATA_DIR}"

spacetime start --listen-addr "0.0.0.0:${TRPG_STDB_PORT}" --data-dir "${TRPG_STDB_DATA_DIR}" &
STDB_PID=$!
# The server must never outlive this script (nor ignore cw's stop signal).
trap 'kill -TERM "${STDB_PID}" 2>/dev/null || true' TERM INT EXIT

SERVER="http://127.0.0.1:${TRPG_STDB_PORT}"
echo "Waiting for SpacetimeDB at ${SERVER}..."
until curl -s -o /dev/null "${SERVER}"; do
  if ! kill -0 "${STDB_PID}" 2>/dev/null; then
    echo "SpacetimeDB exited during startup." >&2
    exit 1
  fi
  sleep 1
done

echo "Publishing module to ${SERVER} (TRPG_STDB_DELETE_DATA=${TRPG_STDB_DELETE_DATA})."
spacetime publish --server "${SERVER}" --module-path ./server trpg "${PUBLISH_DATA_ARGS[@]}" --yes

if spacetime call --server "${SERVER}" trpg bootstrap_admin "\"${TRPG_ADMIN_TOKEN}\""; then
  echo "Admin bootstrapped; claim it and rotate the password."
else
  echo "bootstrap_admin refused (already bootstrapped on this instance); continuing."
fi

echo "Publish complete; serving."
wait "${STDB_PID}"
