-- OIDC-backed API sessions and signed tenant claims.
-- Safe to apply repeatedly. No users, tenants, memberships, or credentials are created here.
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  sid varchar(64) PRIMARY KEY,
  sess jsonb NOT NULL,
  expire timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_expire_idx ON public.auth_sessions(expire);

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
   WHERE u.id = p_subject
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
GRANT EXECUTE ON FUNCTION solvex_private.issue_oidc_session_claim(text,text) TO CURRENT_USER;
