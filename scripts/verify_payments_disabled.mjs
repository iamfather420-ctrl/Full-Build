import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const adapter = read('src/payments/PayPalAdapter.ts');
const app = read('src/App.tsx');
const marketplace = read('src/components/MarketplaceView.tsx');
const api = read('src/api/ApiRouter.ts');

assert.match(adapter, /Fail-closed payment boundary[\s\S]*deliberately[\s\S]*unavailable[\s\S]*no network calls/i,
  'PayPal adapter must document its disabled boundary');
assert.match(adapter, /public hasActiveCredentials\(\): boolean \{\s*return false;/,
  'PayPal adapter must never report active credentials');
assert.match(adapter, /BLOCKED: PayPal credential testing is disabled and no network request was made/,
  'credential testing must remain disabled');
assert.doesNotMatch(adapter, /\bfetch\s*\(|https?:\/\//,
  'disabled adapter must not make provider network calls');
assert.match(marketplace, /Checkout, escrow funding, and live payments are disabled/,
  'marketplace must disclose the disabled payment state');
assert.match(api, /payments_enabled: false/);
assert.match(app, /PayPalHub/,
  'this check does not pretend the legacy PayPal UI module has been removed');
console.log('PASS: PayPal adapter has no provider network calls, active credentials are false, and checkout/live payments remain disclosed as disabled.');
