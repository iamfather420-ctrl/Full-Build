#!/usr/bin/env bash
set -euo pipefail
: "${SOLVEX_NEON_ISOLATION_TEST_DATABASE_URL:?Set a disposable Neon branch URL}"
: "${SOLVEX_NEON_TEST_TENANT_A:?Set an existing fixture tenant A ID}"
: "${SOLVEX_NEON_TEST_TENANT_B:?Set an existing fixture tenant B ID}"
if [[ "${SOLVEX_NEON_ISOLATION_TEST_CONFIRM:-}" != "DISPOSABLE_NEON_BRANCH_ONLY" ]]; then
  echo "Refusing to run: set SOLVEX_NEON_ISOLATION_TEST_CONFIRM=DISPOSABLE_NEON_BRANCH_ONLY" >&2
  exit 2
fi
if [[ "$SOLVEX_NEON_TEST_TENANT_A" == "$SOLVEX_NEON_TEST_TENANT_B" ]]; then
  echo "Tenant fixture IDs must be different." >&2
  exit 2
fi
command -v psql >/dev/null || { echo "psql is required (install postgresql-client)." >&2; exit 2; }
psql "$SOLVEX_NEON_ISOLATION_TEST_DATABASE_URL" \
  --no-psqlrc --set=ON_ERROR_STOP=1 \
  --set=tenant_a="$SOLVEX_NEON_TEST_TENANT_A" \
  --set=tenant_b="$SOLVEX_NEON_TEST_TENANT_B" \
  --file=scripts/verify_neon_tenant_isolation.sql
