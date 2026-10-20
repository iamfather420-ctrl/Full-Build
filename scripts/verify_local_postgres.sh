#!/usr/bin/env sh
set -eu

if [ "${NODE_ENV:-}" = "production" ]; then
  echo "BLOCKED: local PostgreSQL verifier cannot run in production." >&2
  exit 2
fi
if [ "${LOCAL_POSTGRES_VERIFY:-}" != "1" ]; then
  echo "BLOCKED: set LOCAL_POSTGRES_VERIFY=1 to explicitly run this local-only check." >&2
  exit 2
fi

# Execute the audit as the restricted runtime role, not the database owner.
# This proves only the local Compose schema/RLS contract, not production Neon readiness.
docker compose -f docker-compose.local-postgres.yml exec -T \
  -e PGPASSWORD=runtime_local local-postgres \
  psql -h 127.0.0.1 -U solvex_runtime -d solvex -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DO $verify$
DECLARE
  r RECORD;
  expected TEXT[] := ARRAY[
    'users','tenants','roles','permissions','tenant_memberships',
    'problems','paradoxes','invariants','solutions','offers',
    'proof_bundles','proof_evidence','tests','verification_runs',
    'orders','payments','deployments','checkpoints','rollback_records',
    'telemetry','audit_records','chain_records','licenses',
    'adapter_status','node_registry','execution_runs','failures'
  ];
  missing TEXT[];
  unsafe TEXT[];
  role_bypass BOOLEAN;
  role_super BOOLEAN;
  role_createdb BOOLEAN;
  role_createrole BOOLEAN;
  role_replication BOOLEAN;
  n INTEGER;
  probe_id TEXT := 'rls-probe-' || md5(clock_timestamp()::text || random()::text);
BEGIN
  SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
    INTO role_super, role_createdb, role_createrole, role_replication, role_bypass
    FROM pg_roles WHERE rolname = current_user;
  IF current_user <> 'solvex_runtime' THEN
    RAISE EXCEPTION 'expected solvex_runtime, got %', current_user;
  END IF;
  IF role_super OR role_createdb OR role_createrole OR role_replication OR role_bypass THEN
    RAISE EXCEPTION 'runtime role has elevated privilege flags';
  END IF;

  SELECT array_agg(x) INTO missing
  FROM unnest(expected) AS u(table_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = u.table_name
  );
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'missing required tables: %', missing; END IF;

  SELECT array_agg(req.table_name) INTO unsafe
  FROM unnest(expected) AS req(table_name)
  JOIN pg_class c ON c.relname = req.table_name
  JOIN pg_namespace ns ON ns.oid = c.relnamespace AND ns.nspname = 'public'
  WHERE NOT c.relrowsecurity OR NOT c.relforcerowsecurity
     OR NOT EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename = req.table_name);
  IF unsafe IS NOT NULL THEN RAISE EXCEPTION 'RLS or policy missing: %', unsafe; END IF;

  PERFORM set_config('app.tenant_id', 'tenant_alpha', true);
  INSERT INTO public.proof_evidence
    (id, tenant_id, created_at, updated_at, status, version, payload_json)
  VALUES (probe_id, 'tenant_alpha', 1, 1, 'LOCAL_TEST', 'local-only', '{"probe":true}'::jsonb);

  PERFORM set_config('app.tenant_id', 'tenant_beta', true);
  SELECT count(*) INTO n FROM public.proof_evidence WHERE id = probe_id;
  IF n <> 0 THEN RAISE EXCEPTION 'cross-tenant read was not blocked'; END IF;

  PERFORM set_config('app.tenant_id', 'tenant_alpha', true);
  SELECT count(*) INTO n FROM public.proof_evidence WHERE id = probe_id;
  IF n <> 1 THEN RAISE EXCEPTION 'same-tenant read was unexpectedly blocked'; END IF;
  DELETE FROM public.proof_evidence WHERE id = probe_id;

  RAISE NOTICE 'LOCAL_POSTGRES_SCHEMA_AND_RLS_SMOKE_PASSED: % required tables; RLS enabled+forced; runtime role restricted; cross-tenant read blocked', cardinality(expected);
END
$verify$;

COMMIT;
SQL
