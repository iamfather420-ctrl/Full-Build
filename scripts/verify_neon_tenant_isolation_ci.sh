#!/usr/bin/env bash
set -euo pipefail

# This is a required security gate, not an optional smoke test. Missing secrets
# must fail CI rather than produce a green "skipped" result.
missing=()
for key in SOLVEX_NEON_ISOLATION_TEST_DATABASE_URL SOLVEX_NEON_TEST_TENANT_A SOLVEX_NEON_TEST_TENANT_B; do
  if [[ -z "${!key:-}" ]]; then missing+=("$key"); fi
done

if [[ "${#missing[@]}" -gt 0 ]]; then
  printf 'BLOCKED: Neon tenant-isolation test was not run. Missing required GitHub Actions secrets: %s\n' "${missing[*]}" >&2
  echo "Configure all three secrets with a disposable Neon branch and real fixture tenant IDs. Production readiness remains BLOCKED." >&2
  exit 2
fi

if [[ "$SOLVEX_NEON_TEST_TENANT_A" == "$SOLVEX_NEON_TEST_TENANT_B" ]]; then
  echo "BLOCKED: tenant fixture IDs must be distinct." >&2
  exit 2
fi

export SOLVEX_NEON_ISOLATION_TEST_CONFIRM=DISPOSABLE_NEON_BRANCH_ONLY
exec bash scripts/verify_neon_tenant_isolation.sh
