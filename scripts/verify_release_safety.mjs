import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const auth = read('src/auth/AuthService.ts');
const api = read('src/api/ApiRouter.ts');
const runtime = read('scripts/verify_production_runtime.ts');
const sqliteStore = read('src/database/SqliteStore.ts');
const durableStore = read('src/database/DurableStore.ts');
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
assert.match(durableStore, /window\.localStorage\.setItem/,
  'browser state persistence must remain visible for production-readiness auditing');
assert.match(workflow, /PAYMENTS_ENABLED:\s*'false'/,
  'authoritative workflow must keep payments disabled');
assert.ok(packageJson.scripts['verify:release-safety'], 'release safety command must be declared');
assert.ok(packageJson.scripts['verify:payments-disabled'], 'payments-disabled command must be declared');

console.log('PASS: authentication and authorization fail closed; public API is read-only; readiness is blocked; payments stay disabled.');
