#!/usr/bin/env bash
# Run the E2E suite against a DEDICATED, throwaway SpacetimeDB instance — never
# the dev (:3000) or prod instance. This repo already runs a second instance for
# prod (see scripts/prod-stdb.sh: own port, own data dir), so an isolated test
# instance is just the same pattern pointed at /tmp.
#
# The instance's data dir is wiped at BOTH ends of the run: an interrupted run
# leaves no databases behind (a stronger guarantee than sweeping `test_*` names
# off a shared instance — there is no shared instance to leave cruft on). The
# harness reads TRPG_E2E_STDB_PORT and targets `--server http://127.0.0.1:PORT`,
# so every publish/call/sql/delete hits THIS instance and nothing else.
#
# Usage: scripts/e2e-stdb.sh <bun-test-target...>   (cwd must be web-trpg)
set -euo pipefail

PORT="${TRPG_E2E_STDB_PORT:-3011}"
DATA_DIR="${TRPG_E2E_STDB_DATA_DIR:-/tmp/trpg-e2e-stdb}"
LOG="${TRPG_E2E_STDB_LOG:-/tmp/trpg-e2e-stdb.log}"
SERVER="http://127.0.0.1:${PORT}"

wipe() { rm -rf "${DATA_DIR}"; }

# START-of-run cleanup: nothing survives from a prior or interrupted run.
wipe
mkdir -p "${DATA_DIR}"

spacetime start --listen-addr "127.0.0.1:${PORT}" --data-dir "${DATA_DIR}" \
  >"${LOG}" 2>&1 &
STDB_PID=$!

# END-of-run cleanup: stop the instance and wipe its data, whatever happens.
trap 'kill -TERM "${STDB_PID}" 2>/dev/null || true; wait "${STDB_PID}" 2>/dev/null || true; wipe' EXIT

echo "Waiting for isolated SpacetimeDB at ${SERVER} (log: ${LOG})..."
DEADLINE=$((SECONDS + 60))
until curl -s -o /dev/null "${SERVER}"; do
  if ! kill -0 "${STDB_PID}" 2>/dev/null; then
    echo "Isolated SpacetimeDB exited during startup; see ${LOG}" >&2
    exit 1
  fi
  if [ "${SECONDS}" -ge "${DEADLINE}" ]; then
    echo "Isolated SpacetimeDB did not become ready within 60s; see ${LOG}" >&2
    exit 1
  fi
  sleep 0.5
done
echo "Isolated SpacetimeDB is up."

# Run the tests against THIS instance. Capture the code so the EXIT trap's
# cleanup does not mask a test failure.
set +e
TRPG_E2E_STDB_PORT="${PORT}" bun test "$@"
CODE=$?
set -e
exit "${CODE}"
