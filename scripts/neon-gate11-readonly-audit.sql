-- READ-ONLY GATE-11 AUDIT. Safe for the production branch.
-- Execute with an administrative audit connection; this script makes no changes.

SELECT json_build_object(
  'database', current_database(),
  'server_version', current_setting('server_version'),
  'runtime_roles', (
    SELECT coalesce(json_agg(json_build_object(
      'name', r.rolname,
      'login', r.rolcanlogin,
      'superuser', r.rolsuper,
      'createdb', r.rolcreatedb,
      'createrole', r.rolcreaterole,
      'replication', r.rolreplication,
      'bypassrls', r.rolbypassrls
    ) ORDER BY r.rolname), '[]'::json)
    FROM pg_roles r
    WHERE r.rolname IN ('solvex_app_runtime', 'solvex_runtime_login', 'neondb_owner')
  ),
  'runtime_login_memberships', (
    SELECT coalesce(json_agg(json_build_object(
      'granted_role', parent.rolname,
      'member_role', member.rolname,
      'admin_option', am.admin_option
    ) ORDER BY parent.rolname), '[]'::json)
    FROM pg_auth_members am
    JOIN pg_roles parent ON parent.oid = am.roleid
    JOIN pg_roles member ON member.oid = am.member
    WHERE member.rolname = 'solvex_runtime_login'
  ),
  'public_table_summary', (
    SELECT json_build_object(
      'total', count(*),
      'rls_enabled', count(*) FILTER (WHERE c.relrowsecurity),
      'rls_forced', count(*) FILTER (WHERE c.relforcerowsecurity),
      'policy_present', count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = n.nspname AND p.tablename = c.relname
      ))
    )
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ),
  'rls_exceptions', (
    SELECT coalesce(json_agg(json_build_object(
      'table', c.relname,
      'has_tenant_id', EXISTS (
        SELECT 1 FROM information_schema.columns col
        WHERE col.table_schema = n.nspname
          AND col.table_name = c.relname
          AND col.column_name = 'tenant_id'
      ),
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'policies', (
        SELECT coalesce(json_agg(p.policyname ORDER BY p.policyname), '[]'::json)
        FROM pg_policies p
        WHERE p.schemaname = n.nspname AND p.tablename = c.relname
      )
    ) ORDER BY c.relname), '[]'::json)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND (
        NOT c.relrowsecurity
        OR NOT c.relforcerowsecurity
        OR NOT EXISTS (
          SELECT 1 FROM pg_policies p
          WHERE p.schemaname = n.nspname AND p.tablename = c.relname
        )
      )
  )
) AS gate11_audit;
