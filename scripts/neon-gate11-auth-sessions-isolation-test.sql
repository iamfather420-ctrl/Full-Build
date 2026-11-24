-- GATE-11 auth_sessions isolation test.
-- Run ONLY on a disposable Neon validation branch, as solvex_runtime_login_v2.
-- The transaction rolls back its synthetic session row.

BEGIN;

DO $test$
DECLARE
  test_sid text := encode(public.gen_random_bytes(32), 'hex');
  visible_rows bigint;
BEGIN
  PERFORM set_config('app.session_sid', '', true);
  SELECT count(*) INTO visible_rows FROM public.auth_sessions;
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'auth_sessions exposed % rows without a session id', visible_rows;
  END IF;

  PERFORM set_config('app.session_sid', test_sid, true);
  INSERT INTO public.auth_sessions(sid, sess, expire)
  VALUES (test_sid, '{"gate11":"session-rls-test"}'::jsonb, now() + interval '5 minutes');

  SELECT count(*) INTO visible_rows FROM public.auth_sessions WHERE sid = test_sid;
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION 'matching session id should expose exactly one row; found %', visible_rows;
  END IF;

  PERFORM set_config('app.session_sid', repeat('0', 64), true);
  SELECT count(*) INTO visible_rows FROM public.auth_sessions;
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'mismatched session id exposed % rows', visible_rows;
  END IF;

  PERFORM set_config('app.session_sid', test_sid, true);
  UPDATE public.auth_sessions
     SET sess = '{"gate11":"session-rls-updated"}'::jsonb
   WHERE sid = test_sid;
  DELETE FROM public.auth_sessions WHERE sid = test_sid;

  SELECT count(*) INTO visible_rows FROM public.auth_sessions WHERE sid = test_sid;
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'session cleanup failed; % test rows remain', visible_rows;
  END IF;
END
$test$;

ROLLBACK;
