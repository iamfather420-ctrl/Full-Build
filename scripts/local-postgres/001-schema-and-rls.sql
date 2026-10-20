-- LOCAL DEVELOPMENT / CI ONLY.
-- This is a schema contract for exercising the 27-table persistence boundary.
-- It is not a production migration and does not alter a Neon database.
-- RLS policies fail closed unless the application sets app.tenant_id transaction-locally.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'solvex_runtime') THEN
    CREATE ROLE solvex_runtime LOGIN PASSWORD 'runtime_local'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  ELSE
    ALTER ROLE solvex_runtime LOGIN
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
    ALTER ROLE solvex_runtime PASSWORD 'runtime_local';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS permissions (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS tenant_memberships (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS problems (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS paradoxes (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS invariants (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS solutions (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS offers (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS proof_bundles (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS proof_evidence (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS tests (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS verification_runs (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS deployments (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS checkpoints (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS rollback_records (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS telemetry (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS audit_records (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS chain_records (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS licenses (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS adapter_status (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS node_registry (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS execution_runs (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);
CREATE TABLE IF NOT EXISTS failures (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, status TEXT NOT NULL, version TEXT NOT NULL, payload_json JSONB);

GRANT CONNECT ON DATABASE solvex TO solvex_runtime;
GRANT USAGE ON SCHEMA public TO solvex_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO solvex_runtime;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','tenants','roles','permissions','tenant_memberships',
    'problems','paradoxes','invariants','solutions','offers',
    'proof_bundles','proof_evidence','tests','verification_runs',
    'orders','payments','deployments','checkpoints','rollback_records',
    'telemetry','audit_records','chain_records','licenses',
    'adapter_status','node_registry','execution_runs','failures'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), ''''))',
      t
    );
  END LOOP;
END
$$;

COMMIT;
