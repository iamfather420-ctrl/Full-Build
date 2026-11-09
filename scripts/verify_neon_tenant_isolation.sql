-- Read-only tenant isolation probe. Run only against a disposable Neon branch.
-- psql variables tenant_a and tenant_b must identify two existing fixture tenants.
SELECT set_config('solvex.test_tenant_a', :'tenant_a', false);
SELECT set_config('solvex.test_tenant_b', :'tenant_b', false);

DO $do$
DECLARE
  tenant_a text := current_setting('solvex.test_tenant_a');
  tenant_b text := current_setting('solvex.test_tenant_b');
  target_tables text[] := ARRAY['solutions','offers','orders','proof_bundles','proof_evidence','verification_runs','audit_records','telemetry'];
  table_name text;
  r record;
  policy_expr text;
  tenant_gucs text[];
  guc_name text;
  guc_value text;
  visible_own bigint;
  visible_other bigint;
  tested integer := 0;
  role_bypass boolean;
  role_super boolean;
BEGIN
  IF tenant_a = '' OR tenant_b = '' OR tenant_a = tenant_b THEN
    RAISE EXCEPTION 'Two distinct, non-empty fixture tenant IDs are required';
  END IF;

  SELECT rolbypassrls, rolsuper INTO role_bypass, role_super
  FROM pg_roles WHERE rolname = current_user;
  IF COALESCE(role_bypass, true) OR COALESCE(role_super, true) THEN
    RAISE EXCEPTION 'Refusing tenant test under a BYPASSRLS or superuser role: %', current_user;
  END IF;

  FOREACH table_name IN ARRAY target_tables LOOP
    SELECT c.relrowsecurity, c.relforcerowsecurity,
           string_agg(COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, p.qual, ''), ' ') AS expr,
           count(p.policyname)::integer AS policy_count
      INTO r
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
     WHERE n.nspname = 'public' AND c.relname = table_name AND c.relkind IN ('r','p')
     GROUP BY c.relrowsecurity, c.relforcerowsecurity;

    IF NOT FOUND THEN RAISE EXCEPTION 'Required tenant fixture table public.% is missing', table_name; END IF;
    IF NOT r.relrowsecurity OR NOT r.relforcerowsecurity OR r.policy_count < 1 THEN
      RAISE EXCEPTION 'RLS is not enabled, forced, and policy-backed for public.%', table_name;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND information_schema.columns.table_name=verify_neon_tenant_isolation.table_name AND column_name='tenant_id'
    ) INTO role_super;
    IF NOT role_super THEN RAISE EXCEPTION 'public.% has no tenant_id column', table_name; END IF;

    policy_expr := COALESCE(r.expr, '');
    IF policy_expr !~* 'tenant_id' OR policy_expr !~ 'current_setting' THEN
      RAISE EXCEPTION 'public.% policy does not expose a recognized tenant_id/current_setting boundary', table_name;
    END IF;

    SELECT array_agg(DISTINCT m[1]) INTO tenant_gucs
      FROM pg_policies p
      CROSS JOIN LATERAL regexp_matches(COALESCE(p.qual,'') || ' ' || COALESCE(p.with_check,p.qual,''), $re$current_setting\('([^']+)'$re$, 'g') AS m
     WHERE p.schemaname='public' AND p.tablename=table_name;

    IF tenant_gucs IS NULL OR cardinality(tenant_gucs)=0 THEN
      RAISE EXCEPTION 'public.% has no discoverable tenant context setting', table_name;
    END IF;

    FOREACH guc_name IN ARRAY tenant_gucs LOOP
      IF guc_name ILIKE '%tenant%' THEN
        PERFORM set_config(guc_name, tenant_a, true);
      ELSIF guc_name = 'request.jwt.claims' THEN
        PERFORM set_config(guc_name, json_build_object('tenant_id',tenant_a,'tenantId',tenant_a,'sub',tenant_a)::text, true);
      ELSE
        RAISE EXCEPTION 'Unrecognized RLS context key % in public.%', guc_name, table_name;
      END IF;
    END LOOP;

    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id::text = $1', table_name) INTO visible_own USING tenant_a;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id::text <> $1', table_name) INTO visible_other USING tenant_a;
    IF visible_own < 1 OR visible_other <> 0 THEN
      RAISE EXCEPTION 'Tenant A isolation failed for public.% (own visible %, other visible %)', table_name, visible_own, visible_other;
    END IF;

    FOREACH guc_name IN ARRAY tenant_gucs LOOP
      IF guc_name ILIKE '%tenant%' THEN
        PERFORM set_config(guc_name, tenant_b, true);
      ELSIF guc_name = 'request.jwt.claims' THEN
        PERFORM set_config(guc_name, json_build_object('tenant_id',tenant_b,'tenantId',tenant_b,'sub',tenant_b)::text, true);
      END IF;
    END LOOP;

    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id::text = $1', table_name) INTO visible_own USING tenant_b;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id::text <> $1', table_name) INTO visible_other USING tenant_b;
    IF visible_own < 1 OR visible_other <> 0 THEN
      RAISE EXCEPTION 'Tenant B isolation failed for public.% (own visible %, other visible %)', table_name, visible_own, visible_other;
    END IF;

    -- Attempt to reassign one tenant-A fixture row to tenant B. The subtransaction
    -- guarantees rollback; a row-level policy or privilege boundary must reject it.
    PERFORM set_config(guc_name, tenant_a, true) FROM unnest(tenant_gucs) AS keys(guc_name);
    DECLARE
      changed_rows integer := 0;
      write_denied boolean := false;
    BEGIN
      BEGIN
        EXECUTE format(
          'UPDATE public.%I SET tenant_id = $1 WHERE ctid = (SELECT ctid FROM public.%I WHERE tenant_id::text = $2 LIMIT 1)',
          table_name, table_name
        ) USING tenant_b, tenant_a;
        GET DIAGNOSTICS changed_rows = ROW_COUNT;
        IF changed_rows = 0 THEN
          write_denied := true;
        ELSE
          RAISE EXCEPTION 'SOLVEX_WRITE_WAS_ALLOWED';
        END IF;
      EXCEPTION
        WHEN insufficient_privilege OR check_violation THEN
          write_denied := true;
        WHEN OTHERS THEN
          IF SQLERRM = 'SOLVEX_WRITE_WAS_ALLOWED' THEN
            write_denied := false;
          ELSE
            RAISE;
          END IF;
      END;
      IF NOT write_denied THEN
        RAISE EXCEPTION 'Cross-tenant UPDATE was permitted on public.%', table_name;
      END IF;
    END;

    tested := tested + 1;
    RAISE NOTICE 'PASS public.%: forced RLS; tenant A and B can read own fixture rows and cannot read each other', table_name;
  END LOOP;

  IF tested <> cardinality(target_tables) THEN
    RAISE EXCEPTION 'Only % of % required tenant tables were tested', tested, cardinality(target_tables);
  END IF;
  RAISE NOTICE 'TENANT_ISOLATION_RESULT=PASS tables=% role=%', tested, current_user;
END
$do$;
