import { createPublicKey, verify as verifySignature } from 'node:crypto';

export type SovereignRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';

export interface UserContext {
  user_id: string;
  tenant_id: string;
  email: string;
  role: SovereignRole;
  issued_at: number;
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

      const publicKey = createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' });
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

  public authorize(user: UserContext | null | undefined, _action: string, targetTenantId?: string): { authorized: boolean; reason: string } {
    if (!user) return { authorized: false, reason: 'A verified OIDC identity is required.' };
    if (targetTenantId && user.tenant_id !== targetTenantId) return { authorized: false, reason: 'Tenant boundary rejected this request.' };
    return { authorized: true, reason: 'Verified OIDC tenant context accepted.' };
  }

  public requireVerifiedSession(session: UserContext | null | undefined, action: string, targetTenantId?: string): { authenticated: boolean; authorized: boolean; status: 'BLOCKED' | 'AUTHENTICATED'; reason: string; session?: UserContext } {
    const decision = this.authorize(session, action, targetTenantId);
    return {
      authenticated: Boolean(session),
      authorized: decision.authorized,
      status: decision.authorized ? 'AUTHENTICATED' : 'BLOCKED',
      reason: decision.reason,
      ...(session ? { session } : {})
    };
  }
}
