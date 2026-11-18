import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import type { FirstPartyAuthService } from '../src/auth/FirstPartyAuthService';
import { createFirstPartyAuthRouter } from '../src/auth/FirstPartyAuthRouter';

const token = 'A'.repeat(43);
const identity = { userId: 'u-1', email: 'person@example.test', tenantId: 't-1', role: 'CUSTOMER' as const };
let revoked = false;
const service = {
  async register() { return { ok: true, identity, sessionToken: token, expiresAt: Date.now() + 60_000 }; },
  async login() { return { ok: true, identity, sessionToken: token, expiresAt: Date.now() + 60_000 }; },
  async verifySession(value: string) { return value === token && !revoked ? { valid: true, identity } : { valid: false }; },
  async logout(value: string) { if (value === token) { revoked = true; return true; } return false; },
} as unknown as FirstPartyAuthService;

async function withServer(router: ReturnType<typeof createFirstPartyAuthRouter>, fn: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json({ limit: '4kb' }));
  app.use('/api/auth', router);
  const server: Server = app.listen(0);
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind a TCP port.');
    await fn(`http://127.0.0.1:${address.port}/api/auth`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

const router = createFirstPartyAuthRouter({ service, allowedOrigins: ['https://uarefake.space'], enabled: true });
await withServer(router, async base => {
  const rejected = await fetch(`${base}/login`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' },
    body: JSON.stringify({ email: identity.email, password: 'correct-horse-battery-staple', tenantId: identity.tenantId }),
  });
  assert.equal(rejected.status, 403, 'cross-origin login attempts must be rejected');

  const login = await fetch(`${base}/login`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://uarefake.space', 'sec-fetch-site': 'same-origin' },
    body: JSON.stringify({ email: identity.email, password: 'correct-horse-battery-staple', tenantId: identity.tenantId }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie') || '';
  assert.match(cookie, /__Host-solvex_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\//);
  const body = await login.json() as Record<string, unknown>;
  assert.equal(body.ok, true);
  assert.equal('sessionToken' in body, false, 'opaque session token must never be returned in JSON');

  const session = await fetch(`${base}/session`, { headers: { cookie: `__Host-solvex_session=${token}` } });
  assert.equal(session.status, 200);
  assert.equal((await session.json() as { identity: { tenantId: string } }).identity.tenantId, 't-1');

  const logout = await fetch(`${base}/logout`, {
    method: 'POST', headers: { origin: 'https://uarefake.space', 'sec-fetch-site': 'same-origin', cookie: `__Host-solvex_session=${token}` },
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie') || '', /Max-Age=0/);
  assert.equal((await fetch(`${base}/session`, { headers: { cookie: `__Host-solvex_session=${token}` } })).status, 401);
});

const disabled = createFirstPartyAuthRouter({ service, allowedOrigins: ['https://uarefake.space'], enabled: false });
await withServer(disabled, async base => {
  const response = await fetch(`${base}/session`);
  assert.equal(response.status, 503, 'router must fail closed unless explicitly enabled');
});

console.log('PASS: auth router rejects untrusted origins, uses Secure HttpOnly SameSite cookies, omits tokens from JSON, revokes sessions on logout, and fails closed unless explicitly enabled.');
console.log('LIMITATION: service is mocked; these tests do not prove live database, browser CSRF, or deployment configuration.');
