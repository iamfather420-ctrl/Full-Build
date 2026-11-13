#!/usr/bin/env bash
set -euo pipefail

: "${SOLVEX_NEON_ISOLATION_MIGRATION_DATABASE_URL:?Set SOLVEX_NEON_ISOLATION_MIGRATION_DATABASE_URL to an owner connection on a disposable Neon validation branch.}"
if [[ -n "${NEON_DATABASE_URL:-}" && "$SOLVEX_NEON_ISOLATION_MIGRATION_DATABASE_URL" == "$NEON_DATABASE_URL" ]]; then
  echo "Refusing to run tenant-claim integration tests against NEON_DATABASE_URL." >&2
  exit 1
fi
if [[ -n "${DATABASE_URL:-}" && "$SOLVEX_NEON_ISOLATION_MIGRATION_DATABASE_URL" == "$DATABASE_URL" ]]; then
  echo "Refusing to run tenant-claim integration tests against DATABASE_URL." >&2
  exit 1
fi

if [[ "${SOLVEX_NEON_ISOLATION_TEST_CONFIRM:-}" != "DISPOSABLE_NEON_BRANCH_ONLY" ]]; then
  echo "Refusing to run: set SOLVEX_NEON_ISOLATION_TEST_CONFIRM=DISPOSABLE_NEON_BRANCH_ONLY" >&2
  exit 2
fi

preflight="$(psql "$SOLVEX_NEON_ISOLATION_MIGRATION_DATABASE_URL" --no-psqlrc --set=ON_ERROR_STOP=1 --tuples-only --no-align -c "SELECT to_regprocedure('solvex_private.issue_oidc_session_claim(text,text)') IS NOT NULL AND solvex_private.auth_context_ready()")"
if [[ "$preflight" != "t" ]]; then
  echo "BLOCKED: isolated Neon branch is missing the signed-tenant-session migration or signing context." >&2
  exit 3
fi
psql "$SOLVEX_NEON_ISOLATION_MIGRATION_DATABASE_URL" --no-psqlrc --set=ON_ERROR_STOP=1 -f scripts/test_oidc_tenant_claims.sql
