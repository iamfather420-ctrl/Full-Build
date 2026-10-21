import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { AuthService } from '../src/auth/AuthService';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
function makeJwt(claims: Record<string, unknown>, privateKey: any, kid = 'auth-contract-key'): string {
  const header = encode({ alg: 'RS256', typ: 'JWT', kid });
  const payload = encode(claims);
  const signingInput = `${header}.${payload}`;
  const signature = sign('RSA-SHA256', Buffer.from(signingInput), privateKey).toString('base64url');
  return `${signingInput}.${signature}`;
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Auth contract tests refuse to run in production mode.');
  process.env.NODE_ENV = 'test';
  process.env.AUTH_MODE = 'local_hs256';
  process.env.SOVEREIGN_AUTH_SECRET = randomBytes(32).toString('hex');
  const auth = AuthService.getInstance();

  const local = auth.createSignedToken('customer-1', 'tenant-1', 'customer@example.test', 'CUSTOMER');
  const localResult = auth.verifyToken(local);
  assert.equal(localResult.valid, true, 'valid local test token must verify');
  assert.equal(localResult.user?.tenant_id, 'tenant-1');
  assert.equal(localResult.user?.permissions?.includes('SYS_ADMIN'), false, 'customer must not have SYS_ADMIN');
  assert.equal(auth.verifyToken(`${local.slice(0, -2)}xx`).valid, false, 'tampered local token must fail');

  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
  jwk.kid = 'auth-contract-key';
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ keys: [jwk] }), {
    status: 200, headers: { 'content-type': 'application/json' },
  })) as typeof fetch;

  const now = Math.floor(Date.now() / 1000);
  const issuer = 'https://idp.example/';
  process.env.AUTH_ISSUER = issuer;
  process.env.AUTH_CLIENT_ID = 'solvex-client';
  process.env.AUTH_AUDIENCE = 'solvex-api';
  process.env.AUTH_JWKS_URL = 'https://idp.example/.well-known/jwks.json';
  process.env.AUTH_MAX_TOKEN_LIFETIME_SECONDS = '3600';
  process.env.AUTH_MODE = 'oidc';

  try {
    const idToken = makeJwt({ iss: issuer, aud: 'solvex-client', sub: 'user-1', iat: now, exp: now + 300, nonce: 'nonce-123' }, privateKey);
    const accessToken = makeJwt({ iss: issuer, aud: 'solvex-api', sub: 'user-1', iat: now, exp: now + 300, tenant_id: 'tenant-1', role: 'CUSTOMER', permissions: ['SYS_ADMIN'] }, privateKey);
    const idResult = await auth.verifyOidcIdToken(idToken, 'nonce-123');
    const accessResult = await auth.verifyOidcAccessToken(accessToken);
    assert.equal(idResult.valid, true, 'valid signed ID token and nonce must verify');
    assert.equal(idResult.subject, 'user-1');
    assert.equal(accessResult.valid, true, 'valid signed access token must verify');
    assert.equal(accessResult.user?.tenant_id, 'tenant-1');
    assert.equal(accessResult.user?.permissions?.includes('SYS_ADMIN'), false, 'token permissions must not override server role policy');
    assert.equal((await auth.verifyOidcIdToken(idToken, 'wrong-nonce')).valid, false, 'wrong nonce must fail');

    const tampered = accessToken.split('.');
    tampered[1] = encode({ iss: issuer, aud: 'solvex-api', sub: 'user-1', iat: now, exp: now + 300, tenant_id: 'victim-tenant', role: 'OWNER' });
    assert.equal((await auth.verifyOidcAccessToken(tampered.join('.'))).valid, false, 'tampered OIDC token must fail');
    const expired = makeJwt({ iss: issuer, aud: 'solvex-api', sub: 'user-1', iat: now - 600, exp: now - 1, tenant_id: 'tenant-1', role: 'CUSTOMER' }, privateKey);
    assert.equal((await auth.verifyOidcAccessToken(expired)).valid, false, 'expired OIDC token must fail');

    process.env.NODE_ENV = 'production';
    assert.throws(() => auth.createSignedToken('owner-1', 'tenant-1', 'owner@example.test', 'OWNER'), /disabled/i,
      'local token issuance must be prohibited in production');
    console.log('PASS: auth contract (local HMAC, tamper rejection, RS256 OIDC, nonce, issuer/audience/time, tenant claims, role least privilege, production issuance disabled).');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error('AUTH CONTRACT FAILED:', error?.message || error);
  process.exit(1);
});
