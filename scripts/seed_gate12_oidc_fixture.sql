-- Disposable CI-only fixture for GATE-12 lifecycle authorization.
-- The CI workflow passes tenant_a from the dedicated Neon isolation branch.
BEGIN;
DELETE FROM public.tenant_memberships WHERE id = 'ci-gate12-membership';
DELETE FROM public.users WHERE id = 'ci-gate12-user';
DELETE FROM public.roles WHERE id = 'ci-gate12-role';
INSERT INTO public.roles
  (id, tenant_id, name, permissions_json, created_at, updated_at, status)
VALUES
  ('ci-gate12-role', :'tenant_a', 'CUSTOMER', '[]',
   (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint,
   (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint, 'ACTIVE');
INSERT INTO public.users
  (id, tenant_id, email, display_name, role, status, created_at, updated_at, oidc_subject)
VALUES
  ('ci-gate12-user', :'tenant_a', 'ci-gate12@example.invalid', 'GATE-12 CI Fixture',
   'CUSTOMER', 'ACTIVE',
   (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint,
   (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint,
   'ci-gate12-subject');
INSERT INTO public.tenant_memberships
  (id, tenant_id, user_id, role_id, status, created_at, updated_at)
VALUES
  ('ci-gate12-membership', :'tenant_a', 'ci-gate12-user', 'ci-gate12-role', 'ACTIVE',
   (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint,
   (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint);
COMMIT;
