-- OIDC-backed API sessions and signed tenant claims.
-- Safe to apply repeatedly. No users, tenants, memberships, or credentials are created here.
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  sid varchar(64) PRIMARY KEY,
  sess jsonb NOT NULL,
  expire timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_expire_idx ON public.auth_sessions(expire);

-- Map the verified OIDC issuer subject to an existing internal user id.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS oidc_subject text;
CREATE UNIQUE INDEX IF NOT EXISTS users_oidc_subject_unique
  ON public.users(oidc_subject) WHERE oidc_subject IS NOT NULL;

-- The tenants table is keyed by id; tenant_id is an optional parent/reference field.
-- Replace the previous tenant_id-based policies, which hid tenant rows from RLS clients.
DROP POLICY IF EXISTS solvex_signed_tenant_context ON public.tenants;
DROP POLICY IF EXISTS solvex_tenant_access ON public.tenants;
CREATE POLICY solvex_signed_tenant_context ON public.tenants
  USING (id = (solvex_private.current_claims()->>'tenant_id'))
  WITH CHECK (id = (solvex_private.current_claims()->>'tenant_id'));

CREATE OR REPLACE FUNCTION solvex_private.issue_oidc_session_claim(
  p_subject text,
  p_email text
)
RETURNS TABLE (
  user_id text,
  email text,
  display_name text,
  tenant_id text,
  role text,
  signed_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, solvex_private
AS $function$
DECLARE
  identity_row record;
  signing_secret text;
  issued_ms bigint;
  expires_ms bigint;
  claims jsonb;
  encoded_claims text;
  signature text;
BEGIN
  IF coalesce(trim(p_subject), '') = '' OR coalesce(trim(p_email), '') = '' THEN
    RAISE EXCEPTION 'OIDC subject and email are required' USING ERRCODE = '28000';
  END IF;

  SELECT u.id, u.email, u.display_name, t.id AS tenant_id, upper(r.name) AS role
    INTO identity_row
    FROM public.users u
    JOIN public.tenant_memberships m
      ON m.user_id = u.id AND m.status = 'ACTIVE'
    JOIN public.tenants t
      ON t.id = m.tenant_id AND t.status = 'ACTIVE'
    JOIN public.roles r
      ON r.id = m.role_id AND r.tenant_id = m.tenant_id AND r.status = 'ACTIVE'
   WHERE u.oidc_subject = p_subject
     AND lower(u.email) = lower(p_email)
     AND u.status = 'ACTIVE'
     AND upper(r.name) IN ('OWNER','ADMIN','VERIFIER','CUSTOMER')
   ORDER BY m.created_at
   LIMIT 2;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active OIDC user, tenant, and authorized role membership exists' USING ERRCODE = '28000';
  END IF;

  IF (SELECT count(*) FROM public.tenant_memberships m
      JOIN public.tenants t ON t.id=m.tenant_id AND t.status='ACTIVE'
      JOIN public.roles r ON r.id=m.role_id AND r.tenant_id=m.tenant_id AND r.status='ACTIVE'
      WHERE m.user_id=p_subject AND m.status='ACTIVE'
        AND upper(r.name) IN ('OWNER','ADMIN','VERIFIER','CUSTOMER')) <> 1 THEN
    RAISE EXCEPTION 'OIDC identity must resolve to exactly one active tenant membership' USING ERRCODE = '28000';
  END IF;

  SELECT secret_value INTO signing_secret
    FROM solvex_private.auth_secrets
   WHERE secret_name='SOLVEX_AUTH_SECRET';
  IF signing_secret IS NULL OR length(signing_secret) < 32 THEN
    RAISE EXCEPTION 'Tenant claim signing secret is unavailable' USING ERRCODE = '55000';
  END IF;

  issued_ms := floor(extract(epoch FROM clock_timestamp()) * 1000);
  expires_ms := issued_ms + 900000;
  claims := jsonb_build_object(
    'user_id', identity_row.id,
    'email', identity_row.email,
    'tenant_id', identity_row.tenant_id,
    'role', identity_row.role,
    'issued_at', issued_ms,
    'expires_at', expires_ms
  );
  encoded_claims := replace(encode(convert_to(claims::text, 'UTF8'), 'base64'), E'\n', '');
  signature := encode(public.hmac(convert_to(encoded_claims, 'UTF8'),
                                  convert_to(signing_secret, 'UTF8'), 'sha256'), 'hex');

  RETURN QUERY SELECT identity_row.id, identity_row.email,
    identity_row.display_name, identity_row.tenant_id, identity_row.role,
    encoded_claims || '.' || signature;
END
$function$;

REVOKE ALL ON FUNCTION solvex_private.issue_oidc_session_claim(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION solvex_private.issue_oidc_session_claim(text,text) TO neondb_owner, solvex_runtime_login_v2;
GRANT USAGE ON SCHEMA solvex_private TO solvex_runtime_login_v2;
GRANT EXECUTE ON FUNCTION solvex_private.current_claims() TO solvex_runtime_login_v2;
GRANT SELECT ON public.users, public.tenants, public.roles, public.tenant_memberships TO solvex_runtime_login_v2;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_sessions TO solvex_runtime_login_v2;
