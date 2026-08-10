#!/usr/bin/env bash
# The publish action: publish the module, then bootstrap the admin account in
# the same breath.
#
# How the secret token is handled, end to end:
#   1. The operator sets TRPG_ADMIN_TOKEN in this process's environment only —
#      it is never committed, never written to disk by this script.
#   2. bootstrap_admin receives it in one reducer call and stores ONLY a
#      salted hash (private account_passwords table) on the auto-created
#      "admin" account, flagged requires_password_rotation.
#   3. The operator claims the account with login_with_password (possible only
#      while no identity holds it), then MUST call set_password: rotation
#      overwrites the hash, so the publish-time token ceases to exist.
#      Until rotation, privileged reducers refuse the account.
set -euo pipefail
: "${TRPG_ADMIN_TOKEN:?Set TRPG_ADMIN_TOKEN to a fresh secret for this publish.}"
DB_NAME="${1:-trpg}"

spacetime publish --module-path ./server "$DB_NAME" --delete-data --yes
spacetime call "$DB_NAME" bootstrap_admin "\"$TRPG_ADMIN_TOKEN\""
echo "Published $DB_NAME and bootstrapped the admin account."
echo "Claim it now: log in as 'admin' with the token, then rotate the password."
