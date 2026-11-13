import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

export type SovereignRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';

export interface UserContext {
  user_id: string;
  tenant_id: string;
  email: string;
  role: SovereignRole;
  issued_at: number;
  signed_token?: string;
}

interface JwtHeader { alg?: string; kid?: string; typ?: string; }
interface JwkSet { keys?: Array<Record<string, unknown> & { kid?: string; kty?: string; use?: string; alg?: string }>; }
interface JwtClaims {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nbf?: number;
  email?: string;
  tenant_id?: string;
  role?: string;
  organizationId?: string;
  activeOrganizationId?: string;
}

export class AuthService {
  private static instance: AuthService | null = null;
  private jwks: JwkSet | null = null;
  private jwksFetchedAt = 0;
  private constructor() {}

  public static getInstance(): AuthService {
    if (!this.instance) this.instance = new AuthService();
    return this.instance;
  }

  public createSignedToken(_userId: string, _tenantId: string, _email: string, _role: SovereignRole): string {
    throw new Error('BLOCKED: tokens must be issued by the configured trusted OIDC identity provider.');
  }

  public async verifyToken(token: string): Promise<{ valid: boolean; user?: UserContext; error?: string }> {
    try {
      const issuer = process.env.AUTH_ISSUER;
      const audience = process.env.AUTH_AUDIENCE;
      const jwksUrl = process.env.AUTH_JWKS_URL;
      if (!issuer || !audience || !jwksUrl) {
        return { valid: false, error: 'OIDC issuer, audience, and JWKS URL are not configured.' };
      }
      if (token.length > 16384 || token.length < 32) return { valid: false, error: 'Invalid token length.' };
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false, error: 'Malformed JWT.' };

      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as JwtHeader;
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as JwtClaims;
      if ((header.alg !== 'RS256' && header.alg !== 'EdDSA') || !header.kid) return { valid: false, error: 'Only keyed RS256 or EdDSA JWTs are accepted.' };

      const jwks = await this.getJwks(jwksUrl);
      const expectedKty = header.alg === 'EdDSA' ? 'OKP' : 'RSA';
      const jwk = jwks.keys?.find(key => key.kid === header.kid && key.kty === expectedKty && (!key.use || key.use === 'sig') && (!key.alg || key.alg === header.alg) && (header.alg !== 'EdDSA' || key.crv === 'Ed25519'));
      if (!jwk) return { valid: false, error: 'No matching signing key in configured JWKS.' };

      const publicKey = createPublicKey({ key: jwk as any, format: 'jwk' });
      const signatureValid = verifySignature(
        header.alg === 'EdDSA' ? null : 'RSA-SHA256',
        Buffer.from(parts[0] + '.' + parts[1]),
        publicKey,
        Buffer.from(parts[2], 'base64url')
      );
      if (!signatureValid) return { valid: false, error: 'JWT signature verification failed.' };

      const now = Math.floor(Date.now() / 1000);
      const maxLifetime = Math.min(3600, Math.max(60, Number(process.env.AUTH_MAX_TOKEN_LIFETIME_SECONDS || 3600)));
      const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (claims.iss !== issuer || !aud.includes(audience) ||
          typeof claims.exp !== 'number' || claims.exp <= now ||
          typeof claims.iat !== 'number' || claims.iat > now + 30 ||
          claims.exp <= claims.iat || claims.exp - claims.iat > maxLifetime ||
          (typeof claims.nbf === 'number' && claims.nbf > now + 30)) {
        return { valid: false, error: 'JWT issuer, audience, or time claims are invalid.' };
      }

      const roles: SovereignRole[] = ['OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER'];
      const tenantId = claims.tenant_id || claims.organizationId || claims.activeOrganizationId || claims.sub;
      const role = roles.includes(claims.role as SovereignRole) ? claims.role as SovereignRole : 'CUSTOMER';
      if (!claims.sub || !claims.email || !tenantId) {
        return { valid: false, error: 'JWT is missing verified subject, email, and tenant scope.' };
      }

      return {
        valid: true,
        user: {
          user_id: claims.sub,
          tenant_id: tenantId,
          email: claims.email,
          role,
          issued_at: claims.iat
        }
      };
    } catch {
      return { valid: false, error: 'JWT validation failed.' };
    }
  }


  /**
   * Verify a short-lived tenant context issued by the database SECURITY DEFINER
   * function after it resolves a verified Neon Auth subject to exactly one
   * active tenant membership. This is a separate trust path from provider JWTs:
   * it accepts only the database's base64(JSON).hex(HMAC-SHA256) envelope.
   */
  /** Verify the DB-issued HMAC claim and re-check current active membership in Neon. */
  public async verifyNeonTenantClaim(token: string): Promise<{ valid: boolean; user?: UserContext; error?: string }> {
    try {
      const databaseUrl = process.env.SOLVEX_GATE12_DATABASE_URL;
      if (!databaseUrl) return { valid: false, error: 'Isolated GATE-12 Neon database URL is not configured.' };
      if (typeof token !== 'string' || token.length > 8192 || token.length < 80) {
        return { valid: false, error: 'Invalid Neon tenant-claim length.' };
      }
      const sql = neon(databaseUrl);
      const rows = await sql`
        WITH token_context AS MATERIALIZED (
          SELECT set_config('app.auth_token', ${token}, true) AS configured
        ),
        claims AS MATERIALIZED (
          SELECT solvex_private.current_claims() AS value FROM token_context
        )
        SELECT c.value
          FROM claims c
          JOIN public.users u
            ON u.id = c.value->>'user_id'
           AND lower(u.email) = lower(c.value->>'email')
           AND u.status = 'ACTIVE'
          JOIN public.tenant_memberships m
            ON m.user_id = u.id
           AND m.tenant_id = c.value->>'tenant_id'
           AND m.status = 'ACTIVE'
          JOIN public.tenants t
            ON t.id = m.tenant_id AND t.status = 'ACTIVE'
          JOIN public.roles r
            ON r.id = m.role_id
           AND r.tenant_id = m.tenant_id
           AND r.status = 'ACTIVE'
           AND upper(r.name) = c.value->>'role'
         WHERE c.value IS NOT NULL
           AND (SELECT count(*)
                  FROM public.tenant_memberships m2
                  JOIN public.tenants t2 ON t2.id = m2.tenant_id AND t2.status = 'ACTIVE'
                  JOIN public.roles r2 ON r2.id = m2.role_id
                    AND r2.tenant_id = m2.tenant_id AND r2.status = 'ACTIVE'
                 WHERE m2.user_id = u.id AND m2.status = 'ACTIVE'
                   AND upper(r2.name) IN ('OWNER','ADMIN','VERIFIER','CUSTOMER')) = 1
      `;
      if (rows.length !== 1 || !rows[0].value || typeof rows[0].value !== 'object') {
        return { valid: false, error: 'Neon rejected signature, expiry, or active tenant membership.' };
      }
      const claims = rows[0].value as Record<string, unknown>;
      const roles: SovereignRole[] = ['OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER'];
      if (typeof claims.user_id !== 'string' || typeof claims.email !== 'string' ||
          typeof claims.tenant_id !== 'string' || !roles.includes(claims.role as SovereignRole) ||
          typeof claims.issued_at !== 'number') {
        return { valid: false, error: 'Neon tenant claim has invalid identity fields.' };
      }
      return {
        valid: true,
        user: {
          user_id: claims.user_id,
          email: claims.email,
          tenant_id: claims.tenant_id,
          role: claims.role as SovereignRole,
          issued_at: Math.floor(claims.issued_at / 1000),
          signed_token: token
        }
      };
    } catch {
      return { valid: false, error: 'Neon tenant-claim verification service unavailable.' };
    }
  }

  private async getJwks(url: string): Promise<JwkSet> {
    const now = Date.now();
    if (this.jwks && now - this.jwksFetchedAt < 5 * 60 * 1000) return this.jwks;
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('JWKS URL must use HTTPS.');
    const response = await fetch(parsed, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('JWKS endpoint unavailable.');
    const body = await response.json() as JwkSet;
    if (!Array.isArray(body.keys) || body.keys.length === 0 || body.keys.length > 100) throw new Error('Invalid JWKS document.');
    this.jwks = body;
    this.jwksFetchedAt = now;
    return body;
  }

  public async authorize(user: UserContext | null | undefined, action: string, targetTenantId?: string): Promise<{ authorized: boolean; reason: string }> {
    if (!user?.signed_token) return { authorized: false, reason: 'BLOCKED: verified identity and signed tenant claims are required.' };
    const verified = await this.verifyNeonTenantClaim(user.signed_token);
    if (!verified.valid || !verified.user) return { authorized: false, reason: verified.error || 'BLOCKED: signed tenant claim verification failed.' };
    const current = verified.user;
    if (current.user_id !== user.user_id || current.email !== user.email || current.tenant_id !== user.tenant_id || current.role !== user.role) {
      return { authorized: false, reason: 'BLOCKED: supplied identity does not match current signed tenant claims.' };
    }
    if (targetTenantId && current.tenant_id !== targetTenantId) return { authorized: false, reason: 'BLOCKED: tenant boundary rejected this request.' };
    if (action !== 'ORDER_TRANSITION') return { authorized: false, reason: 'BLOCKED: action is not authorized by this lifecycle policy.' };
    return { authorized: true, reason: 'Verified signed tenant claim and current active membership.' };
  }

  public async requireVerifiedSession(session: UserContext | null | undefined, action: string, targetTenantId?: string): Promise<{ authenticated: boolean; authorized: boolean; status: 'BLOCKED' | 'AUTHENTICATED'; reason: string }> {
    const decision = await this.authorize(session, action, targetTenantId);
    return {
      authenticated: Boolean(session?.signed_token && decision.authorized),
      authorized: decision.authorized,
      status: decision.authorized ? 'AUTHENTICATED' : 'BLOCKED',
      reason: decision.reason
    };
  }
}
