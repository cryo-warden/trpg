#!/usr/bin/env bash
# The cw "publisher" process: bring the PRODUCTION database up to the
# deployed code, then hold.
#
# - Waits for the service's own SpacetimeDB instance (a separate prod
#   instance on its own port and data dir — never the dev one on 3000).
# - Publishes the module WITHOUT --delete-data: production data persists;
#   an incompatible schema change fails the publish loudly rather than
#   wiping anything.
# - Bootstraps the admin account with TRPG_ADMIN_TOKEN as its provisional
#   password (tolerated when already bootstrapped). Assets then push
#   automatically the first time an admin logs in from the client.
# - Sleeps forever afterward: cw manages resident processes, and a clean
#   exit would read as a crash; the hold makes "published and healthy"
#   visible in `cw status`.
set -euo pipefail
: "${TRPG_STDB_DATA_DIR:?TRPG_STDB_DATA_DIR must be set}"
: "${TRPG_ADMIN_TOKEN:?TRPG_ADMIN_TOKEN must be set (provisional admin password)}"

# The stdb process writes its SUBSTITUTED (real) port here at startup; the
# fixed TRPG_STDB_PORT is the TLS proxy for browsers, which local admin
# traffic deliberately bypasses (plain loopback HTTP, no cert gymnastics).
PORT_FILE="${TRPG_STDB_DATA_DIR}/local-port"

# Re-read the file every attempt: the data dir persists across deploys, so
# a stale port from the PREVIOUS instance may sit there until the new one
# overwrites it.
echo "Waiting for SpacetimeDB (real port published at ${PORT_FILE})..."
SERVER=""
until [ -s "${PORT_FILE}" ] \
  && SERVER="http://127.0.0.1:$(cat "${PORT_FILE}")" \
  && curl -s -o /dev/null "${SERVER}"; do
  sleep 1
done
echo "SpacetimeDB answering at ${SERVER}."

echo "Publishing module to ${SERVER} (no --delete-data: prod data persists)."
spacetime publish --server "${SERVER}" --module-path ./server trpg --yes

if spacetime call --server "${SERVER}" trpg bootstrap_admin "\"${TRPG_ADMIN_TOKEN}\""; then
  echo "Admin bootstrapped; claim it and rotate the password."
else
  echo "bootstrap_admin refused (already bootstrapped on this instance); continuing."
fi

echo "Production publish complete; holding."
exec sleep infinity
