import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { AuthIdentity } from '../src/auth/FirstPartyAuthService';
import { NeonInvitationAdministration } from '../src/auth/NeonInvitationAdministration';

type Row = Record<string, unknown>;
class FakeClient {
  queries: Array<{ sql: string; params: unknown[] }> = [];
  async query<T = Row>(sql: string, params: unknown[] = []): Promise<{ rows: T[]; rowCount: number }> {
    this.queries.push({ sql, params });
    if (sql.includes('SELECT session_user')) return { rows: [{ session_user: 'solvex_runtime_login_v2', current_role: 'solvex_app_runtime', bypass_rls: false } as T], rowCount: 1 };
    if (sql.includes('auth_create_invitation')) return { rows: [{ created: true } as T], rowCount: 1 };
    if (sql.includes('auth_revoke_invitation')) return { rows: [{ revoked: true } as T], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }
  release() {}
}
class FakePool {
  clients: FakeClient[] = [];
  async connect() { const c = new FakeClient(); this.clients.push(c); return c; }
}
const pool = new FakePool();
const admin = new NeonInvitationAdministration(pool, 'test-secret-with-at-least-32-characters');
const identity: AuthIdentity = { userId: 'owner-1', email: 'owner@example.test', tenantId: 'tenant-a', role: 'OWNER' };
const created = await admin.createInvitation(identity, 60 * 60 * 1000);
assert.equal(created.tenantId, 'tenant-a');
assert.ok(created.invitationToken.length >= 40);
const createQuery = pool.clients[0].queries.find(q => q.sql.includes('auth_create_invitation'))!;
assert.equal(createQuery.params[1], 'tenant-a');
assert.equal(createQuery.params[2], createHash('sha256').update(created.invitationToken).digest('hex'), 'only invitation hash is passed to persistence');
assert.equal(createQuery.params.includes(created.invitationToken), false, 'raw invitation token must not be persisted');
assert.ok(pool.clients[0].queries.some(q => q.sql.includes("set_config('app.auth_token', $1, true)")), 'database context token must be transaction-local');
assert.equal(await admin.revokeInvitation(identity, created.invitationId), true);
assert.ok(pool.clients[1].queries.some(q => q.sql.includes('SET LOCAL ROLE solvex_app_runtime')));

await assert.rejects(
  () => admin.createInvitation({ ...identity, role: 'CUSTOMER' }, 60_000),
  /OWNER\/ADMIN/,
  'non-admin identities must be rejected before touching the database',
);
await assert.rejects(() => admin.createInvitation(identity, 8 * 24 * 60 * 60 * 1000), /1 minute and 7 days/);

console.log('PASS: invitation administration validates caller role, uses transaction-local signed tenant context, persists only invitation hashes, and delegates authorization to database functions.');
console.log('LIMITATION: mocked database contract only; no live OWNER role, HMAC secret match, or staging authorization was verified.');
