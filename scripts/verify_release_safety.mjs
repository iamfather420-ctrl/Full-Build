import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const api = read('src/api/ApiRouter.ts');
const auth = read('src/auth/AuthService.ts');
const production = read('scripts/verify_production_runtime.ts');
const neon = read('src/database/NeonPersistence.ts');
const migration = read('migrations/004_access_requests.sql');
const server = read('server.ts');
const app = read('src/App.tsx');
const header = read('src/components/Header.tsx');
const workflow = read('.github/workflows/verify-authoritative.yml');
const preflight = read('src/services/preflight.ts');
const packageJson = JSON.parse(read('package.json'));

assert.match(api, /path === '\/api\/auth\/login'.*status: 410/s,
  'public role-selecting login must be retired');
assert.match(api, /private async extractAuthUser[\s\S]*verifyOidcAccessToken/s,
  'production API must validate tokens through trusted OIDC');
assert.match(api, /if \(!user && !publicRead[\s\S]*status: 401/s,
  'API routes must fail closed for unauthenticated requests except explicit public read routes');
assert.match(api, /path === '\/api\/tenants' && method === 'GET'[\s\S]*MANAGE_TENANTS/s,
  'tenant inventory must require tenant-management authorization');
assert.match(api, /path === '\/api\/orders' && method === 'POST'[\s\S]*CREATE_ORDER/s,
  'order creation must require CREATE_ORDER permission and derive tenant from token');
assert.match(auth, /Local HS256 token issuance is disabled outside explicit non-production local_hs256 mode/,
  'local token issuance must be disabled in production');
assert.doesNotMatch(production.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''), /runMigrations\s*\(/,
  'production preflight must never mutate database schema');
assert.doesNotMatch(production.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''), /PayPalAdapter|PAYPAL_ACTIVE_ENVIRONMENT|PAYPAL_CLIENT|paypal_live_authentication/i,
  'production preflight must not require or contact PayPal');
assert.match(server, /code_challenge_method', 'S256'/, 'OIDC login must use PKCE');
assert.match(server, /verifyOidcIdToken[\s\S]*verifyOidcAccessToken/,
  'OIDC callback must validate both ID-token nonce and API access token');
assert.match(server, /app\.use\(\(req, res, next\) => \{\s*if \(!req\.path\.startsWith\('\/api\/'\)\) return next\(\)/,
  'Express must preserve the /api prefix when dispatching API requests');
assert.match(server, /Same-origin request required for cookie-authenticated mutations/,
  'cookie-authenticated mutations must enforce same-origin protection');
assert.match(app, /fetch\('\/api\/auth\/me'/, 'UI must resolve the session from the authenticated backend');
assert.match(header, /Sign in/, 'UI must expose sign-in');
assert.match(header, /Sign out/, 'UI must expose sign-out');
assert.doesNotMatch(header, /role switch|setRole|setTenant/, 'UI must not expose client-side role or tenant switching');
assert.match(api, /\/api\/access-requests[\s\S]*HUMAN_REVIEW_REQUIRED[\s\S]*payment_state: 'DISABLED'/,
  'access requests must be persisted as human-review-only and payment-disabled');
assert.match(migration, /CREATE TABLE IF NOT EXISTS access_requests/);
assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|ALTER TABLE/i, 'access-request migration must be additive only');
assert.match(server, /primaryApiStorageWiredToNeon = false[\s\S]*ready = oidcConfigured[\s\S]*primaryApiStorageWiredToNeon/,
  'production readiness must remain blocked while primary domain storage still uses SQLite');
assert.match(neon, /Automatic Neon migrations are disabled in this release; no schema mutation was attempted/ ,
  'bulk Neon schema mutation must be disabled');
assert.match(neon, /generic payload_json persistence adapter does not match the actual/,
  'incompatible generic Neon writes must fail closed');
assert.match(production, /schema_mutations_performed: false/,
  'production preflight must disclose that it performs no schema mutations');
for (const script of ['verify:payments-disabled', 'verify:release-safety', 'verify:auth-contract', 'verify:api-security']) {
  assert.ok(packageJson.scripts[script], `package.json must define ${script}`);
assert.match(workflow, /bun install --frozen-lockfile/, 'CI must use the committed frozen Bun lockfile');
assert.match(workflow, /bun run verify:auth-contract/, 'CI must run the OIDC authentication contract tests');
assert.doesNotMatch(workflow, /PAYPAL_(?:LIVE|SANDBOX)_CLIENT_SECRET|NEON_DATABASE_URL:\s*\$\{\{\s*secrets/, 'CI must not inject live PayPal or Neon credentials');
assert.doesNotMatch(workflow, /environment:\s*name:\s*production/, 'verification CI must not run in a production deployment environment');
assert.doesNotMatch(preflight, /PAYPAL_(?:LIVE|SANDBOX)_CLIENT|PAYPAL_ACTIVE_ENVIRONMENT/, 'preflight must not require PayPal credentials for this release');
assert.match(preflight, /AUTH_ISSUER[\s\S]*AUTH_AUDIENCE[\s\S]*AUTH_JWKS_URL[\s\S]*AUTH_CLIENT_ID[\s\S]*AUTH_CLIENT_SECRET[\s\S]*AUTH_REDIRECT_URI/, 'production preflight must check trusted OIDC configuration');
assert.match(preflight, /PAYMENT_PROCESSING[\s\S]*NOT_REQUIRED_FOR_SELECTED_ENVIRONMENT/, 'PayPal-disabled policy must not block production preflight');
}
console.log('PASS: release safety guards enforce fail-closed auth, trusted OIDC in production, protected tenant/order APIs, read-only Neon preflight, and no PayPal dependency.');
