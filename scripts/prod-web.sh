#!/usr/bin/env bash
# cw process "web": serve the built client (dist produced by the deploy's
# build step) on the proxied web port.
set -euo pipefail
: "${TRPG_WEB_PORT:?TRPG_WEB_PORT must be set}"
cd "$(dirname "$0")/../web-trpg"
exec bunx vite preview --host 0.0.0.0 --port "${TRPG_WEB_PORT}"
