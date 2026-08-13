#!/usr/bin/env bash
# cw process "spacetimedb": the SEPARATE production SpacetimeDB instance,
# on its own port and persistent data dir — never the dev instance on 3000.
# (A script because cw argv-splits start_command without shell parsing:
# env expansion and quoting must happen in here.)
set -euo pipefail
: "${TRPG_STDB_PORT:?TRPG_STDB_PORT must be set}"
: "${TRPG_STDB_DATA_DIR:?TRPG_STDB_DATA_DIR must be set}"
mkdir -p "${TRPG_STDB_DATA_DIR}"
# This process holds the SUBSTITUTED (real) port; the fixed port is the
# TLS proxy for browsers. Publish the real port to a file so sibling
# processes (the publisher) can reach the instance directly over plain
# loopback HTTP — local admin traffic never rides the TLS edge.
echo "${TRPG_STDB_PORT}" > "${TRPG_STDB_DATA_DIR}/local-port"
exec spacetime start --listen-addr "0.0.0.0:${TRPG_STDB_PORT}" --data-dir "${TRPG_STDB_DATA_DIR}"
