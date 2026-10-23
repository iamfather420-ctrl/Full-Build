-- Read-only first-party auth database gate.
-- Run against a DISPOSABLE Neon branch as the intended application runtime role.
-- This script intentionally does not mutate schema, roles, grants, policies, or data.
-- A result of blocked=true means authentication must remain unmounted.
WITH auth_tables AS (
  SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
         pg_get_userbyid(c.relowner) AS owner_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'daisy_auth_tenants',
      'daisy_auth_accounts',
      'daisy_auth_sessions',
      'daisy_auth_one_time_tokens',
      'daisy_auth_rate_limits'
    )
    AND c.relkind = 'r'
),
required_tables(table_name) AS (
  VALUES
    ('daisy_auth_tenants'),
    ('daisy_auth_accounts'),
    ('daisy_auth_sessions'),
    ('daisy_auth_one_time_tokens'),
    ('daisy_auth_rate_limits')
),
table_status AS (
  SELECT r.table_name,
         t.relname IS NOT NULL AS exists,
         COALESCE(t.relrowsecurity, false) AS rls_enabled,
         COALESCE(t.relforcerowsecurity, false) AS rls_forced,
         t.owner_name
  FROM required_tables r
  LEFT JOIN auth_tables t ON t.relname = r.table_name
),
role_status AS (
  SELECT rolname,
         rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolreplication, rolcanlogin
  FROM pg_roles
  WHERE rolname = current_user
)
SELECT
  current_database() AS database_name,
  current_user AS executing_role,
  (SELECT count(*) FROM table_status) AS required_table_count,
  (SELECT count(*) FROM table_status WHERE exists) AS existing_table_count,
  (SELECT count(*) FROM table_status WHERE rls_enabled AND rls_forced) AS tables_with_forced_rls,
  (SELECT json_agg(table_status ORDER BY table_name) FROM table_status) AS table_details,
  (SELECT json_build_object(
      'superuser', rolsuper,
      'bypassrls', rolbypassrls,
      'createdb', rolcreatedb,
      'createrole', rolcreaterole,
      'replication', rolreplication,
      'can_login', rolcanlogin
    ) FROM role_status) AS executing_role_attributes,
  (
    (SELECT count(*) FROM table_status) <> 5
    OR (SELECT count(*) FROM table_status WHERE exists) <> 5
    OR (SELECT count(*) FROM table_status WHERE rls_enabled AND rls_forced) <> 5
    OR NOT EXISTS (
      SELECT 1 FROM role_status
      WHERE NOT rolsuper AND NOT rolbypassrls
        AND NOT rolcreatedb AND NOT rolcreaterole
        AND NOT rolreplication AND rolcanlogin
    )
  ) AS blocked;
-- Important: this checks only the connected role's direct attributes and table flags.
-- Before release, separately audit inherited role membership, grants/default privileges,
-- SECURITY DEFINER function ownership/search_path/EXECUTE grants, policies, and cross-tenant
-- behavior. Passing this query alone is necessary but not sufficient for auth readiness.
