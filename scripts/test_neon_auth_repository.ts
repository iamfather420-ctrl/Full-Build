import assert from 'node:assert/strict';
import { NeonAuthRateLimiter, NeonFirstPartyAuthRepository } from '../src/auth/NeonFirstPartyAuthRepository';

type Row = Record<string, unknown>;
class FakeClient {
  queries: Array<{ sql: string; params: unknown[] }> = [];
  released = false;
  async query<T = Row>(sql: string, params: unknown[] = []): Promise<{ rows: T[]; rowCount: number }> {
    this.queries.push({ sql, params });
    if (sql.includes('SELECT session_user')) return { rows: [{ session_user: 'solvex_runtime_login_v2', current_role: 'solvex_app_runtime', bypass_rls: false } as T], rowCount: 1 };
    if (sql.includes('auth_register_from_invitation')) {
      return { rows: [{ user_id: 'u-1', email: 'person@example.test', tenant_id: 't-1', role: 'CUSTOMER' } as T], rowCount: 1 };
    }
    if (sql.includes('auth_find_credential_by_email') || sql.includes('auth_find_credential_by_user')) {
      return { rows: [{ user_id: 'u-1', email: 'person@example.test', password_salt: 'a'.repeat(32), password_hash: 'b'.repeat(128), disabled: false } as T], rowCount: 1 };
    }
    if (sql.includes('auth_find_membership')) {
      return { rows: [{ tenant_id: 't-1', role: 'CUSTOMER', active: true } as T], rowCount: 1 };
    }
    if (sql.includes('auth_create_session')) return { rows: [{ created: true } as T], rowCount: 1 };
    if (sql.includes('auth_find_session')) {
      return { rows: [{ token_hash: 'c'.repeat(64), user_id: 'u-1', tenant_id: 't-1', created_at: 1000, expires_at: 2000, revoked_at: null } as T], rowCount: 1 };
    }
    if (sql.includes('auth_revoke_session')) return { rows: [{ revoked: true } as T], rowCount: 1 };
    if (sql.includes('auth_rate_limit_allow')) return { rows: [{ value: true } as T], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }
  release() { this.released = true; }
}
class FakePool {
  clients: FakeClient[] = [];
  async connect() { const client = new FakeClient(); this.clients.push(client); return client; }
}

const pool = new FakePool();
const repository = new NeonFirstPartyAuthRepository(pool);
const identity = await repository.registerFromInvitation('d'.repeat(64), {
  email: 'person@example.test', passwordSalt: 'a'.repeat(32), passwordHash: 'b'.repeat(128), now: 1000,
});
assert.deepEqual(identity, { userId: 'u-1', email: 'person@example.test', tenantId: 't-1', role: 'CUSTOMER' });
assert.ok(pool.clients[0].queries.some(q => q.sql === 'SET LOCAL ROLE solvex_app_runtime'));
assert.equal(pool.clients[0].queries[0].sql, 'BEGIN');
assert.equal(pool.clients[0].queries.at(-1)?.sql, 'COMMIT');
assert.equal(pool.clients[0].released, true);

const credential = await repository.findCredentialByEmailAndTenant('person@example.test', 't-1');
assert.equal(credential?.userId, 'u-1');
const lookup = pool.clients[1].queries.find(q => q.sql.includes('auth_find_credential_by_email'))!;
assert.deepEqual(lookup.params, ['person@example.test', 't-1'], 'tenant is a bound SQL parameter, never interpolated');

const membership = await repository.findMembership('u-1', 't-1');
assert.deepEqual(membership, { tenantId: 't-1', role: 'CUSTOMER', active: true });
await repository.createSession({ tokenHash: 'c'.repeat(64), userId: 'u-1', tenantId: 't-1', createdAt: 1000, expiresAt: 2000, revokedAt: null });
assert.equal((await repository.findSession('c'.repeat(64)))?.tenantId, 't-1');
assert.equal(await repository.revokeSession('c'.repeat(64), 1100), true);

const limiter = new NeonAuthRateLimiter(pool);
assert.equal(await limiter.allow('e'.repeat(64), 1000), true);
assert.ok(pool.clients.at(-1)?.queries.some(q => q.sql.includes('SET LOCAL ROLE solvex_app_runtime')));

const brokenPool = {
  async connect() {
    return {
      async query<T = Row>(sql: string): Promise<{ rows: T[]; rowCount: number }> {
        if (sql === 'COMMIT') throw new Error('commit failed');
        if (sql.includes('SELECT session_user')) return { rows: [{ session_user: 'solvex_runtime_login_v2', current_role: 'solvex_app_runtime', bypass_rls: false } as T], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      },
      release() {},
    };
  },
};
const brokenRepository = new NeonFirstPartyAuthRepository(brokenPool);
await assert.rejects(() => brokenRepository.findSession('f'.repeat(64)), /commit failed/, 'database transaction failures must propagate rather than simulate success');

const wrongRolePool = {
  async connect() {
    return {
      async query<T = Row>(sql: string): Promise<{ rows: T[]; rowCount: number }> {
        if (sql.includes('SELECT session_user')) return { rows: [{ session_user: 'solvex_runtime_login', current_role: 'solvex_app_runtime', bypass_rls: false } as T], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      },
      release() {},
    };
  },
};
const wrongRoleRepository = new NeonFirstPartyAuthRepository(wrongRolePool);
await assert.rejects(() => wrongRoleRepository.findSession('f'.repeat(64)), /BYPASSRLS=false/, 'legacy privileged login identity must be rejected');

console.log('PASS: Neon auth adapter uses transactions, explicit least-privilege role, bound tenant parameters, typed function results, and fail-closed error propagation.');
console.log('LIMITATION: this is a mocked adapter contract test, not a live Neon integration or RLS-isolation test.');
