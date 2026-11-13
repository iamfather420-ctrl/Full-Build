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
  v_table_name text;
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

  FOREACH v_table_name IN ARRAY target_tables LOOP
    SELECT c.relrowsecurity, c.relforcerowsecurity,
           count(p.policyname)::integer AS policy_count,
           string_agg(COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, ''), ' ') AS expr
      INTO r
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_policies p
        ON p.schemaname = n.nspname AND p.tablename = c.relname
     WHERE n.nspname = 'public'
       AND c.relname = v_table_name
       AND c.relkind IN ('r','p')
     GROUP BY c.relrowsecurity, c.relforcerowsecurity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Required protected table public.% is missing', v_table_name;
    END IF;
    IF NOT r.relrowsecurity OR NOT r.relforcerowsecurity OR r.policy_count < 1 THEN
      RAISE EXCEPTION 'RLS must be enabled, forced, and policy-backed on public.%', v_table_name;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
       WHERE c.table_schema = 'public'
         AND c.table_name = v_table_name
         AND c.column_name = 'tenant_id'
    ) INTO tenant_column_exists;
    IF NOT tenant_column_exists THEN
      RAISE EXCEPTION 'public.% has no tenant_id column', v_table_name;
    END IF;

    policy_expr := COALESCE(r.expr, '');
    IF policy_expr !~* 'tenant_id'
       OR policy_expr !~* 'solvex_private[.]current_claims[[:space:]]*[(]' THEN
      RAISE EXCEPTION 'public.% policy does not bind tenant_id to solvex_private.current_claims()', v_table_name;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I', v_table_name)
      INTO visible_rows;
    IF visible_rows <> 0 THEN
      RAISE EXCEPTION 'Unauthenticated role can see % rows in public.%', visible_rows, v_table_name;
    END IF;

    tested := tested + 1;
    RAISE NOTICE 'PASS public.%: forced RLS, signed-claims policy, and zero unauthenticated visibility', v_table_name;
  END LOOP;

  IF tested <> cardinality(target_tables) THEN
    RAISE EXCEPTION 'Only % of % protected tables were tested', tested, cardinality(target_tables);
  END IF;

  RAISE NOTICE 'TENANT_RLS_FAIL_CLOSED_RESULT=PASS tables=% role=%', tested, current_user;
END
$do$;


-- Authenticated A/B read and cross-tenant UPDATE checks.
-- The disposable branch provisions solvex_private.issue_ci_isolation_token(text),
-- a SECURITY DEFINER helper restricted to session_user=solvex_iso_test and the
-- two fixed fixture tenant IDs. It signs short-lived tokens internally; the
-- secret and tokens are never printed or returned to CI logs.
DO $authenticated$
DECLARE
  tables text[] := ARRAY['solutions','offers','orders','proof_bundles','proof_evidence','verification_runs','audit_records','telemetry'];
  t text; token_a text; token_b text; visible_rows bigint; own_rows bigint; foreign_rows bigint;
  changed bigint; denied boolean; tested_reads integer:=0; tested_writes integer:=0;
  fixture_suffix text := replace(gen_random_uuid()::text,'-','');
  fixture_a text := 'solvex-stage19-a-' || fixture_suffix;
  fixture_b text := 'solvex-stage19-b-' || fixture_suffix;
