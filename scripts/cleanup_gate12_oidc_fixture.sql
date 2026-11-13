-- Remove only the deterministic GATE-12 CI fixture from the disposable Neon branch.
BEGIN;
DELETE FROM public.tenant_memberships WHERE id = 'ci-gate12-membership';
DELETE FROM public.users WHERE id = 'ci-gate12-user';
DELETE FROM public.roles WHERE id = 'ci-gate12-role';
COMMIT;
