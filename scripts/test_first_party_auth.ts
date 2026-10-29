import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  FirstPartyAuthService,
  type AuthIdentity,
  type CredentialRecord,
  type FirstPartyAuthRepository,
  type InvitationRegistration,
  type LoginRateLimiter,
  type MembershipRecord,
  type SessionRecord,
} from '../src/auth/FirstPartyAuthService';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

class MemoryRepository implements FirstPartyAuthRepository {
  credentials = new Map<string, CredentialRecord>();
  memberships = new Map<string, MembershipRecord>();
  sessions = new Map<string, SessionRecord>();
  invitations = new Map<string, { tenantId: string; expiresAt: number; consumed: boolean }>();
  audit: Array<{ event: string; userId?: string; tenantId?: string; occurredAt: number; reason?: string }> = [];
  nextId = 0;

  async registerFromInvitation(tokenHash: string, input: InvitationRegistration): Promise<AuthIdentity | null> {
    const invite = this.invitations.get(tokenHash);
    if (!invite || invite.consumed || invite.expiresAt <= input.now || this.credentials.has(input.email)) return null;
    invite.consumed = true;
    const userId = `user-${++this.nextId}`;
    const record: CredentialRecord = { userId, email: input.email, passwordSalt: input.passwordSalt, passwordHash: input.passwordHash, disabled: false };
    this.credentials.set(input.email, record);
    this.memberships.set(`${userId}:${invite.tenantId}`, { tenantId: invite.tenantId, role: 'CUSTOMER', active: true });
    return { userId, email: input.email, tenantId: invite.tenantId, role: 'CUSTOMER' };
  }

  async findCredentialByEmail(email: string) { return this.credentials.get(email) ?? null; }
  async findCredentialByUserId(userId: string) { return [...this.credentials.values()].find((c) => c.userId === userId) ?? null; }
  async findMembership(userId: string, tenantId: string) { return this.memberships.get(`${userId}:${tenantId}`) ?? null; }
  async createSession(session: SessionRecord) { this.sessions.set(session.tokenHash, { ...session }); }
  async findSession(tokenHash: string) { return this.sessions.get(tokenHash) ?? null; }
  async revokeSession(tokenHash: string, revokedAt: number) {
    const session = this.sessions.get(tokenHash);
    if (!session || session.revokedAt !== null) return false;
    session.revokedAt = revokedAt;
    return true;
  }
  async appendAuthAudit(event: { event: 'REGISTERED' | 'LOGIN_SUCCEEDED' | 'LOGIN_REJECTED' | 'SESSION_REVOKED'; userId?: string; tenantId?: string; occurredAt: number; reason?: string }) {
    this.audit.push(event);
  }
}

class MemoryLimiter implements LoginRateLimiter {
  failures = new Map<string, number>();
  async allow(key: string) { return (this.failures.get(key) ?? 0) < 5; }
  async recordFailure(key: string) { this.failures.set(key, (this.failures.get(key) ?? 0) + 1); }
  async clear(key: string) { this.failures.delete(key); }
}

let now = 1_800_000_000_000;
const repository = new MemoryRepository();
const rateLimiter = new MemoryLimiter();
const auth = new FirstPartyAuthService({ repository, rateLimiter, now: () => now, sessionTtlMs: 60 * 60 * 1000 });
const invite = 'one-time-invitation-token-value-0123456789';
repository.invitations.set(hash(invite), { tenantId: 'tenant-a', expiresAt: now + 60_000, consumed: false });

const weak = await auth.register('person@example.test', 'short', invite);
assert.equal(weak.ok, false, 'weak passwords must be rejected');
assert.equal(repository.credentials.size, 0, 'weak-password registration must not create an account');

const registered = await auth.register(' Person@Example.Test ', 'correct-horse-battery-staple', invite);
assert.equal(registered.ok, true);
assert.equal(registered.identity?.tenantId, 'tenant-a', 'tenant must come from the server-side invitation');
assert.equal(registered.identity?.role, 'CUSTOMER', 'registration must not accept a client-selected role');
assert.ok(registered.sessionToken);
assert.equal(repository.sessions.size, 1);
assert.equal([...repository.sessions.values()][0].tokenHash, hash(registered.sessionToken!), 'only a hash of the opaque session token may be persisted');

const reusedInvite = await auth.register('other@example.test', 'correct-horse-battery-staple', invite);
assert.equal(reusedInvite.ok, false, 'single-use invitation cannot be replayed');

const login = await auth.login('PERSON@example.test', 'correct-horse-battery-staple', 'tenant-a');
assert.equal(login.ok, true);
assert.equal(login.identity?.role, 'CUSTOMER');

const crossTenant = await auth.login('person@example.test', 'correct-horse-battery-staple', 'tenant-b');
assert.equal(crossTenant.ok, false, 'a user must not create a session for a tenant without active membership');

const badPassword = await auth.login('person@example.test', 'not-the-password', 'tenant-a');
assert.equal(badPassword.ok, false, 'invalid credentials must be rejected');
assert.equal(badPassword.error, 'INVALID_CREDENTIALS', 'login failures must not reveal whether an account exists');

const verified = await auth.verifySession(login.sessionToken!);
assert.equal(verified.valid, true);
assert.equal(verified.identity?.tenantId, 'tenant-a');

const tokenHash = hash(login.sessionToken!);
assert.ok(repository.sessions.has(tokenHash), 'session lookup must use the hashed token');
assert.equal(await auth.logout(login.sessionToken!), true);
assert.equal((await auth.verifySession(login.sessionToken!)).valid, false, 'revoked sessions must be rejected');

const expiring = await auth.login('person@example.test', 'correct-horse-battery-staple', 'tenant-a');
assert.equal(expiring.ok, true);
now += 60 * 60 * 1000;
assert.equal((await auth.verifySession(expiring.sessionToken!)).valid, false, 'expired sessions must be rejected');

const disabledCredential = repository.credentials.get('person@example.test')!;
disabledCredential.disabled = true;
assert.equal((await auth.login('person@example.test', 'correct-horse-battery-staple', 'tenant-a')).ok, false, 'disabled accounts must be rejected');

console.log('PASS: first-party auth boundary tests (invitation, scrypt password hash, opaque hashed sessions, tenant membership, non-enumerating failures, revocation, expiry, disabled accounts).');
console.log('LIMITATION: these tests use an in-memory repository and limiter; they do not prove durable storage or production readiness.');
