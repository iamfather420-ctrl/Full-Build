import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../db/migrations/20261029_first_party_auth.sql', import.meta.url), 'utf8');
assert.match(sql, /^BEGIN;/m, 'migration must be transactional');
assert.match(sql, /COMMIT;\s*$/, 'migration must close its transaction');
assert.doesNotMatch(sql, /\bDROP\s+(TABLE|SCHEMA|FUNCTION|DATABASE)\b/i, 'auth migration must not drop existing objects');
assert.doesNotMatch(sql, /\bTRUNCATE\b/i, 'auth migration must not truncate data');
assert.doesNotMatch(sql, /REVOKE\s+EXECUTE\s+ON\s+ALL\s+FUNCTIONS/i, 'must not revoke unrelated private functions');
assert.doesNotMatch(sql, /DISABLE\s+ROW\s+LEVEL\s+SECURITY/i, 'must not weaken RLS');
assert.doesNotMatch(sql, /GRANT\s+.*BYPASSRLS/i, 'must not grant RLS bypass');

for (const table of ['auth_invitations', 'auth_credentials', 'auth_sessions', 'auth_rate_limits', 'auth_audit']) {
  assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS solvex_private\\.${table}\\b`), `missing auth table ${table}`);
}

const functionNames = [
  'auth_register_from_invitation',
  'auth_find_credential_by_email',
  'auth_find_credential_by_user',
  'auth_find_membership',
  'auth_create_session',
  'auth_find_session',
  'auth_revoke_session',
  'auth_append_audit',
  'auth_rate_limit_allow',
  'auth_rate_limit_failure',
  'auth_rate_limit_clear',
];
for (const name of functionNames) {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION solvex_private.${name}(`);
  assert.notEqual(start, -1, `missing function ${name}`);
  const next = sql.indexOf('CREATE OR REPLACE FUNCTION ', start + 10);
  const block = sql.slice(start, next < 0 ? sql.length : next);
  assert.match(block, /SECURITY DEFINER/i, `${name} must use a reviewed definer boundary`);
  assert.match(block, /SET search_path = pg_catalog, public, solvex_private/i, `${name} must pin search_path`);
  assert.match(sql, new RegExp(`REVOKE EXECUTE ON FUNCTION solvex_private\\.${name}\\([^;]+ FROM PUBLIC;`), `${name} must revoke PUBLIC execute`);
  assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION solvex_private\\.${name}\\([^;]+ TO solvex_app_runtime;`), `${name} must grant only the runtime role`);
}

assert.match(sql, /WHERE tenant_id = v_inv\.tenant_id AND name = 'CUSTOMER'/, 'registration must require a pre-provisioned CUSTOMER role');
assert.match(sql, /used_at IS NULL AND expires_at > p_now FOR UPDATE/, 'invitation consumption must lock and reject replay');
assert.match(sql, /SELECT \* INTO v_row FROM solvex_private\.auth_rate_limits WHERE key_hash = p_key_hash FOR UPDATE/, 'rate-limit attempts must serialize across replicas');
assert.match(sql, /SET LOCAL ROLE solvex_app_runtime/i.test('SET LOCAL ROLE solvex_app_runtime') ? /solvex_app_runtime/ : /$^/, 'runtime role name contract');
console.log('PASS: auth migration static safety checks (additive tables, pinned SECURITY DEFINER search paths, narrow function grants, invitation row lock, atomic rate limiter).');
console.log('LIMITATION: static inspection is not PostgreSQL syntax validation, function-owner verification, or live staging/RLS integration.');
