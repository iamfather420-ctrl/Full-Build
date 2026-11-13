#!/usr/bin/env bash
set -euo pipefail

: "${SOLVEX_NEON_ISOLATION_MIGRATION_DATABASE_URL:?Set the isolated disposable-branch owner URL secret.}"
if [[ -z "${SOLVEX_NEON_ISOLATION_TEST_CONFIRM:-}" || "$SOLVEX_NEON_ISOLATION_TEST_CONFIRM" != "DISPOSABLE_NEON_BRANCH_ONLY" ]]; then
  echo "Refusing to create GATE-12 fixtures without disposable-branch confirmation." >&2
  exit 2
fi
for production_url in "${NEON_DATABASE_URL:-}" "${DATABASE_URL:-}"; do
  if [[ -n "$production_url" && "$production_url" == "$SOLVEX_NEON_ISOLATION_MIGRATION_DATABASE_URL" ]]; then
    echo "Refusing to use the configured application/production database for GATE-12 fixtures." >&2
    exit 3
  fi
done

url="$SOLVEX_NEON_ISOLATION_MIGRATION_DATABASE_URL"
tenant_id="gate12-ci-tenant-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
user_id="gate12-ci-user-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
role_id="gate12-ci-role-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
membership_id="gate12-ci-membership-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
# Bind the disposable CI tenant fixture to the user's already-verified production Neon Auth subject.
# The fixture tenant and app-user row remain isolated and are removed after the run.
subject="550895be-a27e-4e75-9bd7-ee8b5d3cd0f0"
email="i.am.father.420@gmail.com"
now_ms="$(date +%s%3N)"

preflight="$(psql "$url" --no-psqlrc --set=ON_ERROR_STOP=1 --tuples-only --no-align -c "SELECT to_regprocedure('solvex_private.issue_oidc_session_claim(text,text)') IS NOT NULL AND solvex_private.auth_context_ready()")"
if [[ "$preflight" != "t" ]]; then
  echo "GATE-12 isolated Neon branch is missing the signed-tenant-session migration or signing context." >&2
  exit 4
fi
claim="$(psql "$url" --no-psqlrc --set=ON_ERROR_STOP=1 --tuples-only --no-align \
  --set=tenant_id="$tenant_id" --set=user_id="$user_id" --set=role_id="$role_id" \
  --set=membership_id="$membership_id" --set=subject="$subject" --set=email="$email" --set=now_ms="$now_ms" <<'SQL'
BEGIN;
DO $check$ BEGIN
  IF NOT solvex_private.auth_context_ready() THEN
    RAISE EXCEPTION 'GATE-12 signing context is not configured on isolated Neon branch';
  END IF;
END $check$;
INSERT INTO public.tenants(id,name,tier,isolated_storage_key,status,created_at,updated_at)
VALUES (:'tenant_id','GATE-12 disposable CI tenant','STANDARD',:'tenant_id','ACTIVE',:now_ms,:now_ms);
INSERT INTO public.users(id,tenant_id,email,display_name,role,status,created_at,updated_at,oidc_subject)
VALUES (:'user_id',:'tenant_id',:'email','GATE-12 CI identity','OPERATOR','ACTIVE',:now_ms,:now_ms,:'subject');
INSERT INTO public.roles(id,tenant_id,name,permissions_json,created_at,updated_at,status)
VALUES (:'role_id',:'tenant_id','OWNER','[]',:now_ms,:now_ms,'ACTIVE');
INSERT INTO public.tenant_memberships(id,tenant_id,user_id,role_id,status,created_at,updated_at)
VALUES (:'membership_id',:'tenant_id',:'user_id',:'role_id','ACTIVE',:now_ms,:now_ms);
SELECT signed_token FROM solvex_private.issue_oidc_session_claim(:'subject',:'email');
COMMIT;
SQL
)"
if [[ -z "$claim" || "$claim" != *.* ]]; then
  echo "GATE-12 isolated Neon claim issuance returned no usable token." >&2
  exit 4
fi
echo "::add-mask::$claim"

# Independently prove tenant RLS under the runtime role in the same isolated branch.
other_tenant_id="${tenant_id}-other"
other_user_id="${user_id}-other"
other_role_id="${role_id}-other"
other_membership_id="${membership_id}-other"
psql "$url" --no-psqlrc --set=ON_ERROR_STOP=1 \
  --set=tenant_id="$other_tenant_id" --set=user_id="$other_user_id" \
  --set=role_id="$other_role_id" --set=membership_id="$other_membership_id" \
  --set=claim="$claim" --set=now_ms="$now_ms" <<'SQL'
BEGIN;
INSERT INTO public.tenants(id,name,tier,isolated_storage_key,status,created_at,updated_at)
VALUES (:'tenant_id','GATE-12 RLS isolation probe','STANDARD',:'tenant_id','ACTIVE',:now_ms,:now_ms);
INSERT INTO public.users(id,tenant_id,email,display_name,role,status,created_at,updated_at,oidc_subject)
VALUES (:'user_id',:'tenant_id',:'user_id' || '@example.invalid','RLS probe','OPERATOR','ACTIVE',:now_ms,:now_ms,:'user_id');
INSERT INTO public.roles(id,tenant_id,name,permissions_json,created_at,updated_at,status)
VALUES (:'role_id',:'tenant_id','OWNER','[]',:now_ms,:now_ms,'ACTIVE');
INSERT INTO public.tenant_memberships(id,tenant_id,user_id,role_id,status,created_at,updated_at)
VALUES (:'membership_id',:'tenant_id',:'user_id',:'role_id','ACTIVE',:now_ms,:now_ms);
SELECT set_config('app.auth_token', :'claim', true);
SET LOCAL ROLE solvex_runtime_login_v2;
DO $rls$
DECLARE visible_tenants integer; visible_users integer;
BEGIN
  SELECT count(*) INTO visible_tenants FROM public.tenants;
  SELECT count(*) INTO visible_users FROM public.users;
  IF visible_tenants <> 1 OR visible_users <> 1 THEN
    RAISE EXCEPTION 'GATE-12 tenant RLS leaked rows: tenants %, users %', visible_tenants, visible_users;
  END IF;
END
$rls$;
RESET ROLE;
ROLLBACK;
SQL

{
  echo "SOLVEX_GATE12_NEON_TENANT_CLAIM=$claim"
  echo "SOLVEX_GATE12_DATABASE_URL=$url"
  echo "SOLVEX_GATE12_RLS_VERIFIED=true"
  echo "SOLVEX_GATE12_FIXTURE_TENANT_ID=$tenant_id"
  echo "SOLVEX_GATE12_FIXTURE_USER_ID=$user_id"
  echo "SOLVEX_GATE12_FIXTURE_ROLE_ID=$role_id"
  echo "SOLVEX_GATE12_FIXTURE_MEMBERSHIP_ID=$membership_id"
} >> "$GITHUB_ENV"
echo "Prepared one short-lived signed tenant claim on the isolated Neon branch for GATE-12."
