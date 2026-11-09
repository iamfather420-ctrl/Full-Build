#!/usr/bin/env bash
set -euo pipefail
configured=0
for key in SOLVEX_NEON_ISOLATION_TEST_DATABASE_URL SOLVEX_NEON_TEST_TENANT_A SOLVEX_NEON_TEST_TENANT_B; do
  value="${!key:-}"
  if [[ -n "$value" ]]; then configured=$((configured + 1)); fi
done
if [[ "$configured" -eq 0 ]]; then
  echo "SKIPPED: disposable Neon isolation secrets are not configured; production gate remains BLOCKED."
  exit 0
fi
if [[ "$configured" -ne 3 ]]; then
  echo "ERROR: configure all three disposable Neon isolation secrets together." >&2
  exit 2
fi
export SOLVEX_NEON_ISOLATION_TEST_CONFIRM=DISPOSABLE_NEON_BRANCH_ONLY
exec bash scripts/verify_neon_tenant_isolation.sh
