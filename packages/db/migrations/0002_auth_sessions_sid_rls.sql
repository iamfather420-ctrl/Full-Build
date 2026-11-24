-- GATE-11: isolate opaque OIDC session records by the exact bearer session id.
-- The sid is a 256-bit random value issued by the API; it is not a tenant id.
-- The API sets app.session_sid and accesses the matching row in the same SQL statement.
-- No session rows are exposed when the setting is absent or does not match.

BEGIN;

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_sessions_sid_isolation ON public.auth_sessions;
CREATE POLICY auth_sessions_sid_isolation ON public.auth_sessions
  USING (
    sid = NULLIF(current_setting('app.session_sid', true), '')
  )
  WITH CHECK (
    sid = NULLIF(current_setting('app.session_sid', true), '')
  );

REVOKE ALL ON TABLE public.auth_sessions FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_sessions
  TO solvex_app_runtime;

DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'auth_sessions'
       AND c.relrowsecurity
       AND c.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'auth_sessions must have ENABLE and FORCE RLS';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'auth_sessions'
       AND policyname = 'auth_sessions_sid_isolation'
       AND position('app.session_sid' IN coalesce(qual, '')) > 0
       AND position('app.session_sid' IN coalesce(with_check, '')) > 0
  ) THEN
    RAISE EXCEPTION 'auth_sessions sid isolation policy is missing or incomplete';
  END IF;
END
$verify$;

COMMIT;
