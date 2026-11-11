#!/usr/bin/env bash
# register_database_url.sh
#
# Normalize supported Fly secret names to DATABASE_URL before the API starts.
# DATABASE_URL is the canonical name; the others preserve existing deployments.

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" && -n "${NEON_DATABASE_URL:-}" ]]; then
  export DATABASE_URL="$NEON_DATABASE_URL"
  echo "register_database_url: mapped NEON_DATABASE_URL -> DATABASE_URL"
fi

# Backward compatibility for the mixed-case secret name used in an earlier setup.
if [[ -z "${DATABASE_URL:-}" && -n "${Database_url:-}" ]]; then
  export DATABASE_URL="$Database_url"
  echo "register_database_url: mapped Database_url -> DATABASE_URL"
fi

if [[ -z "${DATABASE_URL:-}" && -n "${DATABASE_URL_FALLBACK:-}" ]]; then
  export DATABASE_URL="$DATABASE_URL_FALLBACK"
  echo "register_database_url: mapped DATABASE_URL_FALLBACK -> DATABASE_URL"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "register_database_url: ERROR - no Neon connection string found" \
       "(checked DATABASE_URL, NEON_DATABASE_URL, Database_url, DATABASE_URL_FALLBACK)"
  exit 1
fi

echo "register_database_url: DATABASE_URL is set"
