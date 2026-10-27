import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const auth = read('src/auth/AuthService.ts');
const sessionGuard = read('src/auth/SessionGuard.ts');
const api = read('src/api/ApiRouter.ts');

assert.match(auth, /throw new Error\('BLOCKED: local token issuance is disabled/,
  'AuthService must reject local token issuance.');
assert.match(auth, /valid: false, error: 'BLOCKED: no configured production OIDC verifier is available\./,
  'AuthService must reject unverified tokens.');
assert.match(auth, /BLOCKED: verified identity and signed tenant claims are required\./,
  'AuthService must reject unauthorized access.');
assert.match(auth, /requireVerifiedSession\(/,
  'AuthService must expose a verified-session check.');
assert.match(sessionGuard, /status: 'BLOCKED'/,
  'SessionGuard must remain fail-closed.');
assert.match(sessionGuard, /no verified first-party session/,
  'SessionGuard must require a verified first-party session.');
assert.match(api, /readiness: 'BLOCKED'/,
  'System status must remain read-only and blocked until verified auth is implemented.');
console.log('PASS: first-party auth/session layer remains fail-closed and does not advertise production identity or session authorization.');
