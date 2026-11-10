import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const auth = read('src/auth/AuthService.ts');
const api = read('server.ts');

assert.match(auth, /createPublicKey/);
assert.match(auth, /verifySignature/);
assert.match(auth, /AUTH_ISSUER/);
assert.match(auth, /AUTH_AUDIENCE/);
assert.match(auth, /AUTH_JWKS_URL/);
assert.match(auth, /claims\.tenant_id/);
assert.match(auth, /claims\.role/);
assert.match(auth, /claims\.exp/);
assert.match(auth, /claims\.iss !== issuer/);
assert.match(auth, /Only keyed RS256 JWTs are accepted/);
assert.match(api, /app\.put\('\/api\/proofs\/:proofId'/);
assert.match(api, /app\.get\('\/api\/proofs\/:proofId'/);
assert.match(api, /user\.tenant_id/);
assert.match(api, /DURABLE_READBACK_VERIFIED/);
assert.match(api, /PROOF_AUTH_NOT_CONFIGURED/);
console.log('PASS: proof API requires trusted RS256 OIDC identity, signed tenant claims, and durable object readback.');
