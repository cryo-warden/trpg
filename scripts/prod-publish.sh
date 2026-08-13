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
: "${TRPG_STDB_PORT:?TRPG_STDB_PORT must be set (the prod SpacetimeDB port)}"
: "${TRPG_ADMIN_TOKEN:?TRPG_ADMIN_TOKEN must be set (provisional admin password)}"

SERVER="http://127.0.0.1:${TRPG_STDB_PORT}"

echo "Waiting for SpacetimeDB at ${SERVER}..."
until curl -s -o /dev/null "${SERVER}"; do
  sleep 1
done

echo "Publishing module to ${SERVER} (no --delete-data: prod data persists)."
spacetime publish --server "${SERVER}" --module-path ./server trpg --yes

if spacetime call --server "${SERVER}" trpg bootstrap_admin "\"${TRPG_ADMIN_TOKEN}\""; then
  echo "Admin bootstrapped; claim it and rotate the password."
else
  echo "bootstrap_admin refused (already bootstrapped on this instance); continuing."
fi

echo "Production publish complete; holding."
exec sleep infinity
