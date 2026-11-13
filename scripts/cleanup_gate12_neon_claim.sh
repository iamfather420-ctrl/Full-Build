#!/usr/bin/env bash
set -euo pipefail
url="${SOLVEX_NEON_ISOLATION_MIGRATION_DATABASE_URL:-}"
if [[ -z "$url" || -z "${SOLVEX_GATE12_FIXTURE_TENANT_ID:-}" ]]; then
  echo "No GATE-12 fixture cleanup required."
  exit 0
fi
psql "$url" --no-psqlrc --set=ON_ERROR_STOP=1 \
  --set=tenant_id="$SOLVEX_GATE12_FIXTURE_TENANT_ID" \
  --set=user_id="$SOLVEX_GATE12_FIXTURE_USER_ID" \
  --set=role_id="$SOLVEX_GATE12_FIXTURE_ROLE_ID" \
  --set=membership_id="$SOLVEX_GATE12_FIXTURE_MEMBERSHIP_ID" <<'SQL'
BEGIN;
DELETE FROM public.tenant_memberships WHERE id=:'membership_id';
DELETE FROM public.roles WHERE id=:'role_id' AND tenant_id=:'tenant_id';
DELETE FROM public.users WHERE id=:'user_id' AND tenant_id=:'tenant_id';
DELETE FROM public.tenants WHERE id=:'tenant_id';
COMMIT;
SQL
echo "Removed disposable GATE-12 Neon fixtures."
