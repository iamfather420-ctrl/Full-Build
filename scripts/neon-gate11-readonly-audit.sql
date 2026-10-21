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
  'internal_metadata_exceptions', (
    SELECT coalesce(json_agg(json_build_object(
      'table', c.relname,
      'tenant_scoped', EXISTS (
        SELECT 1 FROM information_schema.columns col
        WHERE col.table_schema = n.nspname AND col.table_name = c.relname AND col.column_name = 'tenant_id'
      ),
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'runtime_select', has_table_privilege('solvex_app_runtime', c.oid, 'SELECT'),
      'runtime_insert', has_table_privilege('solvex_app_runtime', c.oid, 'INSERT'),
      'runtime_update', has_table_privilege('solvex_app_runtime', c.oid, 'UPDATE'),
      'runtime_delete', has_table_privilege('solvex_app_runtime', c.oid, 'DELETE'),
      'classification', 'INTERNAL_METADATA_REQUIRES_EXPLICIT_REVIEW'
    ) ORDER BY c.relname), '[]'::json)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND left(c.relname, 1) = '_'
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
      AND left(c.relname, 1) <> '_'
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

-- Signed-context and payment-policy audit. Exposes no secret material.
SELECT json_build_object(
  'auth_context_ready', solvex_private.auth_context_ready(),
  'auth_secret_present', EXISTS (
    SELECT 1 FROM solvex_private.auth_secrets
    WHERE secret_name = 'SOLVEX_AUTH_SECRET'
      AND length(secret_value) >= 32
  ),
  'runtime_login_inherits_neon_superuser', pg_has_role(
    'solvex_runtime_login', 'neon_superuser', 'MEMBER'
  ),
  'payment_policy_state', (
    SELECT coalesce(json_agg(json_build_object(
      'table', c.relname,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'tenant_id', EXISTS (
        SELECT 1 FROM information_schema.columns col
        WHERE col.table_schema = n.nspname
          AND col.table_name = c.relname
          AND col.column_name = 'tenant_id'
      ),
      'policies', (
        SELECT coalesce(json_agg(json_build_object(
          'name', p.policyname,
          'command', p.cmd,
          'using', p.qual,
          'with_check', p.with_check
        ) ORDER BY p.policyname), '[]'::json)
        FROM pg_policies p
        WHERE p.schemaname = n.nspname AND p.tablename = c.relname
      )
    ) ORDER BY c.relname), '[]'::json)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
        'payment_orders', 'payment_fulfillments',
        'payment_refunds', 'payment_events'
      )
  )
) AS signed_context_and_payment_audit;
