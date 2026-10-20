-- GATE-11 REMEDIATION CANDIDATE — NOT AUTO-EXECUTED.
-- Requires a current backup/recovery point, owner review, and application-path testing.
-- Apply only to the verified SolveX production branch after an approved change window.
-- This preserves the existing login role name/password and its membership in solvex_app_runtime,
-- but removes its elevated Neon administrator membership and direct elevated role flags.
-- payment_events has no tenant_id, so it is deny-all until a tenant-safe event model is approved.
-- Do not enable payments/PayPal as part of this migration.

BEGIN;

-- Do not try to revoke Neon-managed neon_superuser membership from the existing
-- login: Neon correctly rejects that operation for this connection. Instead,
-- create a new SQL-native role with no elevated membership and preserve the
-- existing login untouched for rollback until the application is switched.
CREATE ROLE solvex_runtime_v2
  NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT solvex_app_runtime TO solvex_runtime_v2;
ALTER ROLE solvex_runtime_v2
  LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- Assign an unexposed random initial password. After this transaction is
-- applied in an approved change window, rotate it via the Neon role-password
-- API and place the returned value into the deployment secret store.
DO $password$
BEGIN
  EXECUTE format(
    'ALTER ROLE solvex_runtime_v2 PASSWORD %L',
    encode(public.gen_random_bytes(32), 'hex')
  );
END
$password$;

-- Tenant-scoped payment records use the existing signed claim contract.
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS solvex_tenant_access ON public.payment_orders;
DROP POLICY IF EXISTS solvex_signed_tenant_context ON public.payment_orders;
CREATE POLICY solvex_tenant_access ON public.payment_orders
  -- Authorization roles never bypass tenant boundaries. Even OWNER claims
  -- must carry the matching tenant_id; cross-tenant administration needs a
  -- separate, explicit audited pathway rather than an RLS policy bypass.
  USING (
    tenant_id = NULLIF(solvex_private.current_claims() ->> 'tenant_id', '')
  )
  WITH CHECK (
    tenant_id = NULLIF(solvex_private.current_claims() ->> 'tenant_id', '')
  );

ALTER TABLE public.payment_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_fulfillments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS solvex_tenant_access ON public.payment_fulfillments;
DROP POLICY IF EXISTS solvex_signed_tenant_context ON public.payment_fulfillments;
CREATE POLICY solvex_tenant_access ON public.payment_fulfillments
  -- Authorization roles never bypass tenant boundaries. Even OWNER claims
  -- must carry the matching tenant_id; cross-tenant administration needs a
  -- separate, explicit audited pathway rather than an RLS policy bypass.
  USING (
    tenant_id = NULLIF(solvex_private.current_claims() ->> 'tenant_id', '')
  )
  WITH CHECK (
    tenant_id = NULLIF(solvex_private.current_claims() ->> 'tenant_id', '')
  );

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS solvex_tenant_access ON public.payment_refunds;
DROP POLICY IF EXISTS solvex_signed_tenant_context ON public.payment_refunds;
CREATE POLICY solvex_tenant_access ON public.payment_refunds
  -- Authorization roles never bypass tenant boundaries. Even OWNER claims
  -- must carry the matching tenant_id; cross-tenant administration needs a
  -- separate, explicit audited pathway rather than an RLS policy bypass.
  USING (
    tenant_id = NULLIF(solvex_private.current_claims() ->> 'tenant_id', '')
  )
  WITH CHECK (
    tenant_id = NULLIF(solvex_private.current_claims() ->> 'tenant_id', '')
  );

-- Webhook/event table lacks tenant_id. Fail closed while payments remain disabled.
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS solvex_deny_unclassified ON public.payment_events;
DROP POLICY IF EXISTS solvex_tenant_access ON public.payment_events;
DROP POLICY IF EXISTS solvex_signed_tenant_context ON public.payment_events;
CREATE POLICY solvex_deny_unclassified ON public.payment_events
  USING (false)
  WITH CHECK (false);

DO $verify$
DECLARE
  r RECORD;
  t TEXT;
BEGIN
  SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
    INTO r FROM pg_roles WHERE rolname = 'solvex_runtime_v2';
  IF NOT FOUND OR NOT r.rolcanlogin OR r.rolsuper OR r.rolcreatedb
     OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls THEN
    RAISE EXCEPTION 'solvex_runtime_v2 privilege flags are not least-privilege';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles parent ON parent.oid = am.roleid
    JOIN pg_roles member ON member.oid = am.member
    WHERE parent.rolname = 'neon_superuser'
      AND member.rolname = 'solvex_runtime_v2'
  ) THEN
    RAISE EXCEPTION 'solvex_runtime_v2 must not inherit neon_superuser';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles parent ON parent.oid = am.roleid
    JOIN pg_roles member ON member.oid = am.member
    WHERE parent.rolname = 'solvex_app_runtime'
      AND member.rolname = 'solvex_runtime_v2'
  ) THEN
    RAISE EXCEPTION 'solvex_runtime_v2 is missing the application runtime role';
  END IF;

  FOREACH t IN ARRAY ARRAY['payment_orders','payment_fulfillments','payment_refunds','payment_events'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t
        AND c.relrowsecurity AND c.relforcerowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS is not enabled and forced for public.%', t;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = t
    ) THEN
      RAISE EXCEPTION 'No policy exists for public.%', t;
    END IF;

    -- Verify policy semantics as well as RLS metadata: no OWNER bypass,
    -- and the unclassified event table remains deny-all.
    IF t IN ('payment_orders', 'payment_fulfillments', 'payment_refunds') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename = t
          AND p.policyname = 'solvex_tenant_access'
          AND position('tenant_id' IN coalesce(p.qual, '')) > 0
          AND position('tenant_id' IN coalesce(p.with_check, '')) > 0
          AND position('OWNER' IN coalesce(p.qual, '') || coalesce(p.with_check, '')) = 0
      ) THEN
        RAISE EXCEPTION 'Tenant policy semantics are unsafe for public.%', t;
      END IF;
    ELSIF t = 'payment_events' THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename = t
          AND p.policyname = 'solvex_deny_unclassified'
          AND lower(coalesce(p.qual, '')) = 'false'
          AND lower(coalesce(p.with_check, '')) = 'false'
      ) THEN
        RAISE EXCEPTION 'Unclassified payment_events must remain deny-all';
      END IF;
    END IF;
  END LOOP;
END
$verify$;

COMMIT;
