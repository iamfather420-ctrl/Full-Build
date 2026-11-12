-- Run only on a disposable Neon validation branch with the auth migration applied.
-- Uses the existing signing secret through the SECURITY DEFINER issuer; never reads or prints it.
BEGIN;

DO $preflight$
BEGIN
  IF NOT solvex_private.auth_context_ready() THEN
    RAISE EXCEPTION 'Tenant claim signing context is not configured on this validation branch';
  END IF;
END
$preflight$;

INSERT INTO public.tenants
  (id,name,tier,isolated_storage_key,status,created_at,updated_at)
VALUES
  ('ci-oidc-tenant-a','CI OIDC tenant A','STANDARD','ci-oidc-storage-a','ACTIVE',1,1);

INSERT INTO public.users
  (id,tenant_id,email,display_name,role,status,created_at,updated_at,oidc_subject)
VALUES
  ('ci-oidc-user-a','ci-oidc-tenant-a','oidc-ci@example.invalid','OIDC CI User','OPERATOR','ACTIVE',1,1,'ci-oidc-subject-a');

INSERT INTO public.roles
  (id,tenant_id,name,permissions_json,created_at,updated_at,status)
VALUES
  ('ci-oidc-role-a','ci-oidc-tenant-a','CUSTOMER','[]',1,1,'ACTIVE');

INSERT INTO public.tenant_memberships
  (id,tenant_id,user_id,role_id,status,created_at)
VALUES
  ('ci-oidc-membership-a','ci-oidc-tenant-a','ci-oidc-user-a','ci-oidc-role-a','ACTIVE',1);

DO $claims$
DECLARE issued record; verified jsonb;
BEGIN
  SELECT * INTO issued
    FROM solvex_private.issue_oidc_session_claim('ci-oidc-subject-a','oidc-ci@example.invalid');
  IF issued.user_id <> 'ci-oidc-user-a'
     OR issued.tenant_id <> 'ci-oidc-tenant-a'
     OR issued.role <> 'CUSTOMER'
     OR issued.signed_token IS NULL THEN
    RAISE EXCEPTION 'OIDC claim issuance returned incorrect identity';
  END IF;

  PERFORM set_config('app.auth_token',issued.signed_token,true);
  verified := solvex_private.current_claims();
  IF verified->>'user_id' <> 'ci-oidc-user-a'
     OR verified->>'tenant_id' <> 'ci-oidc-tenant-a'
     OR verified->>'role' <> 'CUSTOMER' THEN
    RAISE EXCEPTION 'Issued signed tenant claim failed verification';
  END IF;

  PERFORM set_config('app.auth_token',issued.signed_token || '0',true);
  IF solvex_private.current_claims() IS NOT NULL THEN
    RAISE EXCEPTION 'Tampered tenant claim did not fail closed';
  END IF;

  BEGIN
    PERFORM * FROM solvex_private.issue_oidc_session_claim('ci-oidc-subject-a','wrong@example.invalid');
    RAISE EXCEPTION 'OIDC email mismatch was unexpectedly accepted';
  EXCEPTION WHEN invalid_authorization_specification THEN
    NULL;
  END;
END
$claims$;

-- A second tenant and user must remain invisible under the first tenant's signed claim.
INSERT INTO public.tenants
  (id,name,tier,isolated_storage_key,status,created_at,updated_at)
VALUES
  ('ci-oidc-tenant-b','CI OIDC tenant B','STANDARD','ci-oidc-storage-b','ACTIVE',1,1);
INSERT INTO public.users
  (id,tenant_id,email,display_name,role,status,created_at,updated_at,oidc_subject)
VALUES
  ('ci-oidc-user-b','ci-oidc-tenant-b','oidc-ci-b@example.invalid','OIDC CI User B','OPERATOR','ACTIVE',1,1,'ci-oidc-subject-b');

SELECT set_config(
  'app.auth_token',
  (SELECT signed_token FROM solvex_private.issue_oidc_session_claim('ci-oidc-subject-a','oidc-ci@example.invalid')),
  true
);
SET LOCAL ROLE solvex_runtime_login_v2;
DO $rls$
DECLARE visible_tenants integer; visible_users integer;
BEGIN
  SELECT count(*) INTO visible_tenants FROM public.tenants;
  SELECT count(*) INTO visible_users FROM public.users;
  IF visible_tenants <> 1 OR visible_users <> 1 THEN
    RAISE EXCEPTION 'Tenant RLS leaked rows: tenants %, users %', visible_tenants, visible_users;
  END IF;
END
$rls$;
RESET ROLE;

-- A second active membership must make identity resolution ambiguous and fail closed.
INSERT INTO public.roles
  (id,tenant_id,name,permissions_json,created_at,updated_at,status)
VALUES
  ('ci-oidc-role-b','ci-oidc-tenant-b','CUSTOMER','[]',1,1,'ACTIVE');
INSERT INTO public.tenant_memberships
  (id,tenant_id,user_id,role_id,status,created_at)
VALUES
  ('ci-oidc-membership-b','ci-oidc-tenant-b','ci-oidc-user-a','ci-oidc-role-b','ACTIVE',2);

DO $ambiguous$
BEGIN
  BEGIN
    PERFORM * FROM solvex_private.issue_oidc_session_claim('ci-oidc-subject-a','oidc-ci@example.invalid');
    RAISE EXCEPTION 'Ambiguous multi-tenant identity was unexpectedly accepted';
  EXCEPTION WHEN invalid_authorization_specification THEN
    NULL;
  END;
END
$ambiguous$;

ROLLBACK;
