import { createHash, randomBytes } from 'node:crypto';
import { Pool } from '@neondatabase/serverless';
import type { AuthIdentity } from './FirstPartyAuthService';
import { createTenantContextToken } from './TenantContextToken';

interface QueryResult<Row> { rows: Row[]; rowCount?: number | null }
interface Queryable {
  query<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<Row>>;
}
interface Client extends Queryable { release(): void }
interface PoolLike { connect(): Promise<Client> }

export interface CreatedInvitation {
  invitationId: string;
  invitationToken: string;
  tenantId: string;
  expiresAt: number;
}

/**
 * Trusted, server-side invitation administration. Callers must supply an identity obtained
 * from a verified server-side session, never from request JSON. Database functions also
 * validate the signed tenant context and active OWNER/ADMIN membership.
 *
 * This class is not mounted to an HTTP route. It fails closed if SOVEREIGN_AUTH_SECRET does
 * not match the database verifier secret or the database role chain is misconfigured.
 */
export class NeonInvitationAdministration {
  constructor(private readonly pool: PoolLike, private readonly contextSecret: string) {
    if (contextSecret.length < 32) throw new Error('BLOCKED: SOVEREIGN_AUTH_SECRET is unavailable or too short.');
  }

  static fromEnvironment(): NeonInvitationAdministration {
    const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    const secret = process.env.SOVEREIGN_AUTH_SECRET;
    if (!connectionString || !secret || secret.length < 32) {
      throw new Error('BLOCKED: database connection and SOVEREIGN_AUTH_SECRET must be explicitly configured.');
    }
    return new NeonInvitationAdministration(new Pool({ connectionString }) as unknown as PoolLike, secret);
  }

  private async withAdminContext<T>(identity: AuthIdentity, work: (db: Queryable) => Promise<T>): Promise<T> {
    if (!identity.userId || !identity.tenantId || !identity.email || !['OWNER', 'ADMIN'].includes(identity.role)) {
      throw new Error('BLOCKED: a verified tenant OWNER/ADMIN identity is required.');
    }
    const now = Date.now();
    const token = createTenantContextToken(identity, this.contextSecret, now);
    const client = await this.pool.connect();
    let began = false;
    try {
      await client.query('BEGIN');
      began = true;
      await client.query('SET LOCAL ROLE solvex_app_runtime');
      const roles = await client.query<{ session_user: string; current_role: string; bypass_rls: boolean }>(`
        SELECT session_user,
               current_user AS current_role,
               COALESCE((SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user), false) AS bypass_rls
      `);
      const role = roles.rows[0];
      if (role?.session_user !== 'solvex_runtime_login_v2' ||
          role.current_role !== 'solvex_app_runtime' ||
          role.bypass_rls !== false) {
        throw new Error('BLOCKED: database role chain is not least privilege.');
      }
      await client.query("SELECT set_config('app.auth_token', $1, true)", [token]);
      const result = await work(client);
      await client.query('COMMIT');
      began = false;
      return result;
    } catch (error) {
      if (began) {
        try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async createInvitation(identity: AuthIdentity, ttlMs = 24 * 60 * 60 * 1000): Promise<CreatedInvitation> {
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 60_000 || ttlMs > 7 * 24 * 60 * 60 * 1000) {
      throw new Error('Invitation lifetime must be between 1 minute and 7 days.');
    }
    const now = Date.now();
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
    const invitationId = randomBytes(18).toString('base64url');
    const expiresAt = now + ttlMs;
    const created = await this.withAdminContext(identity, async (db) => {
      const result = await db.query<{ created: boolean }>(
        'SELECT solvex_private.auth_create_invitation($1,$2,$3,$4,$5) AS created',
        [invitationId, identity.tenantId, tokenHash, now, expiresAt],
      );
      return result.rows[0]?.created === true;
    });
    if (!created) throw new Error('BLOCKED: database did not authorize invitation issuance.');
    // Raw token is returned only once to the trusted caller; only the hash is persisted.
    return { invitationId, invitationToken: token, tenantId: identity.tenantId, expiresAt };
  }

  async revokeInvitation(identity: AuthIdentity, invitationId: string): Promise<boolean> {
    if (!invitationId || invitationId.length > 200) throw new Error('Invalid invitation ID.');
    const now = Date.now();
    return this.withAdminContext(identity, async (db) => {
      const result = await db.query<{ revoked: boolean }>(
        'SELECT solvex_private.auth_revoke_invitation($1,$2,$3) AS revoked',
        [invitationId, identity.tenantId, now],
      );
      return result.rows[0]?.revoked === true;
    });
  }
}
