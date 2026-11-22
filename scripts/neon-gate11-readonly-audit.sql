-- READ-ONLY GATE-11 audit for the current SolveX production schema.
-- Safe for production: this file performs SELECTs only.

SELECT json_build_object(
  'database', current_database(),
  'runtime_roles', (
    SELECT coalesce(json_agg(json_build_object(
      'name', r.rolname,
      'login', r.rolcanlogin,
      'superuser', r.rolsuper,
      'createdb', r.rolcreatedb,
      'createrole', r.rolcreaterole,
      'replication', r.rolreplication,
      'bypassrls', r.rolbypassrls,
      'inherits_neon_superuser', pg_has_role(r.rolname, 'neon_superuser', 'MEMBER')
    ) ORDER BY r.rolname), '[]'::json)
    FROM pg_roles r
    WHERE r.rolname IN ('solvex_app_runtime', 'solvex_runtime_login', 'solvex_runtime_login_v2')
  ),
  'public_tables', (
    SELECT json_build_object(
      'total', count(*),
      'rls_enabled', count(*) FILTER (WHERE c.relrowsecurity),
      'rls_forced', count(*) FILTER (WHERE c.relforcerowsecurity)
    )
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ),
  'rls_exceptions', (
    SELECT coalesce(json_agg(json_build_object(
      'table', c.relname,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'runtime_v2_select', has_table_privilege('solvex_runtime_login_v2', c.oid, 'SELECT'),
      'runtime_v2_insert', has_table_privilege('solvex_runtime_login_v2', c.oid, 'INSERT')
    ) ORDER BY c.relname), '[]'::json)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)
  ),
  'owner_bypass_policy_count', (
    SELECT count(*)
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (coalesce(p.qual, '') ILIKE '%OWNER%' OR coalesce(p.with_check, '') ILIKE '%OWNER%')
  ),
  'payment_state', (
    SELECT coalesce(json_agg(json_build_object(
      'table', c.relname,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'runtime_v2_select', has_table_privilege('solvex_runtime_login_v2', c.oid, 'SELECT'),
      'runtime_v2_insert', has_table_privilege('solvex_runtime_login_v2', c.oid, 'INSERT'),
      'policies', (
        SELECT coalesce(json_agg(json_build_object(
          'name', p.policyname, 'using', p.qual, 'with_check', p.with_check
        ) ORDER BY p.policyname), '[]'::json)
        FROM pg_policies p
        WHERE p.schemaname = n.nspname AND p.tablename = c.relname
      )
    ) ORDER BY c.relname), '[]'::json)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN (
      'payment_orders', 'payment_fulfillments', 'payment_refunds', 'payment_events', 'auth_sessions'
    )
  )
) AS gate11_current_audit;
