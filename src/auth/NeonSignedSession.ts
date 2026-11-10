import { neon } from '@neondatabase/serverless';

export interface VerifiedTenantSession {
  user_id: string;
  tenant_id: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';
  issued_at: number;
  expires_at: number;
}

const ROLES = new Set(['OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER']);

function extractBearer(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length >= 16 && token.length <= 8192 ? token : null;
}

/**
 * Verify the opaque signed tenant token inside Postgres. The signing secret
 * remains in solvex_private.auth_secrets and is never loaded into Node.
 * current_claims() validates HMAC, required claims, role, issue time and expiry.
 */
export async function verifyNeonTenantSession(authorization: string | undefined): Promise<VerifiedTenantSession | null> {
  const token = extractBearer(authorization);
  const databaseUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!token || !databaseUrl) return null;

  try {
    const sql = neon(databaseUrl);
    const rows = await sql`
      WITH token_context AS MATERIALIZED (
        SELECT set_config('app.auth_token', ${token}, true) AS configured
      )
      SELECT solvex_private.current_claims() AS claims
      FROM token_context
    `;
    const claims = rows[0]?.claims as Record<string, unknown> | null | undefined;
    if (!claims || typeof claims !== 'object') return null;

    const userId = claims.user_id;
    const tenantId = claims.tenant_id;
    const email = claims.email;
    const role = claims.role;
    const issuedAt = Number(claims.issued_at);
    const expiresAt = Number(claims.expires_at);
    if (typeof userId !== 'string' || !userId || typeof tenantId !== 'string' || !tenantId ||
        typeof email !== 'string' || !email || typeof role !== 'string' || !ROLES.has(role) ||
        !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= Date.now() ||
        expiresAt - issuedAt > 900000) return null;

    return {
      user_id: userId,
      tenant_id: tenantId,
      email,
      role: role as VerifiedTenantSession['role'],
      issued_at: issuedAt,
      expires_at: expiresAt
    };
  } catch {
    // Auth must fail closed on database, network, token, or schema errors.
    return null;
  }
}
