import assert from 'node:assert/strict';
import { test } from 'node:test';

/*
 * Static regression checks for the Daisy auth RLS guard and database-boundary contract.
 * These checks do not replace PostgreSQL integration tests and do not prove runtime isolation.
 * Run from the repository root with the project's TypeScript test runner.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const read = (path: string) => readFile(resolve(process.cwd(), path), 'utf8');

test('RLS guard enables and forces RLS for every Daisy auth table without permissive policies', async () => {
  const sql = await read('migrations/006_daisy_auth_rls_fail_closed_guard.sql');
  const tables = [
    'daisy_auth_tenants',
    'daisy_auth_accounts',
    'daisy_auth_sessions',
    'daisy_auth_one_time_tokens',
    'daisy_auth_rate_limits',
  ];
  for (const table of tables) {
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'));
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} FORCE ROW LEVEL SECURITY`, 'i'));
  }
  assert.doesNotMatch(sql, /CREATE\s+POLICY/i, 'guard must not invent tenant policies');
  assert.doesNotMatch(sql, /GRANT\s+(SELECT|INSERT|UPDATE|DELETE|ALL)/i, 'guard must not grant app table access');
  assert.match(sql, /REVOKE ALL ON TABLE[\s\S]*FROM PUBLIC/i);
});

test('database boundary document explicitly forbids trusting caller-supplied tenant context', async () => {
  const doc = await read('docs/DAISY_AUTH_DATABASE_BOUNDARY.md');
  assert.match(doc, /Never accept tenant ID or account ID as proof of authorization/i);
  assert.match(doc, /fixed safe/i);
  assert.match(doc, /cross-tenant/i);
  assert.match(doc, /SECURITY DEFINER/i);
});

test('read-only audit script contains no schema or data mutations', async () => {
  const sql = await read('scripts/audit_daisy_auth_privileges_readonly.sql');
  assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|GRANT|REVOKE|TRUNCATE)\b/i);
  assert.match(sql, /pg_policies/i);
  assert.match(sql, /pg_auth_members/i);
  assert.match(sql, /has_table_privilege/i);
});