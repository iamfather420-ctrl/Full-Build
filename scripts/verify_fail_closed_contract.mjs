import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const auth = read('src/auth/AuthService.ts');
const api = read('src/api/ApiRouter.ts');
const paypal = read('src/payments/PayPalAdapter.ts');
const market = read('src/components/MarketplaceView.tsx');
const app = read('src/App.tsx');

assert.match(auth, /createSignedToken\s*\([^)]*\)\s*:\s*string\s*\{\s*throw new Error\('BLOCKED: local token issuance is disabled; use the approved OIDC issuer\.'\);/s,
  'AuthService must fail closed by rejecting local token issuance.');
assert.match(auth, /verifyToken\s*\([^)]*\)\s*:\s*\{\s*valid:\s*boolean;\s*user\?:\s*UserContext;\s*error\?:\s*string\s*\}\s*\{\s*return \{ valid: false, error: 'BLOCKED: no configured production OIDC verifier is available\.' \};/s,
  'AuthService must fail closed when no production OIDC verifier is configured.');
assert.match(auth, /authorize\s*\([^)]*\)\s*:\s*\{\s*authorized:\s*boolean;\s*reason:\s*string\s*\}\s*\{\s*return \{ authorized: false, reason: 'BLOCKED: verified identity and signed tenant claims are required\.' \};/s,
  'AuthService must reject authorization without verified identity and tenant claims.');

assert.match(api, /if \(method !== 'GET'\)/, 'API router must reject non-GET requests.');
assert.match(api, /path !== '\/api\/system\/health'\s*&&\s*path !== '\/api\/system\/status'/s,
  'API router must expose only the documented read-only system endpoints.');
assert.match(api, /authentication_enabled:\s*false/, 'API must report authentication as disabled.');
assert.match(api, /payments_enabled:\s*false/, 'API must report payments as disabled.');
assert.match(api, /readiness:\s*'BLOCKED'/, 'API must surface a blocked readiness state.');

assert.match(paypal, /public hasActiveCredentials\(\): boolean \{\s*return false;\s*\}/s,
  'PayPal adapter must never report active credentials while disabled.');
assert.match(paypal, /testLiveCredentials\s*\([^)]*\)\s*:\s*Promise<PayPalCredentialTestResult>\s*\{\s*return \{ valid: false, authenticated: false, reason: 'BLOCKED: PayPal credential testing is disabled and no network request was made\.' \};/s,
  'PayPal adapter must remain blocked and disclose the disabled credential test boundary.');
assert.match(paypal, /captureOrderPayment\s*\([^)]*\)\s*:\s*Promise<PayPalCaptureResult>\s*\{\s*return \{\s*status: 'EXTERNAL_PROVIDER_REQUIRED',\s*reason: 'BLOCKED: PayPal payments are disabled pending production authorization and readiness verification\.'/s,
  'PayPal capture flow must remain externally required and blocked.');
assert.doesNotMatch(paypal, /\bfetch\s*\(|https?:\/\//, 'Disabled PayPal adapter must not make provider network calls.');

assert.match(market, /Checkout, escrow funding, and live payments are disabled/i,
  'Marketplace UI must clearly disclose the disabled payment state.');
assert.match(app, /PayPalHub/, 'App must still include the PayPal hub shell without pretending it is active.');

console.log('PASS: fail-closed auth, API, payment, and marketplace contract checks are consistent and production-disabled.');
