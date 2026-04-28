#!/usr/bin/env bash
#
# scripts/release.sh — Railway releaseCommand wrapper.
#
# Layer 1 of the migration safety gate (Wave INFRA-001 postmortem).
#
# Why this script exists:
#   The Wave 2 incident (commits 5beb62f → 2d83c23) showed that when
#   Railway's releaseCommand was set directly to `npx node-pg-migrate
#   up`, a non-zero exit from a failed migration did NOT prevent
#   Railway from cutting traffic over to the new container. The new
#   code shipped against the OLD schema for 4 days.
#
#   This wrapper enforces fail-closed semantics on the migration step:
#     - `set -e`     — exit immediately on first non-zero exit code
#     - `set -u`     — error on unset variables (catches missing env)
#     - `set -o pipefail` — fail the pipeline if any stage fails
#
#   It is a BELT, not the only suspender. The `/health/schema`
#   endpoint added in the same commit independently detects schema
#   drift at healthcheck time (Layer 2) — so even if Railway someday
#   stops honoring releaseCommand exit codes, drift cannot survive
#   cutover.
#
# Container working directory at exec time: /app (Railway "Root
# Directory" is set to backend/, so /app == backend/).

set -euo pipefail

echo "[release] Lingona migration gate starting..."
echo "[release] cwd: $(pwd)"
echo "[release] node-pg-migrate up --migrations-dir migrations"

# DATABASE_URL is provided by Railway's service-link injection. Do
# NOT echo it — secret leak hazard.
npx node-pg-migrate up --migrations-dir migrations --database-url-var DATABASE_URL

echo "[release] Migration gate passed. Cutover allowed."
exit 0
