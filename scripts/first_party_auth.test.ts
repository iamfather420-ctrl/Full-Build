import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FirstPartyAuth,
  type AuthRateLimitResult,
  type FirstPartyAccount,
  type FirstPartyAuthRepository,
  type FirstPartyRole,
  type FirstPartySession,
} from '../src/auth/FirstPartyAuth';

class TestRepository implements FirstPartyAuthRepository {
  accounts: FirstPartyAccount[] = [];
  sessions: FirstPartySession[] = [];
  tokens = new Map<string, { accountId: string; purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD'; expiresAt: Date; consumed: boolean }>();
  async findAccountByEmail(email: string) { return this.accounts.find(a => a.normalizedEmail === email) ?? null; }
  async findAccountById(id: string) { return this.accounts.find(a => a.id === id) ?? null; }
  async createUnverifiedAccount(input: { normalizedEmail: string; passwordHash: string; verificationTokenHash: string; verificationExpiresAt: Date; now: Date }) {
    const found = this.accounts.find(a => a.normalizedEmail === input.normalizedEmail);
    if (found) return { account: found, created: false };
    const account: FirstPartyAccount = {
      id: `acct-${this.accounts.length + 1}`, tenantId: `tenant-${this.accounts.length + 1}`,
      normalizedEmail: input.normalizedEmail, passwordHash: input.passwordHash, role: 'CUSTOMER',
      emailVerifiedAt: null, disabledAt: null, createdAt: input.now,
    };
    this.accounts.push(account);
    this.tokens.set(input.verificationTokenHash, { accountId: account.id, purpose: 'VERIFY_EMAIL', expiresAt: input.verificationExpiresAt, consumed: false });
    return { account, created: true };
  }
  async replaceVerificationToken(accountId: string, tokenHash: string, expiresAt: Date, now: Date) {
    const account = this.accounts.find(a => a.id === accountId && !a.emailVerifiedAt && !a.disabledAt);
    if (!account) return false;
    for (const token of this.tokens.values()) {
      if (token.accountId === accountId && token.purpose === 'VERIFY_EMAIL' && !token.consumed) token.consumed = true;
    }
    this.tokens.set(tokenHash, { accountId, purpose: 'VERIFY_EMAIL', expiresAt, consumed: false });
    return true;
  }
  async consumeRateLimit(_keyHash: string, _now: Date): Promise<AuthRateLimitResult> { return { allowed: true, retryAfterSeconds: 0 }; }
  async createSession(input: { accountId: string; tenantId: string; tokenHash: string; createdAt: Date; expiresAt: Date }) {
    const session: FirstPartySession = { id: `session-${this.sessions.length + 1}`, ...input, revokedAt: null };
    this.sessions.push(session); return session;
  }
  async findSessionByTokenHash(hash: string) { return this.sessions.find(s => s.tokenHash === hash) ?? null; }
  async revokeSession(id: string, at: Date) { const s = this.sessions.find(x => x.id === id); if (s) s.revokedAt = at; }
  async revokeAllSessions(id: string, at: Date) { this.sessions.filter(s => s.accountId === id && !s.revokedAt).forEach(s => { s.revokedAt = at; }); }
  async consumeVerificationToken(hash: string, now: Date) {
    const t = this.tokens.get(hash);
    if (!t || t.purpose !== 'VERIFY_EMAIL' || t.consumed || t.expiresAt <= now) return null;
    t.consumed = true;
    const a = this.accounts.find(x => x.id === t.accountId);
    if (a && !a.disabledAt) a.emailVerifiedAt = now;
    return a ?? null;
  }
  async consumePasswordResetToken(hash: string, now: Date) {
    const t = this.tokens.get(hash);
    if (!t || t.purpose !== 'RESET_PASSWORD' || t.consumed || t.expiresAt <= now) return null;
    t.consumed = true; return this.accounts.find(a => a.id === t.accountId) ?? null;
  }
  async replacePasswordAndRevokeSessions(id: string, hash: string, at: Date) {
    const a = this.accounts.find(x => x.id === id);
    if (!a) throw new Error('missing account');
    a.passwordHash = hash; this.sessions.filter(s => s.accountId === id && !s.revokedAt).forEach(s => { s.revokedAt = at; });
  }
  async createPasswordResetToken(input: { accountId: string; tokenHash: string; expiresAt: Date; createdAt: Date }) {
    this.tokens.set(input.tokenHash, { accountId: input.accountId, purpose: 'RESET_PASSWORD', expiresAt: input.expiresAt, consumed: false });
  }
}

const pepper = 'test-only-rate-limit-pepper-0123456789abcdef';
test('registration, email verification, login, logout and password reset lifecycle', async () => {
  const repo = new TestRepository();
  const verificationLinks: string[] = [];
  const resetLinks: string[] = [];
  const auth = new FirstPartyAuth({
    repository: repo, rateLimitPepper: pepper, publicOrigin: 'https://uarefake.space',
    sendVerificationEmail: async (_email, url) => { verificationLinks.push(url); },
    sendPasswordResetEmail: async (_email, url) => { resetLinks.push(url); },
  });

  assert.deepEqual(await auth.register('Person@Example.com', 'correct-horse-battery-1'), { accepted: true });
  assert.equal(repo.accounts.length, 1);
  assert.equal(repo.accounts[0].normalizedEmail, 'person@example.com');
  assert.match(repo.accounts[0].passwordHash, /^scrypt\$32768\$8\$1\$/);
  assert.equal(repo.accounts[0].role, 'CUSTOMER');
  assert.equal(verificationLinks.length, 1);
  assert.equal(await auth.authenticateSession('not-a-real-session-token'), null);

  const verificationToken = new URL(verificationLinks[0]).searchParams.get('token')!;
  const verified = await auth.verifyEmail(verificationToken);
  assert.equal(verified.emailVerified, true);
  await assert.rejects(() => auth.verifyEmail(verificationToken), /invalid or expired/i);

  const login = await auth.login('person@example.com', 'correct-horse-battery-1', 'test-source-identifier');
  assert.equal(login.account.emailVerified, true);
  assert.ok(login.session.cookieValue.length >= 40);
  assert.equal(JSON.stringify(login).includes(repo.sessions[0].tokenHash), false);
  assert.equal((await auth.authenticateSession(login.session.cookieValue))?.id, verified.id);

  await assert.rejects(() => auth.login('person@example.com', 'wrong-password-123', 'test-source-identifier'), /incorrect/i);
  await auth.requestPasswordReset('person@example.com');
  assert.equal(resetLinks.length, 1);
  const resetToken = new URL(resetLinks[0]).searchParams.get('token')!;
  await auth.resetPassword(resetToken, 'a-new-strong-password-456');
  assert.equal(await auth.authenticateSession(login.session.cookieValue), null);
  await assert.rejects(() => auth.resetPassword(resetToken, 'another-new-password-789'), /invalid or expired/i);
  const nextLogin = await auth.login('person@example.com', 'a-new-strong-password-456', 'test-source-identifier');
  await auth.logout(nextLogin.session.cookieValue);
  assert.equal(await auth.authenticateSession(nextLogin.session.cookieValue), null);
});

test('rejects weak passwords and non-HTTPS production origins', async () => {
  const repo = new TestRepository();
  const config = {
    repository: repo, rateLimitPepper: pepper, publicOrigin: 'https://uarefake.space',
    sendVerificationEmail: async () => {}, sendPasswordResetEmail: async () => {},
  };
  const auth = new FirstPartyAuth(config);
  await assert.rejects(() => auth.register('valid@example.com', 'short'), /at least 12 characters/i);
  assert.throws(() => new FirstPartyAuth({ ...config, publicOrigin: 'http://uarefake.space' }), /HTTPS/i);
});
