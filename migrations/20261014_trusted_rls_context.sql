-- SOLVEX trusted PostgreSQL authorization context.
-- Apply only to an isolated Neon rehearsal branch first. Fail-closed until a privileged
-- operator provisions the signing secret; this file contains no secret values.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS solvex_private;
REVOKE ALL ON SCHEMA solvex_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS solvex_private.auth_secrets (
  secret_name text PRIMARY KEY,
  secret_value text NOT NULL CHECK (length(secret_value) >= 32),
  rotated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE solvex_private.auth_secrets FROM PUBLIC;

CREATE OR REPLACE FUNCTION solvex_private.current_claims()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, solvex_private
AS $fn$
DECLARE
  token text; encoded_claims text; supplied_signature text; signing_secret text;
  claims jsonb; expected_signature text; issued_ms numeric; expires_ms numeric; current_ms numeric;
BEGIN
  token := current_setting('app.auth_token', true);
  IF token IS NULL OR length(token) > 8192 OR length(token) < 16 THEN RETURN NULL; END IF;
  IF length(token) - length(replace(token, '.', '')) <> 1 THEN RETURN NULL; END IF;
  encoded_claims := split_part(token, '.', 1);
  supplied_signature := split_part(token, '.', 2);
  SELECT secret_value INTO signing_secret FROM solvex_private.auth_secrets
    WHERE secret_name = 'SOLVEX_AUTH_SECRET';
  IF signing_secret IS NULL THEN RETURN NULL; END IF;
  expected_signature := encode(public.digest(convert_to(encoded_claims || ':' || signing_secret, 'UTF8'), 'sha256'), 'hex');
  IF supplied_signature <> expected_signature THEN RETURN NULL; END IF;
  BEGIN
    claims := convert_from(decode(encoded_claims, 'base64'), 'UTF8')::jsonb;
    issued_ms := (claims->>'issued_at')::numeric;
    expires_ms := (claims->>'expires_at')::numeric;
    current_ms := extract(epoch FROM clock_timestamp()) * 1000;
  EXCEPTION WHEN OTHERS THEN RETURN NULL;
  END;
  IF coalesce(claims->>'user_id', '') = '' OR
     coalesce(claims->>'tenant_id', '') = '' OR
     coalesce(claims->>'email', '') = '' OR
     claims->>'role' NOT IN ('OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER') OR
     issued_ms > current_ms + 30000 OR expires_ms <= current_ms OR
     expires_ms <= issued_ms OR expires_ms - issued_ms > 900000 THEN RETURN NULL; END IF;
  RETURN claims;
END
$fn$;
REVOKE ALL ON FUNCTION solvex_private.current_claims() FROM PUBLIC;
GRANT USAGE ON SCHEMA solvex_private TO PUBLIC;
GRANT EXECUTE ON FUNCTION solvex_private.current_claims() TO PUBLIC;

DO $migration$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.oid, c.relname,
      EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='tenant_id'
        AND a.attnum>0 AND NOT a.attisdropped) AS has_tenant_id
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND c.relname NOT LIKE '\_%' ESCAPE '\'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t.relname);
    IF t.has_tenant_id THEN
      EXECUTE format(
        'CREATE POLICY solvex_signed_tenant_context ON public.%I AS RESTRICTIVE FOR ALL USING (tenant_id = (solvex_private.current_claims()->>''tenant_id'') OR solvex_private.current_claims()->>''role'' = ''OWNER'') WITH CHECK (tenant_id = (solvex_private.current_claims()->>''tenant_id'') OR solvex_private.current_claims()->>''role'' = ''OWNER'')',
        t.relname);
    ELSE
      EXECUTE format('CREATE POLICY solvex_deny_unclassified ON public.%I AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false)', t.relname);
    END IF;
  END LOOP;
END
$migration$;
COMMIT;

-- A privileged database operator must provision the secret separately, using the same
-- high-entropy value as SOLVEX_AUTH_SECRET. Never commit it or run this as app runtime:
-- INSERT INTO solvex_private.auth_secrets(secret_name, secret_value)
-- VALUES ('SOLVEX_AUTH_SECRET', '<secret from secure secret manager>');
