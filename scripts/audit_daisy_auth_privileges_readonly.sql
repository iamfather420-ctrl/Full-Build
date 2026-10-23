-- Read-only Daisy auth privilege/RLS audit. Execute on disposable branch as the
-- exact intended application runtime role. This script makes no changes.
WITH required(table_name) AS (VALUES
 ('daisy_auth_tenants'), ('daisy_auth_accounts'), ('daisy_auth_sessions'),
 ('daisy_auth_one_time_tokens'), ('daisy_auth_rate_limits')
),
tables AS (
 SELECT r.table_name, c.oid, c.relrowsecurity, c.relforcerowsecurity,
        pg_get_userbyid(c.relowner) AS owner_name
 FROM required r LEFT JOIN pg_namespace n ON n.nspname = 'public'
 LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = r.table_name AND c.relkind = 'r'
),
role_chain AS (
 SELECT m.roleid, m.member, m.admin_option, 1 AS depth
 FROM pg_auth_members m
 UNION ALL
 SELECT m.roleid, rc.member, m.admin_option, rc.depth + 1
 FROM pg_auth_members m JOIN role_chain rc ON m.member = rc.roleid
 WHERE rc.depth < 32
),
current_role AS (
 SELECT oid, rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole,
        rolreplication, rolcanlogin FROM pg_roles WHERE rolname = current_user
)
SELECT 'table' AS finding_type, t.table_name AS object_name,
       json_build_object('exists', t.oid IS NOT NULL, 'rls', t.relrowsecurity,
         'force_rls', t.relforcerowsecurity, 'owner', t.owner_name,
         'select', has_table_privilege(current_user, t.oid, 'SELECT'),
         'insert', has_table_privilege(current_user, t.oid, 'INSERT'),
         'update', has_table_privilege(current_user, t.oid, 'UPDATE'),
         'delete', has_table_privilege(current_user, t.oid, 'DELETE'),
         'policy_count', (SELECT count(*) FROM pg_policies p
                          WHERE p.schemaname = 'public' AND p.tablename = t.table_name)) AS details
FROM tables t
UNION ALL
SELECT 'current_role', cr.rolname, json_build_object('superuser', cr.rolsuper,
 'bypassrls', cr.rolbypassrls, 'createdb', cr.rolcreatedb, 'createrole', cr.rolcreaterole,
 'replication', cr.rolreplication, 'can_login', cr.rolcanlogin,
 'inherited_memberships', (SELECT json_agg(json_build_object('role', parent.rolname,
   'depth', rc.depth, 'admin_option', rc.admin_option))
   FROM role_chain rc JOIN pg_roles parent ON parent.oid = rc.roleid
   WHERE rc.member = cr.oid))
FROM current_role cr
UNION ALL
SELECT 'function', p.oid::regprocedure::text, json_build_object(
 'security_definer', p.prosecdef, 'owner', pg_get_userbyid(p.proowner),
 'config', p.proconfig, 'public_execute', has_function_privilege('public', p.oid, 'EXECUTE'),
 'current_role_execute', has_function_privilege(current_user, p.oid, 'EXECUTE'))
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'daisy_auth_%'
ORDER BY finding_type, object_name;