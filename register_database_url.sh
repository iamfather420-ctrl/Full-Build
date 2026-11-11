#!/usr/bin/env bash
# register_database_url.sh
#
# The Full-Build API server (artifacts/api-server/src/index.ts) reads
# DATABASE_URL for its Neon connection. The existing deployment convention
# stores the Neon connection string as NEON_DATABASE_URL.
#
# This script maps NEON_DATABASE_URL -> DATABASE_URL at container boot
# so the existing Neon setup is preserved without renaming secrets.
# It must run before the API server starts.

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" && -n "${NEON_DATABASE_URL:-}" ]]; then
  export DATABASE_URL="$NEON_DATABASE_URL"
  echo "register_database_url: mapped NEON_DATABASE_URL -> DATABASE_URL"
fi

if [[ -z "${DATABASE_URL:-}" && -n "${DATABASE_URL_FALLBACK:-}" ]]; then
  export DATABASE_URL="$DATABASE_URL_FALLBACK"
  echo "register_database_url: mapped DATABASE_URL_FALLBACK -> DATABASE_URL"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "register_database_url: ERROR - no Neon connection string found" \
       "(checked DATABASE_URL, NEON_DATABASE_URL, DATABASE_URL_FALLBACK)"
  exit 1
fi

echo "register_database_url: DATABASE_URL is set (host: $(echo "$DATABASE_URL" | sed -E 's|.*@([^/]+)/.*|\1|'))"
