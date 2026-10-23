import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const auth = read('src/auth/AuthService.ts');
const api = read('src/api/ApiRouter.ts');
const runtime = read('scripts/verify_production_runtime.ts');
const sqliteStore = read('src/database/SqliteStore.ts');
const durableStore = read('src/database/DurableStore.ts');
const preflight = read('src/services/preflight.ts');
const neonPersistence = read('src/database/NeonPersistence.ts');
const workflow = read('.github/workflows/verify-authoritative.yml');
const packageJson = JSON.parse(read('package.json'));

assert.match(auth, /createSignedToken[\s\S]*throw new Error\('BLOCKED:/,
  'local token creation must fail closed');
assert.match(auth, /verifyToken[\s\S]*return \{ valid: false,/,
  'unconfigured token verification must reject tokens');
assert.match(auth, /authorize[\s\S]*return \{ authorized: false,/,
  'authorization must fail closed without verified identity');
assert.match(api, /if \(method !== 'GET'\)/,
  'the current API router must reject mutations');
assert.match(api, /path !== '\/api\/system\/health'[\s\S]*path !== '\/api\/system\/status'/,
  'the current API router must expose only the documented read-only system endpoints');
assert.match(api, /authentication_enabled: false/);
assert.match(api, /payments_enabled: false/);
assert.match(api, /readiness: 'BLOCKED'/);
assert.doesNotMatch(runtime, /runMigrations\s*\(/,
  'production readiness verification must not mutate the schema');
assert.match(sqliteStore, /SQLITE_WRITE_BLOCKED:[^']*cannot persist SQL writes/,
  'non-durable SQLite fallback must reject writes instead of reporting fake success');
assert.match(sqliteStore, /Non-durable in-memory fallback/,
  'the in-memory SQL fallback must be explicitly identified as non-durable');
assert.match(neonPersistence, /backend: 'PERSISTENCE_UNAVAILABLE',[\s\S]*?configured: false/,
  'missing cloud database configuration must report persistence unavailable');
assert.match(preflight, /let sqliteStatus: DependencyStatus = env === 'production' && cloudDatabaseConfigured \? 'NOT_REQUIRED_FOR_SELECTED_ENVIRONMENT' : 'MISSING'/,
  'preflight must fail closed when native SQLite is unavailable');
assert.match(preflight, /non-durable fallback is not counted as a database/i,
  'preflight must not treat the in-memory fallback as a real database');
assert.match(preflight, /items\.push\(checkVar\('NEON_DATABASE_URL', true/,
  'production preflight must require cloud database configuration');
assert.match(preflight, /items\.push\(checkVar\('AUTH_MODE', true, \(v\) => v\.trim\(\)\.toLowerCase\(\) === 'oidc'\)/,
  'production preflight must require OIDC mode, not local token mode');
assert.match(preflight, /AUTH_ISSUER', true,[\s\S]*?new URL\(v\)\.protocol === 'https:'/,
  'production OIDC issuer must be an HTTPS URL');
assert.match(preflight, /items\.push\(checkVar\('AUTH_AUDIENCE', true, \(v\) => v\.trim\(\)\.length > 0\)/,
  'production OIDC audience must be configured');
assert.match(preflight, /AUTH_JWKS_URL', true,[\s\S]*?new URL\(v\)\.protocol === 'https:'/,
  'production JWKS endpoint must be HTTPS');
assert.match(preflight, /items\.push\(checkVar\('AUTH_CLIENT_ID', true/);
assert.match(preflight, /items\.push\(checkVar\('AUTH_CLIENT_SECRET', true/,
  'production OIDC client credentials must be present');
assert.match(preflight, /AUTH_REDIRECT_URI', true,[\s\S]*?new URL\(v\)\.protocol === 'https:'/,
  'production OIDC redirect URI must be HTTPS');
assert.match(preflight, /Presence is not proof of a working/,
  'preflight must state that configuration presence does not prove provider integration');
assert.match(preflight, /env === 'production' && cloudDatabaseConfigured/,
  'local SQLite must not be required when production is configured for cloud persistence');
assert.match(preflight, /PAYPAL_LIVE_CLIENT_ID', false/);
assert.match(preflight, /PAYPAL_LIVE_CLIENT_SECRET', false/,
  'live payment credentials must not be a production prerequisite while payments are disabled');

assert.match(neonPersistence, /new neonMod\.Pool\(\{ connectionString: this\.databaseUrl! \}\)/,
  'Neon operations must use the Pool API when invoking parameterized .query calls');
assert.match(neonPersistence, /testRes\?\.rows\?\.\[0\]\?\.connected/,
  'Neon connectivity must inspect the Pool query result rows');
assert.match(neonPersistence, /WHERE \$\{tableName\}\.tenant_id = EXCLUDED\.tenant_id/,
  'conflict updates must not overwrite records belonging to a different tenant');
assert.match(neonPersistence, /Unexpected Neon query result shape/,
  'Neon read paths must reject unexpected result shapes instead of claiming verification');

assert.match(durableStore, /PERSISTENCE_BLOCKED: browser localStorage is unavailable/,
  'browser state writes must fail closed when local persistence is unavailable');
assert.match(durableStore, /PERSISTENCE_BLOCKED: browser localStorage write failed/,
  'browser state writes must surface storage failures instead of swallowing them');

assert.match(workflow, /PAYMENTS_ENABLED:\s*'false'/,
  'authoritative workflow must keep payments disabled');
assert.ok(packageJson.scripts['verify:release-safety'], 'release safety command must be declared');
assert.ok(packageJson.scripts['verify:payments-disabled'], 'payments-disabled command must be declared');

console.log('PASS: authentication and authorization fail closed; public API is read-only; readiness is blocked; payments stay disabled.');
