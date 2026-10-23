-- Daisy first-party auth RLS fail-closed guard.
-- This migration intentionally creates NO permissive policies and grants NO table access.
-- Without reviewed tenant-context functions/policies, non-owner roles must see zero rows
-- and be unable to mutate auth tables. The existing direct-table adapter will not work
-- under this posture; do NOT mount auth or apply this to production until the adapter is
-- migrated to reviewed SECURITY DEFINER operations and tested on a disposable branch.
-- Run only after confirming this is the intended disposable database.
BEGIN;

REVOKE ALL ON TABLE
  public.daisy_auth_tenants,
  public.daisy_auth_accounts,
  public.daisy_auth_sessions,
  public.daisy_auth_one_time_tokens,
  public.daisy_auth_rate_limits
FROM PUBLIC;

ALTER TABLE public.daisy_auth_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_auth_tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_auth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_auth_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_auth_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_auth_one_time_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_auth_one_time_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_auth_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_auth_rate_limits FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE public.daisy_auth_tenants IS
  'Daisy auth: RLS forced; no permissive policies until trusted tenant-context design is reviewed.';
COMMENT ON TABLE public.daisy_auth_accounts IS
  'Daisy auth: RLS forced; no permissive policies until trusted tenant-context design is reviewed.';
COMMENT ON TABLE public.daisy_auth_sessions IS
  'Daisy auth: RLS forced; no permissive policies until trusted tenant-context design is reviewed.';
COMMENT ON TABLE public.daisy_auth_one_time_tokens IS
  'Daisy auth: RLS forced; no permissive policies until trusted tenant-context design is reviewed.';
COMMENT ON TABLE public.daisy_auth_rate_limits IS
  'Daisy auth: RLS forced; no permissive policies until trusted tenant-context design is reviewed.';

COMMIT;

-- Expected result: this is a fail-closed guard, not a usable auth release.
-- Validate as a non-owner, NOBYPASSRLS, least-privilege LOGIN role.
-- Expected: all five tables report relrowsecurity=true and relforcerowsecurity=true;
-- zero policies exist; the runtime role has no table privileges and cannot access rows.
-- Do not use the database owner/Neon connector role as the application runtime.
