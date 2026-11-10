-- Fail-closed RLS probe for the SolveX signed-claim architecture.
-- Runs only against the disposable SOLVEX_ISOLATION_TEST Neon branch.
-- This test deliberately does NOT forge or retrieve SOLVEX_AUTH_SECRET.
-- It verifies that an absent/invalid app.auth_token produces no claims and
-- exposes no tenant rows through any protected table. A separate signed-token
-- integration test is still required to prove authenticated A/B isolation.

SELECT set_config('app.auth_token', '', false);

DO $do$
DECLARE
  target_tables text[] := ARRAY[
    'solutions','offers','orders','proof_bundles',
    'proof_evidence','verification_runs','audit_records','telemetry'
  ];
  table_name text;
  r record;
  visible_rows bigint;
  policy_expr text;
  tested integer := 0;
  role_bypass boolean;
  role_super boolean;
  tenant_column_exists boolean;
  claims jsonb;
BEGIN
  SELECT COALESCE(rolbypassrls, true), COALESCE(rolsuper, true)
    INTO role_bypass, role_super
    FROM pg_roles WHERE rolname = current_user;

  IF role_bypass OR role_super THEN
    RAISE EXCEPTION 'Refusing RLS probe under BYPASSRLS/superuser role: %', current_user;
  END IF;

  claims := solvex_private.current_claims();
  IF claims IS NOT NULL THEN
    RAISE EXCEPTION 'Empty app.auth_token unexpectedly produced authenticated claims';
  END IF;

  FOREACH table_name IN ARRAY target_tables LOOP
    SELECT c.relrowsecurity, c.relforcerowsecurity,
           count(p.policyname)::integer AS policy_count,
           string_agg(COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, ''), ' ') AS expr
      INTO r
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_policies p
        ON p.schemaname = n.nspname AND p.tablename = c.relname
     WHERE n.nspname = 'public'
       AND c.relname = table_name
       AND c.relkind IN ('r','p')
     GROUP BY c.relrowsecurity, c.relforcerowsecurity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Required protected table public.% is missing', table_name;
    END IF;
    IF NOT r.relrowsecurity OR NOT r.relforcerowsecurity OR r.policy_count < 1 THEN
      RAISE EXCEPTION 'RLS must be enabled, forced, and policy-backed on public.%', table_name;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
       WHERE c.table_schema = 'public'
         AND c.table_name = table_name
         AND c.column_name = 'tenant_id'
    ) INTO tenant_column_exists;
    IF NOT tenant_column_exists THEN
      RAISE EXCEPTION 'public.% has no tenant_id column', table_name;
    END IF;

    policy_expr := COALESCE(r.expr, '');
    IF policy_expr !~* 'tenant_id'
       OR policy_expr !~* 'solvex_private[.]current_claims[[:space:]]*[(]' THEN
      RAISE EXCEPTION 'public.% policy does not bind tenant_id to solvex_private.current_claims()', table_name;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I', table_name)
      INTO visible_rows;
    IF visible_rows <> 0 THEN
      RAISE EXCEPTION 'Unauthenticated role can see % rows in public.%', visible_rows, table_name;
    END IF;

    tested := tested + 1;
    RAISE NOTICE 'PASS public.%: forced RLS, signed-claims policy, and zero unauthenticated visibility', table_name;
  END LOOP;

  IF tested <> cardinality(target_tables) THEN
    RAISE EXCEPTION 'Only % of % protected tables were tested', tested, cardinality(target_tables);
  END IF;

  RAISE NOTICE 'TENANT_RLS_FAIL_CLOSED_RESULT=PASS tables=% role=%', tested, current_user;
END
$do$;
