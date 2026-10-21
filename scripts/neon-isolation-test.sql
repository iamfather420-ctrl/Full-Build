-- Run this ONLY while connected as a least-privilege role
-- (solvex_runtime_login_v2 or solvex_iso_test) on a non-production branch.
-- Do not run as neondb_owner.

SELECT current_user, rolbypassrls
FROM pg_roles WHERE rolname = current_user;

SELECT count(*) AS users_visible FROM public.users;
SELECT count(*) AS orders_visible FROM public.orders;

INSERT INTO public.users (id, tenant_id, created_at, updated_at, status, version, payload_json)
VALUES ('iso-test-' || gen_random_uuid()::text, 'TENANT_B_SHOULD_FAIL', extract(epoch from now())::bigint, extract(epoch from now())::bigint, 'ACTIVE', '1.0.0', '{}');
