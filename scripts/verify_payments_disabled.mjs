import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const api = read('src/api/ApiRouter.ts');
const marketplace = read('src/components/MarketplaceView.tsx');
const product = read('src/routes/product.$id.tsx');
const app = read('src/App.tsx');
const header = read('src/components/Header.tsx');
const shield = read('src/lib/sovereignShield.ts');
const rag = read('src/lib/rag.ts');
const integrations = read('src/lib/integrations.ts');
const adapter = read('src/payments/PayPalAdapter.ts');
const nativeEngine = read('app/src/main/java/com/example/data/UarefakeEngine.kt');
const paypalVerification = read('scripts/verify_paypal_dual_env.ts');
const sandboxVerification = read('src/tests/sandboxVerificationPipeline.ts');
const closureVerification = read('scripts/full_build_verification_closure.ts');

assert.match(api, /path\.startsWith\('\/api\/payments'\).*return \{ status: 410/s,
  'all API payment routes must fail closed with HTTP 410');
assert.doesNotMatch(api, /import\s+\{\s*PayPalAdapter\s*\}/,
  'API router must not load PayPal capture/configuration adapter');
assert.doesNotMatch(marketplace, /captureOrderPayment|Pay\s*&\s*Capture|PayPal DN-35/,
  'marketplace must not call or offer PayPal capture');
assert.match(marketplace, /ACCESS_REQUEST_DRAFT|Create Local Draft/,
  'marketplace must describe its local-only draft workflow honestly');
assert.doesNotMatch(product, /paypal\.me|PAY WITH PAYPAL|SECURE PAYMENT/,
  'product page must not offer direct PayPal payment');
assert.doesNotMatch(app, /PayPalHub|setActiveTab\('PAYPAL'\)|role:\s*'OWNER'/,
  'app must not expose PayPal setup or hardcode a client-side owner');
const captureMethod = adapter.slice(adapter.indexOf('public async captureOrderPayment('));
assert.match(captureMethod, /status: 'PAYMENTS_DISABLED'/, 'payment adapter must have a release-level kill switch');
assert.doesNotMatch(captureMethod, /fetch\(|acquireOAuthToken|insertRecord|createPayPalOrder/, 'disabled capture path must not contact providers or write receipts');
assert.doesNotMatch(adapter, /fetch\(/, 'the adapter must not make provider network requests while disabled');
assert.match(adapter, /public setSessionCredentials\([^]*?return false;/, 'session credential activation must be disabled');
assert.match(adapter, /public async testLiveCredentials\([^]*?No provider request was made/, 'credential tests must not contact PayPal while disabled');
assert.match(nativeEngine, /Payment processing is disabled in this release/, 'native engine must not initiate PayPal orders');
assert.doesNotMatch(paypalVerification, /fetch\(|api-m\.paypal\.com|api-m\.sandbox\.paypal\.com/, 'PayPal verification script must not contact provider while disabled');
assert.match(paypalVerification, /network_requests_made: 0/, 'verification artifact must declare zero provider requests');
assert.doesNotMatch(sandboxVerification, /process\.env\.PAYPAL_|api-m\.paypal\.com|testLiveCredentials|acquireOAuthToken/, 'sandbox verification must not inspect PayPal credentials or contact provider');
assert.doesNotMatch(closureVerification, /process\.env\.PAYPAL_|api-m\.paypal\.com|acquireOAuthToken/, 'closure verification must not inspect PayPal credentials or contact provider');
assert.doesNotMatch(shield, /paypal\.me|paypalUrl:/i, 'tier metadata must not expose direct checkout URLs');
assert.match(shield, /resolveCheckoutURL\(_tierKey: string\): null/, 'checkout resolver must be disabled');
assert.doesNotMatch(rag, /paypal\.me\/tjites/i, 'AI grounding text must not direct customers to PayPal');
assert.doesNotMatch(integrations, /paypal\.me\/tjites/i, 'generated email footer must not expose direct checkout');
assert.match(header, /Demo session · not authenticated/,
  'header must disclose unauthenticated demo state');
assert.match(header, /Sign in/, 'header must expose the trusted sign-in flow');
console.log('PASS: payment processing disabled; API fail-closed; no direct PayPal CTA; local drafts disclosed; no client-side OWNER default.');
