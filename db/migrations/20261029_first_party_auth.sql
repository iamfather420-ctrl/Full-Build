-- First-party auth persistence. REVIEWED ADDITIVE MIGRATION; DO NOT RUN AGAINST PRODUCTION
-- until approved, staged, and the migration checksum/owner/role grants are verified.
-- This migration deliberately adds auth-only tables and SECURITY DEFINER functions.
-- Functions use a fixed search_path, fully-qualified table references, and narrow grants.

BEGIN;

CREATE TABLE IF NOT EXISTS solvex_private.auth_invitations (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_by text NOT NULL,
  created_at bigint NOT NULL,
  expires_at bigint NOT NULL,
  used_at bigint,
  CHECK (expires_at > created_at),
  CHECK (used_at IS NULL OR used_at >= created_at)
);

CREATE INDEX IF NOT EXISTS auth_invitations_tenant_expiry_idx
  ON solvex_private.auth_invitations (tenant_id, expires_at)
  WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS solvex_private.auth_credentials (
  tenant_id text NOT NULL REFERENCES public.tenants(id),
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  password_salt text NOT NULL CHECK (password_salt ~ '^[0-9a-f]{32}$'),
  password_hash text NOT NULL CHECK (password_hash ~ '^[0-9a-f]{128}$'),
  disabled boolean NOT NULL DEFAULT false,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  PRIMARY KEY (tenant_id, user_id),
  UNIQUE (tenant_id, email),
  FOREIGN KEY (tenant_id, email) REFERENCES public.users(tenant_id, email) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS solvex_private.auth_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  tenant_id text NOT NULL REFERENCES public.tenants(id),
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at bigint NOT NULL,
  expires_at bigint NOT NULL,
  revoked_at bigint,
  CHECK (expires_at > created_at),
  CHECK (revoked_at IS NULL OR revoked_at >= created_at),
  FOREIGN KEY (tenant_id, user_id) REFERENCES public.tenant_memberships(tenant_id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_tenant_idx
  ON solvex_private.auth_sessions (tenant_id, user_id, expires_at);

CREATE TABLE IF NOT EXISTS solvex_private.auth_audit (
  id text PRIMARY KEY,
  event text NOT NULL CHECK (event IN ('REGISTERED','LOGIN_SUCCEEDED','LOGIN_REJECTED','REGISTRATION_REJECTED','SESSION_REVOKED')),
  user_id text,
  tenant_id text,
  occurred_at bigint NOT NULL,
  reason text
);

CREATE INDEX IF NOT EXISTS auth_audit_tenant_time_idx
  ON solvex_private.auth_audit (tenant_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION solvex_private.auth_register_from_invitation(
  p_invitation_hash text, p_email text, p_password_salt text, p_password_hash text, p_now bigint
) RETURNS TABLE(user_id text, email text, tenant_id text, role text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, solvex_private
AS $$
DECLARE
  v_invitation solvex_private.auth_invitations%ROWTYPE;
  v_role_id text;
  v_user_id text;
BEGIN
  IF p_invitation_hash !~ '^[0-9a-f]{64}$'
     OR p_email IS NULL OR length(p_email) > 254
     OR p_password_salt !~ '^[0-9a-f]{32}$'
     OR p_password_hash !~ '^[0-9a-f]{128}$' THEN
    RETURN;
  END IF;

  SELECT * INTO v_invitation
  FROM solvex_private.auth_invitations i
  WHERE i.token_hash = p_invitation_hash
    AND i.used_at IS NULL
    AND i.expires_at > p_now
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = v_invitation.tenant_id AND t.status = 'ACTIVE'
  ) THEN RETURN; END IF;

  SELECT r.id INTO v_role_id
  FROM public.roles r
  WHERE r.tenant_id = v_invitation.tenant_id
    AND r.name = 'CUSTOMER'
    AND COALESCE(r.status, 'ACTIVE') = 'ACTIVE'
  LIMIT 1;

  -- Do not manufacture tenant roles or grant a privileged role during registration.
  IF v_role_id IS NULL THEN RETURN; END IF;
  IF EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.tenant_id = v_invitation.tenant_id AND lower(u.email) = lower(trim(p_email))
  ) THEN RETURN; END IF;

  v_user_id := gen_random_uuid()::text;
  INSERT INTO public.users (id, tenant_id, email, role, status, created_at, updated_at)
  VALUES (v_user_id, v_invitation.tenant_id, lower(trim(p_email)), 'CUSTOMER', 'ACTIVE', p_now, p_now);

  INSERT INTO solvex_private.auth_credentials
    (tenant_id, user_id, email, password_salt, password_hash, disabled, created_at, updated_at)
  VALUES
    (v_invitation.tenant_id, v_user_id, lower(trim(p_email)), p_password_salt, p_password_hash, false, p_now, p_now);

  INSERT INTO public.tenant_memberships (id, tenant_id, user_id, role_id, status, created_at, updated_at)
  VALUES (gen_random_uuid()::text, v_invitation.tenant_id, v_user_id, v_role_id, 'ACTIVE', p_now, p_now);

  UPDATE solvex_private.auth_invitations SET used_at = p_now WHERE id = v_invitation.id;
  RETURN QUERY SELECT v_user_id, lower(trim(p_email)), v_invitation.tenant_id, 'CUSTOMER'::text;
EXCEPTION WHEN unique_violation THEN
  -- Atomic subtransaction rollback ensures no partial account/membership is retained.
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION solvex_private.auth_find_credential_by_email(p_email text, p_tenant_id text)
RETURNS TABLE(user_id text, email text, password_salt text, password_hash text, disabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, solvex_private
AS $$
  SELECT c.user_id, c.email, c.password_salt, c.password_hash,
         (c.disabled OR u.status <> 'ACTIVE' OR t.status <> 'ACTIVE') AS disabled
  FROM solvex_private.auth_credentials c
  JOIN public.users u ON u.id = c.user_id AND u.tenant_id = c.tenant_id
  JOIN public.tenants t ON t.id = c.tenant_id
  WHERE c.tenant_id = p_tenant_id AND c.email = lower(trim(p_email))
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION solvex_private.auth_find_credential_by_user(p_user_id text, p_tenant_id text)
RETURNS TABLE(user_id text, email text, password_salt text, password_hash text, disabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, solvex_private
AS $$
  SELECT c.user_id, c.email, c.password_salt, c.password_hash,
         (c.disabled OR u.status <> 'ACTIVE' OR t.status <> 'ACTIVE') AS disabled
  FROM solvex_private.auth_credentials c
  JOIN public.users u ON u.id = c.user_id AND u.tenant_id = c.tenant_id
  JOIN public.tenants t ON t.id = c.tenant_id
  WHERE c.tenant_id = p_tenant_id AND c.user_id = p_user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION solvex_private.auth_find_membership(p_user_id text, p_tenant_id text)
RETURNS TABLE(tenant_id text, role text, active boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, solvex_private
AS $$
  SELECT m.tenant_id, r.name,
         (m.status = 'ACTIVE' AND COALESCE(r.status, 'ACTIVE') = 'ACTIVE' AND t.status = 'ACTIVE') AS active
  FROM public.tenant_memberships m
  JOIN public.roles r ON r.id = m.role_id AND r.tenant_id = m.tenant_id
  JOIN public.tenants t ON t.id = m.tenant_id
  WHERE m.user_id = p_user_id AND m.tenant_id = p_tenant_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION solvex_private.auth_create_session(
  p_token_hash text, p_user_id text, p_tenant_id text, p_created_at bigint, p_expires_at bigint
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, solvex_private
AS $$
BEGIN
  IF p_token_hash !~ '^[0-9a-f]{64}$' OR p_expires_at <= p_created_at
     OR NOT EXISTS (
       SELECT 1 FROM solvex_private.auth_credentials c
       JOIN public.tenant_memberships m ON m.user_id = c.user_id AND m.tenant_id = c.tenant_id
       JOIN public.tenants t ON t.id = c.tenant_id
       WHERE c.user_id = p_user_id AND c.tenant_id = p_tenant_id
         AND c.disabled = false AND m.status = 'ACTIVE' AND t.status = 'ACTIVE'
     ) THEN RETURN false; END IF;
  INSERT INTO solvex_private.auth_sessions(token_hash, tenant_id, user_id, created_at, expires_at, revoked_at)
  VALUES (p_token_hash, p_tenant_id, p_user_id, p_created_at, p_expires_at, NULL);
  RETURN true;
EXCEPTION WHEN unique_violation THEN RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION solvex_private.auth_find_session(p_token_hash text)
RETURNS TABLE(token_hash text, user_id text, tenant_id text, created_at bigint, expires_at bigint, revoked_at bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, solvex_private
AS $$
  SELECT s.token_hash, s.user_id, s.tenant_id, s.created_at, s.expires_at, s.revoked_at
  FROM solvex_private.auth_sessions s WHERE s.token_hash = p_token_hash LIMIT 1
$$;

CREATE OR REPLACE FUNCTION solvex_private.auth_revoke_session(p_token_hash text, p_revoked_at bigint)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, solvex_private
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE solvex_private.auth_sessions SET revoked_at = p_revoked_at
  WHERE token_hash = p_token_hash AND revoked_at IS NULL AND expires_at > p_revoked_at;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION solvex_private.auth_append_audit(
  p_event text, p_user_id text, p_tenant_id text, p_occurred_at bigint, p_reason text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, solvex_private
AS $$
BEGIN
  IF p_event NOT IN ('REGISTERED','LOGIN_SUCCEEDED','LOGIN_REJECTED','REGISTRATION_REJECTED','SESSION_REVOKED') THEN
    RAISE EXCEPTION 'Invalid authentication audit event';
  END IF;
  INSERT INTO solvex_private.auth_audit(id, event, user_id, tenant_id, occurred_at, reason)
  VALUES (gen_random_uuid()::text, p_event, p_user_id, p_tenant_id, p_occurred_at, left(p_reason, 200));
END;
$$;

REVOKE ALL ON TABLE solvex_private.auth_invitations, solvex_private.auth_credentials,
  solvex_private.auth_sessions, solvex_private.auth_audit FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION solvex_private.auth_register_from_invitation(text,text,text,text,bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION solvex_private.auth_find_credential_by_email(text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION solvex_private.auth_find_credential_by_user(text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION solvex_private.auth_find_membership(text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION solvex_private.auth_create_session(text,text,text,bigint,bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION solvex_private.auth_find_session(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION solvex_private.auth_revoke_session(text,bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION solvex_private.auth_append_audit(text,text,text,bigint,text) FROM PUBLIC;

GRANT USAGE ON SCHEMA solvex_private TO solvex_app_runtime;
GRANT EXECUTE ON FUNCTION solvex_private.auth_register_from_invitation(text,text,text,text,bigint) TO solvex_app_runtime;
GRANT EXECUTE ON FUNCTION solvex_private.auth_find_credential_by_email(text,text) TO solvex_app_runtime;
GRANT EXECUTE ON FUNCTION solvex_private.auth_find_credential_by_user(text,text) TO solvex_app_runtime;
GRANT EXECUTE ON FUNCTION solvex_private.auth_find_membership(text,text) TO solvex_app_runtime;
GRANT EXECUTE ON FUNCTION solvex_private.auth_create_session(text,text,text,bigint,bigint) TO solvex_app_runtime;
GRANT EXECUTE ON FUNCTION solvex_private.auth_find_session(text) TO solvex_app_runtime;
GRANT EXECUTE ON FUNCTION solvex_private.auth_revoke_session(text,bigint) TO solvex_app_runtime;
GRANT EXECUTE ON FUNCTION solvex_private.auth_append_audit(text,text,text,bigint,text) TO solvex_app_runtime;

COMMIT;
