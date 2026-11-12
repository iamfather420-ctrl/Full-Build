-- Provision the SolveX account only after Neon Auth has verified its email.
-- Run once on the production branch. This is intentionally fail-closed and
-- creates exactly one active OWNER membership in the sole active tenant.
BEGIN;

DO $provision$
DECLARE
  auth_identity record;
  active_tenant_id text;
  active_tenant_count integer;
  owner_email text := current_setting('solvex.owner_email', true);
  app_user_id text;
  owner_role_id text;
  membership_id text;
  now_ms bigint := floor(extract(epoch FROM clock_timestamp()) * 1000);
BEGIN
  IF coalesce(trim(owner_email), '') = '' THEN
    RAISE EXCEPTION 'Provisioning blocked: set solvex.owner_email to the verified account email in this SQL session.';
  END IF;

  SELECT id, email, name
    INTO auth_identity
    FROM neon_auth."user"
   WHERE lower(email) = lower(owner_email)
     AND "emailVerified" IS TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provisioning blocked: Neon Auth email is not verified.';
  END IF;

  SELECT count(*), min(id)
    INTO active_tenant_count, active_tenant_id
    FROM public.tenants
   WHERE status = 'ACTIVE';

  IF active_tenant_count <> 1 THEN
    RAISE EXCEPTION 'Provisioning blocked: expected exactly one active tenant, found %.', active_tenant_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users
     WHERE lower(email) = lower(auth_identity.email)
        OR oidc_subject = auth_identity.id
  ) THEN
    RAISE EXCEPTION 'Provisioning blocked: an application identity already exists for this Neon Auth account.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.tenant_memberships m
      JOIN public.users u ON u.id = m.user_id
     WHERE lower(u.email) = lower(auth_identity.email)
       AND m.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Provisioning blocked: an active membership already exists.';
  END IF;

  app_user_id := 'user-' || gen_random_uuid()::text;
  owner_role_id := 'role-' || gen_random_uuid()::text;
  membership_id := 'membership-' || gen_random_uuid()::text;

  INSERT INTO public.roles
    (id, tenant_id, name, permissions_json, created_at, updated_at, status)
  VALUES
    (owner_role_id, active_tenant_id, 'OWNER', '[]', now_ms, now_ms, 'ACTIVE');

  INSERT INTO public.users
    (id, tenant_id, email, display_name, role, status, created_at, updated_at, oidc_subject)
  VALUES
    (app_user_id, active_tenant_id, auth_identity.email,
     coalesce(auth_identity.name, 'SolveX Owner'), 'OPERATOR', 'ACTIVE',
     now_ms, now_ms, auth_identity.id);

  INSERT INTO public.tenant_memberships
    (id, tenant_id, user_id, role_id, status, created_at, updated_at)
  VALUES
    (membership_id, active_tenant_id, app_user_id, owner_role_id, 'ACTIVE', now_ms, now_ms);

  IF (
    SELECT count(*)
      FROM public.tenant_memberships
     WHERE user_id = app_user_id
       AND status = 'ACTIVE'
  ) <> 1 THEN
    RAISE EXCEPTION 'Provisioning failed: expected exactly one active tenant membership.';
  END IF;

  RAISE NOTICE 'Provisioned verified SolveX owner identity: user_id=%, tenant_id=%, role_id=%, membership_id=%',
    app_user_id, active_tenant_id, owner_role_id, membership_id;
END
$provision$;

COMMIT;
