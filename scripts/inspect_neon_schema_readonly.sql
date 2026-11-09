-- SolveX Neon schema inventory (READ ONLY).
-- Run against the disposable Neon branch first. This script reads PostgreSQL
-- catalog metadata only. It does not select application rows, write data,
-- create objects, change grants, or alter RLS policies.
--
-- Run each SELECT separately if the Neon SQL editor displays only one result
-- set at a time. Save all result sets with the branch name and timestamp.

-- 1) Connection identity: confirm project/branch/database/role before comparing.
SELECT
  current_database() AS database_name,
  current_schema() AS current_schema,
  current_user AS connected_role,
  session_user AS session_role,
  current_setting('server_version') AS postgres_version,
  current_setting('search_path') AS search_path;

-- 2) All application-visible relations in public and solvex_private.
-- The private schema is included by name only; no row contents are read.
SELECT
  n.nspname AS schema_name,
  c.relname AS relation_name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'p' THEN 'partitioned_table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized_view'
    WHEN 'f' THEN 'foreign_table'
    ELSE c.relkind::text
  END AS relation_type,
  c.relpersistence AS persistence,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'solvex_private')
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
ORDER BY n.nspname, c.relname;

-- 3) Exact column inventory for those relations.
SELECT
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  is_identity,
  identity_generation,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_schema IN ('public', 'solvex_private')
ORDER BY table_schema, table_name, ordinal_position;

-- 4) Primary keys, unique constraints, foreign keys, and check constraints.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
    WHEN 'x' THEN 'EXCLUSION'
    ELSE con.contype::text
  END AS constraint_type,
  pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'solvex_private')
ORDER BY n.nspname, c.relname, con.conname;

-- 5) RLS policies and their predicates. These are policy definitions, not data.
SELECT
  schemaname AS schema_name,
  tablename AS table_name,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies
WHERE schemaname IN ('public', 'solvex_private')
ORDER BY schemaname, tablename, policyname;

-- 6) Connected role flags. A runtime role must not be superuser or BYPASSRLS.
SELECT
  rolname,
  rolsuper AS is_superuser,
  rolbypassrls AS bypasses_rls,
  rolcreaterole AS can_create_roles,
  rolcreatedb AS can_create_databases,
  rolreplication AS can_replicate,
  rolinherit AS inherits_roles,
  rolcanlogin AS can_login
FROM pg_roles
WHERE rolname IN (current_user, session_user)
ORDER BY rolname;

-- 7) Explicit grants visible to the current role or PUBLIC.
SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema IN ('public', 'solvex_private')
  AND grantee IN (current_user, 'PUBLIC')
ORDER BY table_schema, table_name, grantee, privilege_type;

-- 8) Migration-ledger candidates: names and columns only; no ledger rows read.
SELECT
  c.relname AS candidate_ledger_table,
  string_agg(a.attname, ', ' ORDER BY a.attnum) AS column_names
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname IN ('public', 'solvex_private')
  AND c.relkind IN ('r', 'p')
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND (
    c.relname ILIKE '%migration%'
    OR c.relname ILIKE '%drizzle%'
    OR c.relname ILIKE '%schema_version%'
  )
GROUP BY c.relname
ORDER BY c.relname;

-- 9) Identify extension metadata without exposing application records.
SELECT extname, extversion
FROM pg_extension
ORDER BY extname;
