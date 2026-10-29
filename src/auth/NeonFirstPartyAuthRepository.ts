import { Pool } from '@neondatabase/serverless';
import type {
  AuthIdentity,
  CredentialRecord,
  FirstPartyAuthRepository,
  FirstPartyRole,
  InvitationRegistration,
  LoginRateLimiter,
  MembershipRecord,
  SessionRecord,
} from './FirstPartyAuthService';

interface QueryResult<Row> { rows: Row[]; rowCount?: number | null }
interface Queryable {
  query<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<Row>>;
}
interface PoolClientLike extends Queryable { release(): void }
interface PoolLike { connect(): Promise<PoolClientLike> }

interface DbIdentity { user_id: string; email: string; tenant_id: string; role: string }
interface DbCredential { user_id: string; email: string; password_salt: string; password_hash: string; disabled: boolean }
interface DbMembership { tenant_id: string; role: string; active: boolean }
interface DbSession { token_hash: string; user_id: string; tenant_id: string; created_at: string | number; expires_at: string | number; revoked_at: string | number | null }

const ROLES = new Set<FirstPartyRole>(['OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER']);

function roleFromDb(role: string): FirstPartyRole | null {
  return ROLES.has(role as FirstPartyRole) ? role as FirstPartyRole : null;
}

function asCredential(row: DbCredential): CredentialRecord {
  return {
    userId: row.user_id,
    email: row.email,
    passwordSalt: row.password_salt,
    passwordHash: row.password_hash,
    disabled: row.disabled,
  };
}

function asSession(row: DbSession): SessionRecord {
  return {
    tokenHash: row.token_hash,
    userId: row.user_id,
    tenantId: row.tenant_id,
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
    revokedAt: row.revoked_at === null ? null : Number(row.revoked_at),
  };
}

/**
 * Durable adapter for the reviewed additive migration at
 * db/migrations/20261029_first_party_auth.sql.
 *
 * All operations use a transaction and explicitly SET LOCAL ROLE to the least-privilege
 * application role. Authentication data is only accessed through narrowly granted
 * SECURITY DEFINER routines. This adapter MUST remain unused until the migration is
 * staged, reviewed, applied, and its function ownership/role grants are verified.
 */
export class NeonFirstPartyAuthRepository implements FirstPartyAuthRepository {
  constructor(private readonly pool: PoolLike) {}

  static fromEnvironment(): NeonFirstPartyAuthRepository {
    const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error('BLOCKED: NEON_DATABASE_URL or DATABASE_URL is required.');
    // The caller must use a connection identity permitted to SET ROLE solvex_app_runtime.
    return new NeonFirstPartyAuthRepository(new Pool({ connectionString }) as unknown as PoolLike);
  }

