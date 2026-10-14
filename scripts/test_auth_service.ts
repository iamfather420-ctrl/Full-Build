import assert from 'node:assert/strict';
import { computeSha256 } from '../src/database/DatabaseSchema';

const secret = 'test-only-solvex-auth-secret-with-sufficient-length';
process.env.SOLVEX_AUTH_SECRET = secret;
delete process.env.NODE_ENV;

const { AuthService } = await import('../src/auth/AuthService');
const auth = AuthService.getInstance();
const validToken = auth.createSignedToken('user-a', 'tenant-a', 'user-a@example.test', 'CUSTOMER');
const valid = auth.verifyToken(validToken);
assert.equal(valid.valid, true, 'fresh correctly signed token must verify');
assert.equal(valid.user?.tenant_id, 'tenant-a');
assert.equal(auth.verifyToken(`${validToken}tampered`).valid, false, 'tampered token must fail');
assert.equal(auth.verifyToken('not-a-token').valid, false, 'malformed token must fail');

function tokenFor(payload: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  return `${b64}.${computeSha256(`${b64}:${secret}`)}`;
}
const now = Date.now();
const baseClaims = {
  user_id: 'user-a',
  tenant_id: 'tenant-a',
  email: 'user-a@example.test',
  role: 'CUSTOMER',
  issued_at: now - 60_000,
  expires_at: now - 1
};
assert.equal(auth.verifyToken(tokenFor(baseClaims)).valid, false, 'expired token must fail');
assert.equal(auth.verifyToken(tokenFor({ ...baseClaims, expires_at: now + 60_000 })).valid, true, 'valid bounded token must pass');
assert.equal(auth.verifyToken(tokenFor({ ...baseClaims, expires_at: now + 16 * 60_000 })).valid, false, 'overlong token must fail');
assert.equal(auth.verifyToken(tokenFor({ ...baseClaims, issued_at: now + 60_000, expires_at: now + 120_000 })).valid, false, 'future-issued token must fail');
assert.equal(auth.verifyToken(tokenFor({ ...baseClaims, role: 'SUPERUSER', expires_at: now + 60_000 })).valid, false, 'unknown role must fail');

console.log('PASS: signed token integrity, expiry, lifetime cap, issue-time skew, and role validation.');
