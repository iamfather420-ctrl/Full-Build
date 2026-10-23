# Daisy first-party auth: RLS gate status

Migration 006 is a **fail-closed guard**, not a production-ready authentication migration.

## What it does
- Enables and forces row-level security on all five `daisy_auth_*` tables.
- Revokes table privileges from `PUBLIC`.
- Adds no permissive policies and grants no access to application roles.

## What it deliberately does not do
- It does not create trusted tenant context, bootstrap/login functions, or grants.
- It does not make the current direct-table `NeonFirstPartyAuthRepository` operational under RLS.
- It does not change database roles, credentials, existing explicit grants, production configuration, route mounting, or payment settings.

## Required before auth can be enabled
1. Replace direct-table auth operations with narrowly scoped database operations for unauthenticated registration, email verification, login, reset, and rate limiting. The database must validate each operation's inputs and enforce token single-use atomically.
2. Establish authenticated tenant context only from a verified session/account binding. Never trust a caller-supplied tenant ID or an arbitrary session variable by itself.
3. For any SECURITY DEFINER function: use a dedicated non-login owner, fixed safe search_path, schema-qualified object references, minimal EXECUTE grants, and no dynamic SQL from caller-controlled values.
4. Give the application a LOGIN role with no SUPERUSER, BYPASSRLS, CREATEDB, CREATEROLE, or replication privileges. Audit inherited role membership, grants, default privileges, table owners, function owners, policies, and SECURITY DEFINER execution rights.
5. Run cross-tenant isolation, unauthenticated-flow, token replay, revocation, reset, and recovery tests on a disposable Neon branch using the exact runtime role. Verify both allowed and denied operations.
6. Keep auth routes unmounted and production login/payments disabled until all checks are evidenced and explicitly approved.

## Safe validation queries
Run on the disposable rehearsal database only:

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
       (SELECT count(*) FROM pg_policies p
        WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'daisy_auth_tenants', 'daisy_auth_accounts', 'daisy_auth_sessions',
    'daisy_auth_one_time_tokens', 'daisy_auth_rate_limits'
  )
ORDER BY c.relname;

SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole,
       rolreplication, rolcanlogin
FROM pg_roles
WHERE rolname IN ('solvex_runtime_rehearsal_login', 'solvex_app_runtime');
```

Expected after applying the guard: five tables present, RLS enabled and forced, zero policies. A runtime role must not bypass RLS. Zero policies means access is denied; that is intentional until the reviewed function/policy design is complete. A privileged owner/connector result is not valid evidence of runtime isolation.