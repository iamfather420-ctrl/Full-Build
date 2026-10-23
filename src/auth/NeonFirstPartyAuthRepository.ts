import { Pool, type PoolClient } from '@neondatabase/serverless';
import type {
  AuthRateLimitResult,
  FirstPartyAccount,
  FirstPartyAuthRepository,
  FirstPartyRole,
  FirstPartySession,
} from './FirstPartyAuth';

type DbRow = Record<string, unknown>;

function asDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function accountFrom(row: DbRow): FirstPartyAccount {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    normalizedEmail: String(row.normalized_email),
    passwordHash: String(row.password_hash),
    role: String(row.role) as FirstPartyRole,
    emailVerifiedAt: asDate(row.email_verified_at),
    disabledAt: asDate(row.disabled_at),
    createdAt: asDate(row.created_at) ?? new Date(0),
  };
}

function sessionFrom(row: DbRow): FirstPartySession {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    tenantId: String(row.tenant_id),
    tokenHash: String(row.token_hash),
    createdAt: asDate(row.created_at) ?? new Date(0),
    expiresAt: asDate(row.expires_at) ?? new Date(0),
    revokedAt: asDate(row.revoked_at),
  };
}

async function inTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* retain the original failure */ }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * PostgreSQL implementation for migrations/005_daisy_first_party_auth.sql.
 * Construct only on the server with a least-privilege database credential.
 * This class does not apply migrations or grant roles.
 */
export class NeonFirstPartyAuthRepository implements FirstPartyAuthRepository {
  private constructor(private readonly pool: Pool) {}

  static fromEnvironment(): NeonFirstPartyAuthRepository {
    const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error('BLOCKED: Neon database URL is not configured.');
    const url = new URL(connectionString);
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
      throw new Error('BLOCKED: database URL must use PostgreSQL.');
    }
    return new NeonFirstPartyAuthRepository(new Pool({
      connectionString,
      max: Number(process.env.AUTH_DB_POOL_MAX || 5),
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    }));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async findAccountByEmail(normalizedEmail: string): Promise<FirstPartyAccount | null> {
    const result = await this.pool.query(
      'SELECT * FROM daisy_auth_accounts WHERE normalized_email = $1 LIMIT 1',
      [normalizedEmail],
    );
    return result.rows[0] ? accountFrom(result.rows[0] as DbRow) : null;
  }

