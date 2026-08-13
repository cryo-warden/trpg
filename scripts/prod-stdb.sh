#!/usr/bin/env bash
# cw process "spacetimedb": the SEPARATE production SpacetimeDB instance,
# on its own port and persistent data dir — never the dev instance on 3000.
# (A script because cw argv-splits start_command without shell parsing:
# env expansion and quoting must happen in here.)
set -euo pipefail
: "${TRPG_STDB_PORT:?TRPG_STDB_PORT must be set}"
: "${TRPG_STDB_DATA_DIR:?TRPG_STDB_DATA_DIR must be set}"
mkdir -p "${TRPG_STDB_DATA_DIR}"
exec spacetime start --listen-addr "0.0.0.0:${TRPG_STDB_PORT}" --data-dir "${TRPG_STDB_DATA_DIR}"
