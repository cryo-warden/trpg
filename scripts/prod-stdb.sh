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
# Publish runs WITHOUT --delete-data: production data persists, and an
# incompatible schema change fails loudly — taking this process down so the
# deploy reads as unhealthy — rather than wiping anything.
set -euo pipefail
: "${TRPG_STDB_PORT:?TRPG_STDB_PORT must be set}"
: "${TRPG_STDB_DATA_DIR:?TRPG_STDB_DATA_DIR must be set}"
: "${TRPG_ADMIN_TOKEN:?TRPG_ADMIN_TOKEN must be set (provisional admin password)}"
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

echo "Publishing module to ${SERVER} (no --delete-data: prod data persists)."
spacetime publish --server "${SERVER}" --module-path ./server trpg --yes

if spacetime call --server "${SERVER}" trpg bootstrap_admin "\"${TRPG_ADMIN_TOKEN}\""; then
  echo "Admin bootstrapped; claim it and rotate the password."
else
  echo "bootstrap_admin refused (already bootstrapped on this instance); continuing."
fi

echo "Publish complete; serving."
wait "${STDB_PID}"