  private async withRuntimeRole<T>(work: (client: Queryable) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let began = false;
    try {
      await client.query('BEGIN');
      began = true;
      await client.query('SET LOCAL ROLE solvex_app_runtime');
      const result = await work(client);
      await client.query('COMMIT');
      began = false;
      return result;
    } catch (error) {
      if (began) {
        try { await client.query('ROLLBACK'); } catch { /* preserve the original failure */ }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async registerFromInvitation(invitationTokenHash: string, input: InvitationRegistration): Promise<AuthIdentity | null> {
    return this.withRuntimeRole(async (db) => {
      const result = await db.query<DbIdentity>(
        'SELECT user_id, email, tenant_id, role FROM solvex_private.auth_register_from_invitation($1,$2,$3,$4,$5)',
        [invitationTokenHash, input.email, input.passwordSalt, input.passwordHash, input.now],
      );
      const row = result.rows[0];
      if (!row) return null;
      const role = roleFromDb(row.role);
      if (!role || role !== 'CUSTOMER') return null;
      return { userId: row.user_id, email: row.email, tenantId: row.tenant_id, role };
    });
  }

  async findCredentialByEmailAndTenant(normalizedEmail: string, tenantId: string): Promise<CredentialRecord | null> {
    return this.withRuntimeRole(async (db) => {
      const result = await db.query<DbCredential>(
        'SELECT user_id, email, password_salt, password_hash, disabled FROM solvex_private.auth_find_credential_by_email($1,$2)',
        [normalizedEmail, tenantId],
      );
      return result.rows[0] ? asCredential(result.rows[0]) : null;
    });
  }

  async findCredentialByUserIdAndTenant(userId: string, tenantId: string): Promise<CredentialRecord | null> {
    return this.withRuntimeRole(async (db) => {
      const result = await db.query<DbCredential>(
        'SELECT user_id, email, password_salt, password_hash, disabled FROM solvex_private.auth_find_credential_by_user($1,$2)',
        [userId, tenantId],
      );
      return result.rows[0] ? asCredential(result.rows[0]) : null;
    });
  }

  async findMembership(userId: string, tenantId: string): Promise<MembershipRecord | null> {
    return this.withRuntimeRole(async (db) => {
      const result = await db.query<DbMembership>(
        'SELECT tenant_id, role, active FROM solvex_private.auth_find_membership($1,$2)',
        [userId, tenantId],
      );
      const row = result.rows[0];
      if (!row) return null;
      const role = roleFromDb(row.role);
      if (!role) return null;
      return { tenantId: row.tenant_id, role, active: row.active };
    });
  }

  async createSession(session: SessionRecord): Promise<void> {
    await this.withRuntimeRole(async (db) => {
      const result = await db.query<{ created: boolean }>(
        'SELECT solvex_private.auth_create_session($1,$2,$3,$4,$5) AS created',
        [session.tokenHash, session.userId, session.tenantId, session.createdAt, session.expiresAt],
      );
      if (result.rows[0]?.created !== true) throw new Error('BLOCKED: session persistence rejected by database invariants.');
    });
  }

  async findSession(tokenHash: string): Promise<SessionRecord | null> {
    return this.withRuntimeRole(async (db) => {
      const result = await db.query<DbSession>(
        'SELECT token_hash, user_id, tenant_id, created_at, expires_at, revoked_at FROM solvex_private.auth_find_session($1)',
        [tokenHash],
      );
      return result.rows[0] ? asSession(result.rows[0]) : null;
    });
  }

  async revokeSession(tokenHash: string, revokedAt: number): Promise<boolean> {
    return this.withRuntimeRole(async (db) => {
      const result = await db.query<{ revoked: boolean }>(
        'SELECT solvex_private.auth_revoke_session($1,$2) AS revoked',
        [tokenHash, revokedAt],
      );
      return result.rows[0]?.revoked === true;
    });
  }

  async appendAuthAudit(event: {
    event: 'REGISTERED' | 'LOGIN_SUCCEEDED' | 'LOGIN_REJECTED' | 'REGISTRATION_REJECTED' | 'SESSION_REVOKED';
    userId?: string;
    tenantId?: string;
    occurredAt: number;
    reason?: string;
  }): Promise<void> {
    await this.withRuntimeRole(async (db) => {
      await db.query(
        'SELECT solvex_private.auth_append_audit($1,$2,$3,$4,$5)',
        [event.event, event.userId ?? null, event.tenantId ?? null, event.occurredAt, event.reason ?? null],
      );
    });
  }
}

/** Shared, database-backed rate limiting. No process-local fallback is permitted. */
export class NeonAuthRateLimiter implements LoginRateLimiter {
  constructor(private readonly pool: PoolLike) {}

  static fromEnvironment(): NeonAuthRateLimiter {
    const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error('BLOCKED: NEON_DATABASE_URL or DATABASE_URL is required.');
    return new NeonAuthRateLimiter(new Pool({ connectionString }) as unknown as PoolLike);
  }

  private async call<T>(sql: string, params: unknown[]): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE solvex_app_runtime');
      const result = await client.query<{ value: T }>(sql, params);
      await client.query('COMMIT');
      return result.rows[0]?.value as T;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original failure */ }
      throw error;
    } finally {
      client.release();
    }
  }

  async allow(key: string, now: number): Promise<boolean> {
    return this.call<boolean>('SELECT solvex_private.auth_rate_limit_allow($1,$2) AS value', [key, now]);
  }

  async recordFailure(key: string, now: number): Promise<void> {
    await this.call<void>('SELECT solvex_private.auth_rate_limit_failure($1,$2) AS value', [key, now]);
  }

  async clear(key: string): Promise<void> {
    await this.call<void>('SELECT solvex_private.auth_rate_limit_clear($1) AS value', [key]);
  }
}
