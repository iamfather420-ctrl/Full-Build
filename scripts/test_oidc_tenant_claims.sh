#!/usr/bin/env bash
set -euo pipefail

: "${SOLVEX_NEON_ISOLATION_TEST_DATABASE_URL:?Set SOLVEX_ISOLATION_TEST_DATABASE_URL to a disposable Neon validation branch.}"
if [[ -n "${NEON_DATABASE_URL:-}" && "$SOLVEX_ISOLATION_TEST_DATABASE_URL" == "$NEON_DATABASE_URL" ]]; then
  echo "Refusing to run tenant-claim integration tests against NEON_DATABASE_URL." >&2
  exit 1
fi
if [[ -n "${DATABASE_URL:-}" && "$SOLVEX_ISOLATION_TEST_DATABASE_URL" == "$DATABASE_URL" ]]; then
  echo "Refusing to run tenant-claim integration tests against DATABASE_URL." >&2
  exit 1
fi

psql "$SOLVEX_ISOLATION_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/0001_oidc_signed_tenant_sessions.sql
psql "$SOLVEX_ISOLATION_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/test_oidc_tenant_claims.sql