BEGIN
  IF current_user <> 'solvex_iso_test' OR session_user <> 'solvex_iso_test' THEN
    RAISE EXCEPTION 'Must run directly as solvex_iso_test';
  END IF;
  IF (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname=current_user) THEN
    RAISE EXCEPTION 'Test role bypasses RLS';
  END IF;
  token_a:=solvex_private.issue_ci_isolation_token('tenant-enterprise-demo');
  token_b:=solvex_private.issue_ci_isolation_token('tenant-isolation-test-b');

  PERFORM set_config('app.auth_token',token_a,true);
  IF solvex_private.current_claims()->>'tenant_id' <> 'tenant-enterprise-demo' THEN
    RAISE EXCEPTION 'Tenant A token invalid';
  END IF;
  INSERT INTO public.solutions
    (id,tenant_id,code,title,domain,implementation_source,implementation_hash,verification_status,created_at)
  VALUES
    (fixture_a,'tenant-enterprise-demo',fixture_a,'Stage 19 disposable tenant A fixture','security',
     'TEST_ONLY_NOT_A_SOLUTION',repeat('a',64),'PENDING_VERIFICATION',extract(epoch FROM clock_timestamp())::bigint);
  PERFORM set_config('app.auth_token',token_b,true);
  INSERT INTO public.solutions
    (id,tenant_id,code,title,domain,implementation_source,implementation_hash,verification_status,created_at)
  VALUES
    (fixture_b,'tenant-isolation-test-b',fixture_b,'Stage 19 disposable tenant B fixture','security',
     'TEST_ONLY_NOT_A_SOLUTION',repeat('b',64),'PENDING_VERIFICATION',extract(epoch FROM clock_timestamp())::bigint);
  PERFORM set_config('app.auth_token',token_a,true);
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT count(*) FROM public.%I',t) INTO visible_rows;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id::text=$1',t)
      INTO own_rows USING 'tenant-enterprise-demo';
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id::text<>$1',t)
      INTO foreign_rows USING 'tenant-enterprise-demo';
    IF visible_rows<>own_rows OR foreign_rows<>0 THEN
      RAISE EXCEPTION 'Tenant A isolation failed on % visible=% own=% foreign=%',
        t,visible_rows,own_rows,foreign_rows;
    END IF;
    tested_reads:=tested_reads+1;
  END LOOP;

  PERFORM set_config('app.auth_token',token_b,true);
  IF solvex_private.current_claims()->>'tenant_id' <> 'tenant-isolation-test-b' THEN
    RAISE EXCEPTION 'Tenant B token invalid';
  END IF;
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT count(*) FROM public.%I',t) INTO visible_rows;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id::text=$1',t)
      INTO own_rows USING 'tenant-isolation-test-b';
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id::text<>$1',t)
      INTO foreign_rows USING 'tenant-isolation-test-b';
    IF visible_rows<>own_rows OR foreign_rows<>0 THEN
      RAISE EXCEPTION 'Tenant B isolation failed on % visible=% own=% foreign=%',
        t,visible_rows,own_rows,foreign_rows;
    END IF;
    tested_reads:=tested_reads+1;
  END LOOP;

  -- Use Tenant A's signed context to attempt moving its rows to Tenant B.
  -- The exception subtransaction rolls back every attempted update.
  PERFORM set_config('app.auth_token',token_a,true);
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id::text=$1',t)
      INTO own_rows USING 'tenant-enterprise-demo';
    IF own_rows>0 THEN
      denied:=false;
      changed:=0;
      BEGIN
        EXECUTE format('UPDATE public.%I SET tenant_id=$1 WHERE tenant_id::text=$2',t)
          USING 'tenant-isolation-test-b','tenant-enterprise-demo';
        GET DIAGNOSTICS changed=ROW_COUNT;
        IF changed>0 THEN
          RAISE EXCEPTION 'CROSS_TENANT_WRITE_ALLOWED table=% rows=%',t,changed;
        END IF;
      EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        denied:=true;
      END;
      IF NOT denied THEN
        RAISE EXCEPTION 'Cross-tenant UPDATE was not rejected on %',t;
      END IF;
      tested_writes:=tested_writes+1;
    END IF;
  END LOOP;

  PERFORM set_config('app.auth_token','',true);
  IF solvex_private.current_claims() IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid token did not fail closed';
  END IF;
  IF tested_reads <> cardinality(tables) * 2 THEN
    RAISE EXCEPTION 'Expected % authenticated read checks, got %', cardinality(tables) * 2, tested_reads;
  END IF;
  IF tested_writes < 1 THEN
    RAISE EXCEPTION 'No populated cross-tenant UPDATE rejection was exercised';
  END IF;
  PERFORM set_config('app.auth_token',token_a,true);
  DELETE FROM public.solutions WHERE id=fixture_a;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'Tenant A fixture cleanup failed'; END IF;
  PERFORM set_config('app.auth_token',token_b,true);
  DELETE FROM public.solutions WHERE id=fixture_b;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'Tenant B fixture cleanup failed'; END IF;
  PERFORM set_config('app.auth_token','',true);
  RAISE NOTICE 'AUTHENTICATED_TENANT_ISOLATION=PASS read_table_checks=% cross_tenant_write_checks=% fixture_cleanup=PASS',
    tested_reads,tested_writes;
END
$authenticated$;
