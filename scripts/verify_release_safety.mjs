import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const auth = read('src/auth/AuthService.ts');
const api = read('src/api/ApiRouter.ts');
const runtime = read('scripts/verify_production_runtime.ts');
const workflow = read('.github/workflows/verify-authoritative.yml');
const packageJson = JSON.parse(read('package.json'));\nconst firstPartyAuth = read('src/auth/FirstPartyAuth.ts');\nconst firstPartyRouter = read('src/auth/FirstPartyAuthRouter.ts');\nconst authRepository = read('src/auth/NeonFirstPartyAuthRepository.ts');\nconst authMigration = read('migrations/005_daisy_first_party_auth.sql');

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
assert.match(workflow, /PAYMENTS_ENABLED:\s*'false'/,
  'authoritative workflow must keep payments disabled');
assert.ok(packageJson.scripts['verify:release-safety'], 'release safety command must be declared');
assert.ok(packageJson.scripts['verify:payments-disabled'], 'payments-disabled command must be declared');\nassert.ok(packageJson.scripts['verify:first-party-auth'], 'first-party auth tests must be declared');\nassert.match(firstPartyAuth, /DUMMY_PASSWORD_HASH/, 'unknown-account login must perform password-hash work');\nassert.match(firstPartyAuth, /PASSWORD_MIN_LENGTH = 12/, 'password minimum must remain enforced');\nassert.match(firstPartyRouter, /HttpOnly; Secure; SameSite=Lax/, 'session cookie must use secure cookie attributes');\nassert.match(firstPartyRouter, /req.get\('origin'\) !== origin/, 'mutating auth routes must validate request origin');\nassert.match(authRepository, /BEGIN[\s\S]*COMMIT/, 'repository must use transactions for sensitive multi-step operations');\nassert.match(authMigration, /role text NOT NULL DEFAULT 'CUSTOMER'/, 'public registration must default to non-privileged CUSTOMER');\nassert.doesNotMatch(api, /createFirstPartyAuthRouter|NeonFirstPartyAuthRepository/, 'new authentication routes must not be mounted before production gates pass');

console.log('PASS: authentication and authorization fail closed; public API is read-only; readiness is blocked; payments stay disabled.');
