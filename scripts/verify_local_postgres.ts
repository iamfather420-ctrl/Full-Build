import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

const url = process.env.LOCAL_POSTGRES_URL || process.env.DATABASE_URL || '';
if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing local PostgreSQL verifier in NODE_ENV=production.');
}
if (process.env.LOCAL_POSTGRES_VERIFY !== '1') {
  throw new Error('Set LOCAL_POSTGRES_VERIFY=1 to explicitly enable this non-production verifier.');
}
let parsed: URL;
try { parsed = new URL(url); } catch { throw new Error('A valid LOCAL_POSTGRES_URL is required.'); }
if (!['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
  throw new Error(`Refusing non-local database host: ${parsed.hostname}`);
}

const required = [
  'users','tenants','roles','permissions','tenant_memberships',
  'problems','paradoxes','invariants','solutions','offers',
  'proof_bundles','proof_evidence','tests','verification_runs',
  'orders','payments','deployments','checkpoints','rollback_records',
  'telemetry','audit_records','chain_records','licenses',
  'adapter_status','node_registry','execution_runs','failures'
] as const;

const pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 5000 });
const fail = (message: string): never => { throw new Error(`LOCAL_POSTGRES_VERIFY_FAILED: ${message}`); };

try {
  const roleResult = await pool.query(`
    SELECT current_user AS role_name, r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication, r.rolbypassrls
    FROM pg_roles r WHERE r.rolname = current_user
  `);
  const role = roleResult.rows[0];
  if (!role) fail('current database role was not found');
  if (role.role_name !== 'solvex_runtime') fail(`expected solvex_runtime, got ${role.role_name}`);
  if (role.rolsuper || role.rolcreatedb || role.rolcreaterole || role.rolreplication || role.rolbypassrls) {
    fail('runtime role has an elevated privilege flag');
  }

  const tableResult = await pool.query(`
    SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
           c.relforcerowsecurity AS rls_forced,
           COALESCE((SELECT count(*) FROM pg_policies p
             WHERE p.schemaname = n.nspname AND p.tablename = c.relname), 0)::int AS policy_count
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
      AND c.relname NOT LIKE '\\_%' ESCAPE '\\'
    ORDER BY c.relname
  `);
  const byName = new Map(tableResult.rows.map((row: any) => [row.table_name, row]));
  const missing = required.filter(name => !byName.has(name));
  if (missing.length) fail(`missing required tables: ${missing.join(', ')}`);
  const unprotected = required.filter(name => {
    const row: any = byName.get(name);
    return row.rls_enabled !== true || row.rls_forced !== true || Number(row.policy_count) < 1;
  });
  if (unprotected.length) fail(`tables missing enabled/forced RLS or policy: ${unprotected.join(', ')}`);

  const client = await pool.connect();
  const probeId = `rls-probe-${randomUUID()}`;
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", ['tenant_alpha']);
    await client.query(
      `INSERT INTO public.proof_evidence (id, tenant_id, created_at, updated_at, status, version, payload_json)
       VALUES ($1, $2, $3, $3, 'LOCAL_TEST', 'local-only', $4::jsonb)`,
      [probeId, 'tenant_alpha', Date.now(), JSON.stringify({ purpose: 'RLS isolation smoke test' })]
    );
    await client.query('COMMIT');

    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", ['tenant_beta']);
    const hidden = await client.query('SELECT id FROM public.proof_evidence WHERE id = $1', [probeId]);
    if (hidden.rowCount !== 0) fail('tenant_beta could read tenant_alpha probe record');
    await client.query('COMMIT');

    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", ['tenant_alpha']);
    const visible = await client.query('SELECT id FROM public.proof_evidence WHERE id = $1', [probeId]);
    if (visible.rowCount !== 1) fail('tenant_alpha could not read its own probe record');
    await client.query('DELETE FROM public.proof_evidence WHERE id = $1', [probeId]);
    await client.query('COMMIT');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }

  console.log(JSON.stringify({
    verdict: 'LOCAL_POSTGRES_SCHEMA_AND_RLS_SMOKE_PASSED',
    scope: 'LOCAL_ONLY',
    runtime_role: role.role_name,
    required_tables: required.length,
    tables_present: required.length,
    tables_with_enabled_forced_rls_and_policy: required.length,
    cross_tenant_read_blocked: true,
    same_tenant_read_allowed: true,
    paypal_enabled_or_tested: false,
    production_neon_verified: false
  }, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
