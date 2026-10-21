-- Signed-claim tenant isolation tests.
-- Run ONLY on a non-production branch, connected as a least-privilege role
-- (solvex_iso_test or solvex_runtime_login_v2). Do not run as neondb_owner.
--
-- Prerequisites:
-- 1. Signing secret provisioned so solvex_private.auth_context_ready() = true.
-- 2. You know how claims are injected (function or session setting).
--    Run the discovery query below first if unsure.

-- ------------------------------------------------------------------
-- 0. Session and context checks
-- ------------------------------------------------------------------
SELECT current_user, rolbypassrls
FROM pg_roles WHERE rolname = current_user;

SELECT solvex_private.auth_context_ready() AS auth_context_ready;

-- Discover claim helpers (run as a role that can see the schema)
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'solvex_private'
  AND (p.proname ILIKE '%claim%' OR p.proname ILIKE '%auth%' OR p.proname ILIKE '%context%')
ORDER BY p.proname;

-- ------------------------------------------------------------------
-- 1. No-claim baseline (must still fail closed)
-- ------------------------------------------------------------------
SELECT count(*) AS users_visible_no_claim FROM public.users;

-- ------------------------------------------------------------------
-- 2. Tenant A claim — own data only
-- Replace the setter below with the real function discovered above.
-- Common patterns (uncomment the one that exists):
--
-- SELECT solvex_private.set_claims('{"tenant_id":"TENANT_A"}'::jsonb);
-- SELECT set_config('solvex.claims', '{"tenant_id":"TENANT_A"}', true);
--
-- Then verify:
SELECT solvex_private.current_claims() AS claims_after_tenant_a;

-- Expect: only TENANT_A rows (or zero if none exist)
SELECT tenant_id, count(*)
FROM public.users
GROUP BY tenant_id;

-- ------------------------------------------------------------------
-- 3. Tenant B claim — must not see Tenant A
-- SELECT solvex_private.set_claims('{"tenant_id":"TENANT_B"}'::jsonb);
SELECT solvex_private.current_claims() AS claims_after_tenant_b;

SELECT count(*) AS tenant_a_rows_visible_to_b
FROM public.users
WHERE tenant_id = 'TENANT_A';

-- ------------------------------------------------------------------
-- 4. Cross-tenant write under Tenant B claim must be rejected
-- ------------------------------------------------------------------
INSERT INTO public.users (id, tenant_id, created_at, updated_at, status, version, payload_json)
VALUES (
  'iso-claim-' || gen_random_uuid()::text,
  'TENANT_A',
  extract(epoch from now())::bigint,
  extract(epoch from now())::bigint,
  'ACTIVE',
  '1.0.0',
  '{}'
);

-- ------------------------------------------------------------------
-- 5. Same-tenant write under matching claim should succeed
-- (only if the table policy allows INSERT with matching tenant_id)
-- ------------------------------------------------------------------
-- INSERT INTO public.users (... tenant_id = 'TENANT_B' ...) ;

-- ------------------------------------------------------------------
-- Expected:
-- - auth_context_ready = true
-- - no-claim count = 0
-- - Tenant B sees 0 Tenant A rows
-- - INSERT of TENANT_A row while claims are TENANT_B is rejected by RLS
-- ------------------------------------------------------------------