  async findAccountById(id: string): Promise<FirstPartyAccount | null> {
    const result = await this.pool.query('SELECT * FROM daisy_auth_accounts WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] ? accountFrom(result.rows[0] as DbRow) : null;
  }

  async createUnverifiedAccount(input: {
    normalizedEmail: string;
    passwordHash: string;
    verificationTokenHash: string;
    verificationExpiresAt: Date;
    now: Date;
  }): Promise<{ account: FirstPartyAccount; created: boolean }> {
    return inTransaction(this.pool, async (client) => {
      // A duplicate address gets a stable, non-enumerating response. Do not create a tenant.
      const existing = await client.query(
        'SELECT * FROM daisy_auth_accounts WHERE normalized_email = $1 FOR UPDATE',
        [input.normalizedEmail],
      );
      if (existing.rows[0]) return { account: accountFrom(existing.rows[0] as DbRow), created: false };

      const tenantResult = await client.query(
        'INSERT INTO daisy_auth_tenants (display_name) VALUES ($1) RETURNING id',
        ['Personal workspace'],
      );
      const tenantId = String((tenantResult.rows[0] as DbRow).id);
      // The database unique index resolves concurrent registrations. A conflict aborts this
      // transaction; the caller should retry once and return the same generic response.
      const accountResult = await client.query(
        `INSERT INTO daisy_auth_accounts
          (tenant_id, normalized_email, password_hash, role, created_at, password_changed_at)
         VALUES ($1, $2, $3, 'CUSTOMER', $4, $4)
         ON CONFLICT (normalized_email) DO NOTHING
         RETURNING *`,
        [tenantId, input.normalizedEmail, input.passwordHash, input.now],
      );
      if (!accountResult.rows[0]) {
        await client.query('DELETE FROM daisy_auth_tenants WHERE id = $1', [tenantId]);
        const raced = await client.query('SELECT * FROM daisy_auth_accounts WHERE normalized_email = $1', [input.normalizedEmail]);
        if (!raced.rows[0]) throw new Error('Registration conflict could not be reconciled.');
        return { account: accountFrom(raced.rows[0] as DbRow), created: false };
      }
      const account = accountFrom(accountResult.rows[0] as DbRow);
      await client.query(
        `INSERT INTO daisy_auth_one_time_tokens (token_hash, account_id, purpose, created_at, expires_at)
         VALUES ($1, $2, 'VERIFY_EMAIL', $3, $4)`,
        [input.verificationTokenHash, account.id, input.now, input.verificationExpiresAt],
      );
      return { account, created: true };
    });
  }

  async consumeRateLimit(keyHash: string, now: Date): Promise<AuthRateLimitResult> {
    // Fixed 15-minute window; lock-free atomic UPSERT. Limit is 12 requests/window/key.
    const result = await this.pool.query(
      `INSERT INTO daisy_auth_rate_limits (key_hash, window_started_at, attempts, updated_at)
       VALUES ($1, $2, 1, $2)
       ON CONFLICT (key_hash) DO UPDATE SET
         window_started_at = CASE
           WHEN daisy_auth_rate_limits.window_started_at <= $2::timestamptz - interval '15 minutes' THEN $2
           ELSE daisy_auth_rate_limits.window_started_at END,
         attempts = CASE
           WHEN daisy_auth_rate_limits.window_started_at <= $2::timestamptz - interval '15 minutes' THEN 1
           ELSE daisy_auth_rate_limits.attempts + 1 END,
         blocked_until = CASE
           WHEN daisy_auth_rate_limits.window_started_at <= $2::timestamptz - interval '15 minutes' THEN NULL
           ELSE daisy_auth_rate_limits.blocked_until END,
         updated_at = $2
       RETURNING attempts, window_started_at, blocked_until`,
      [keyHash, now],
    );
    const row = result.rows[0] as DbRow;
    const windowStart = asDate(row.window_started_at) ?? now;
    const blockedUntil = asDate(row.blocked_until);
    const attempts = Number(row.attempts);
    const windowExpires = new Date(windowStart.getTime() + 15 * 60 * 1000);
    if (blockedUntil && blockedUntil > now) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000)) };
    }
    if (attempts > 12) {
      const until = new Date(Math.max(windowExpires.getTime(), now.getTime() + 15 * 60 * 1000));
      await this.pool.query('UPDATE daisy_auth_rate_limits SET blocked_until = $2 WHERE key_hash = $1', [keyHash, until]);
      return { allowed: false, retryAfterSeconds: Math.ceil((until.getTime() - now.getTime()) / 1000) };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  async createSession(input: {
    accountId: string; tenantId: string; tokenHash: string; createdAt: Date; expiresAt: Date;
  }): Promise<FirstPartySession> {
    const result = await this.pool.query(
      `INSERT INTO daisy_auth_sessions (account_id, tenant_id, token_hash, created_at, expires_at)
       SELECT a.id, a.tenant_id, $3, $4, $5 FROM daisy_auth_accounts a
       WHERE a.id = $1 AND a.tenant_id = $2 AND a.disabled_at IS NULL AND a.email_verified_at IS NOT NULL
       RETURNING *`,
      [input.accountId, input.tenantId, input.tokenHash, input.createdAt, input.expiresAt],
    );
    if (!result.rows[0]) throw new Error('BLOCKED: account is no longer eligible for a session.');
    return sessionFrom(result.rows[0] as DbRow);
  }

  async findSessionByTokenHash(tokenHash: string): Promise<FirstPartySession | null> {
    const result = await this.pool.query('SELECT * FROM daisy_auth_sessions WHERE token_hash = $1 LIMIT 1', [tokenHash]);
    return result.rows[0] ? sessionFrom(result.rows[0] as DbRow) : null;
  }

  async revokeSession(sessionId: string, revokedAt: Date): Promise<void> {
    await this.pool.query(
      'UPDATE daisy_auth_sessions SET revoked_at = $2 WHERE id = $1 AND revoked_at IS NULL',
      [sessionId, revokedAt],
    );
  }

  async revokeAllSessions(accountId: string, revokedAt: Date): Promise<void> {
    await this.pool.query(
      'UPDATE daisy_auth_sessions SET revoked_at = $2 WHERE account_id = $1 AND revoked_at IS NULL',
      [accountId, revokedAt],
    );
  }

  async consumeVerificationToken(tokenHash: string, now: Date): Promise<FirstPartyAccount | null> {
    return inTransaction(this.pool, async (client) => {
      const token = await client.query(
        `UPDATE daisy_auth_one_time_tokens SET consumed_at = $2
         WHERE token_hash = $1 AND purpose = 'VERIFY_EMAIL' AND consumed_at IS NULL AND expires_at > $2
         RETURNING account_id`,
        [tokenHash, now],
      );
      if (!token.rows[0]) return null;
      const accountId = String((token.rows[0] as DbRow).account_id);
      const result = await client.query(
        `UPDATE daisy_auth_accounts SET email_verified_at = COALESCE(email_verified_at, $2)
         WHERE id = $1 AND disabled_at IS NULL RETURNING *`,
        [accountId, now],
      );
      return result.rows[0] ? accountFrom(result.rows[0] as DbRow) : null;
    });
  }

  async consumePasswordResetToken(tokenHash: string, now: Date): Promise<FirstPartyAccount | null> {
    return inTransaction(this.pool, async (client) => {
      const token = await client.query(
        `UPDATE daisy_auth_one_time_tokens SET consumed_at = $2
         WHERE token_hash = $1 AND purpose = 'RESET_PASSWORD' AND consumed_at IS NULL AND expires_at > $2
         RETURNING account_id`,
        [tokenHash, now],
      );
      if (!token.rows[0]) return null;
      const accountId = String((token.rows[0] as DbRow).account_id);
      const result = await client.query('SELECT * FROM daisy_auth_accounts WHERE id = $1 FOR UPDATE', [accountId]);
      return result.rows[0] ? accountFrom(result.rows[0] as DbRow) : null;
    });
  }

  async replacePasswordAndRevokeSessions(accountId: string, passwordHash: string, changedAt: Date): Promise<void> {
    await inTransaction(this.pool, async (client) => {
      const update = await client.query(
        `UPDATE daisy_auth_accounts SET password_hash = $2, password_changed_at = $3
         WHERE id = $1 AND disabled_at IS NULL AND email_verified_at IS NOT NULL RETURNING id`,
        [accountId, passwordHash, changedAt],
      );
      if (!update.rows[0]) throw new Error('BLOCKED: account is not eligible for password change.');
      await client.query(
        'UPDATE daisy_auth_sessions SET revoked_at = $2 WHERE account_id = $1 AND revoked_at IS NULL',
        [accountId, changedAt],
      );
      await client.query(
        "UPDATE daisy_auth_one_time_tokens SET consumed_at = $2 WHERE account_id = $1 AND purpose = 'RESET_PASSWORD' AND consumed_at IS NULL",
        [accountId, changedAt],
      );
    });
  }

  async createPasswordResetToken(input: {
    accountId: string; tokenHash: string; expiresAt: Date; createdAt: Date;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO daisy_auth_one_time_tokens (token_hash, account_id, purpose, created_at, expires_at)
       SELECT $2, id, 'RESET_PASSWORD', $4, $3 FROM daisy_auth_accounts
       WHERE id = $1 AND disabled_at IS NULL AND email_verified_at IS NOT NULL`,
      [input.accountId, input.tokenHash, input.expiresAt, input.createdAt],
    );
  }
}
