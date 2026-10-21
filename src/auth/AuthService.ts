import { createHmac, createPublicKey, timingSafeEqual, verify as verifySignature } from 'node:crypto';

export type SovereignRole = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VERIFIER' | 'CUSTOMER' | 'AUDITOR';

export interface UserContext {
  user_id: string;
  tenant_id: string;
  email: string;
  role: SovereignRole;
  issued_at: number;
  expires_at?: number;
  /** Claims are informational; authorization always intersects them with server policy. */
  permissions?: string[];
}

export const ROLE_PERMISSIONS: Record<SovereignRole, string[]> = {
  OWNER: ['SYS_ADMIN', 'MANAGE_TENANTS', 'MANAGE_USERS', 'EXECUTE_NODES', 'RUN_PIPELINE', 'PUBLISH_OFFER', 'CREATE_ORDER', 'DEPLOY_RUNTIME', 'VERIFY_PROOFS', 'AUDIT_CHAIN', 'STAGE_CHECKPOINT', 'EXECUTE_ROLLBACK', 'VIEW_EVIDENCE', 'VIEW_TELEMETRY', 'CHECK_INVARIANTS', 'CHECK_NOPOT', 'ATTEST_ORACLE', 'VIEW_REPORTS'],
  ADMIN: ['MANAGE_USERS', 'RUN_PIPELINE', 'PUBLISH_OFFER', 'CREATE_ORDER', 'DEPLOY_RUNTIME', 'VERIFY_PROOFS', 'AUDIT_CHAIN', 'VIEW_EVIDENCE', 'STAGE_CHECKPOINT', 'VIEW_TELEMETRY', 'CHECK_INVARIANTS', 'CHECK_NOPOT', 'VIEW_REPORTS'],
  OPERATOR: ['EXECUTE_NODES', 'RUN_PIPELINE', 'STAGE_CHECKPOINT', 'VIEW_TELEMETRY', 'DEPLOY_RUNTIME', 'VIEW_EVIDENCE'],
  VERIFIER: ['VERIFY_PROOFS', 'RUN_PIPELINE', 'CHECK_INVARIANTS', 'CHECK_NOPOT', 'ATTEST_ORACLE', 'VIEW_EVIDENCE', 'AUDIT_CHAIN'],
  CUSTOMER: ['INTAKE_PROBLEM', 'VIEW_OFFERS', 'CREATE_ORDER', 'VIEW_DEPLOYMENTS', 'VIEW_CUSTOMER_EVIDENCE'],
  AUDITOR: ['AUDIT_CHAIN', 'VERIFY_CONTINUITY', 'VIEW_TELEMETRY', 'VIEW_EVIDENCE', 'CHECK_TAMPER', 'VIEW_REPORTS'],
};

const nowSeconds = () => Math.floor(Date.now() / 1000);
const authSecret = () => process.env.SOVEREIGN_AUTH_SECRET || '';
const knownRole = (role: unknown): role is SovereignRole => typeof role === 'string' && Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role);
let cachedJwks: { url: string; expiresAt: number; keys: Array<Record<string, unknown>> } | null = null;

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export class AuthService {
  private static instance: AuthService | null = null;
  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  /** Local test/development tokens only; production must use a trusted OIDC issuer. */
  public createSignedToken(userId: string, tenantId: string, email: string, role: SovereignRole): string {
    const mode = (process.env.AUTH_MODE || (process.env.NODE_ENV === 'production' ? 'oidc' : 'local_hs256')).toLowerCase();
    if (process.env.NODE_ENV === 'production' || mode !== 'local_hs256') {
      throw new Error('Local HS256 token issuance is disabled outside explicit non-production local_hs256 mode.');
    }
    const secret = authSecret();
    if (secret.length < 32) throw new Error('SOVEREIGN_AUTH_SECRET must contain at least 32 characters.');
    if (!knownRole(role) || !userId || !tenantId || !email) throw new Error('Valid identity claims are required.');
    const issuedAt = nowSeconds();
    const payload = {
      user_id: userId, tenant_id: tenantId, email, role,
      permissions: ROLE_PERMISSIONS[role],
      iat: issuedAt, exp: issuedAt + 3600,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', secret).update(encoded).digest();
    return `${encoded}.${signature.toString('base64url')}`;
  }

  public verifyToken(token: string): { valid: boolean; user?: UserContext; error?: string } {
    const secret = authSecret();
    if (secret.length < 32) return { valid: false, error: 'Local authentication secret is not configured securely.' };
    const parts = typeof token === 'string' ? token.split('.') : [];
    if (parts.length !== 2) return { valid: false, error: 'Malformed local token.' };
    try {
      const expected = createHmac('sha256', secret).update(parts[0]).digest();
      const provided = decodeBase64Url(parts[1]);
      if (!safeEqual(expected, provided)) return { valid: false, error: 'Invalid token signature.' };
      const payload = JSON.parse(decodeBase64Url(parts[0]).toString('utf8'));
      const now = nowSeconds();
      if (!payload || typeof payload.user_id !== 'string' || !payload.user_id ||
          typeof payload.tenant_id !== 'string' || !payload.tenant_id ||
          typeof payload.email !== 'string' || !payload.email || !knownRole(payload.role) ||
          !Number.isFinite(payload.iat) || !Number.isFinite(payload.exp) ||
          payload.iat > now + 60 || payload.exp <= now || payload.exp <= payload.iat || payload.exp - payload.iat > 3600 ||
          !Array.isArray(payload.permissions) || !payload.permissions.every((p: unknown) => typeof p === 'string')) {
        return { valid: false, error: 'Token claims are invalid or expired.' };
      }
      return { valid: true, user: { user_id: payload.user_id, tenant_id: payload.tenant_id, email: payload.email,
        role: payload.role, issued_at: payload.iat, expires_at: payload.exp,
        permissions: this.allowedClaims(payload.role, payload.permissions) } };
    } catch {
      return { valid: false, error: 'Token payload could not be decoded.' };
    }
  }

  private allowedClaims(role: SovereignRole, claims: string[]): string[] {
    const allowed = ROLE_PERMISSIONS[role];
    return allowed.filter((permission) => claims.includes(permission));
  }

  /** Verify the standard OIDC ID-token claims, including the one-time login nonce. */
  public async verifyOidcIdToken(token: string, expectedNonce: string): Promise<{ valid: boolean; subject?: string; error?: string }> {
    const issuer = process.env.AUTH_ISSUER || '';
    const clientId = process.env.AUTH_CLIENT_ID || '';
    const jwksUrl = process.env.AUTH_JWKS_URL || '';
    if (!issuer || !clientId || !jwksUrl || !expectedNonce) return { valid: false, error: 'OIDC issuer, client ID, JWKS URL, and nonce are required.' };
    try {
      const issuerUrl = new URL(issuer);
      const jwks = new URL(jwksUrl);
      if (process.env.NODE_ENV === 'production' && (issuerUrl.protocol !== 'https:' || jwks.protocol !== 'https:')) return { valid: false, error: 'Production OIDC endpoints must use HTTPS.' };
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false, error: 'Malformed OIDC ID token.' };
      const header = JSON.parse(decodeBase64Url(parts[0]).toString('utf8'));
      const claims = JSON.parse(decodeBase64Url(parts[1]).toString('utf8'));
      if (!['RS256', 'ES256'].includes(header.alg) || typeof header.kid !== 'string' || !header.kid || header.crit !== undefined) return { valid: false, error: 'Unsupported ID-token signing parameters.' };
      let signingKeys: Array<Record<string, unknown>>;
      if (cachedJwks && cachedJwks.url === jwksUrl && cachedJwks.expiresAt > Date.now()) {
        signingKeys = cachedJwks.keys;
      } else {
        const response = await fetch(jwksUrl, { signal: AbortSignal.timeout(4000), headers: { accept: 'application/json' } });
        if (!response.ok) return { valid: false, error: 'OIDC JWKS endpoint returned a non-success status.' };
        const document = await response.json() as { keys?: Array<Record<string, unknown>> };
        if (!Array.isArray(document.keys) || document.keys.length > 100) return { valid: false, error: 'OIDC JWKS document is invalid.' };
        signingKeys = document.keys;
        cachedJwks = { url: jwksUrl, expiresAt: Date.now() + 5 * 60_000, keys: signingKeys };
      }
      const key = signingKeys.find((candidate) => candidate.kid === header.kid && (candidate.alg === undefined || candidate.alg === header.alg));
      if (!key || (key.use !== undefined && key.use !== 'sig')) return { valid: false, error: 'No matching OIDC signing key.' };
      const publicKey = createPublicKey({ key: key as any, format: 'jwk' });
      const signature = decodeBase64Url(parts[2]);
      const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
      const signatureValid = header.alg === 'RS256'
        ? verifySignature('RSA-SHA256', signingInput, publicKey, signature)
        : verifySignature('sha256', signingInput, { key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);
      if (!signatureValid) return { valid: false, error: 'OIDC ID-token signature verification failed.' };
      const now = nowSeconds();
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      const maxLifetime = Number(process.env.AUTH_MAX_TOKEN_LIFETIME_SECONDS || 3600);
      if (claims.iss !== issuer || !audiences.includes(clientId) ||
          (Array.isArray(claims.aud) && claims.aud.length > 1 && claims.azp !== clientId) ||
          claims.nonce !== expectedNonce || typeof claims.sub !== 'string' || !claims.sub ||
          !Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.iat) || claims.iat > now + 5 ||
          (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 5)) ||
          claims.exp <= claims.iat || !Number.isFinite(maxLifetime) || maxLifetime < 60 || claims.exp - claims.iat > maxLifetime) {
        return { valid: false, error: 'OIDC ID-token issuer, audience, nonce, or time claims are invalid.' };
      }
      return { valid: true, subject: claims.sub };
    } catch {
      return { valid: false, error: 'OIDC ID-token verification failed.' };
    }
  }

  /** Verify an RS256/ES256 JWT against a trusted OIDC JWKS endpoint using Node crypto. */
  public async verifyOidcAccessToken(token: string): Promise<{ valid: boolean; user?: UserContext; error?: string }> {
    const issuer = process.env.AUTH_ISSUER || '';
    const audience = process.env.AUTH_AUDIENCE || '';
    const jwksUrl = process.env.AUTH_JWKS_URL || '';
    if (!issuer || !audience || !jwksUrl) return { valid: false, error: 'Trusted OIDC issuer, audience, and JWKS URL are required.' };
    try {
      const issuerUrl = new URL(issuer);
      const jwks = new URL(jwksUrl);
      if (process.env.NODE_ENV === 'production' && (issuerUrl.protocol !== 'https:' || jwks.protocol !== 'https:')) {
        return { valid: false, error: 'Production OIDC issuer and JWKS must use HTTPS.' };
      }
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false, error: 'Malformed OIDC token.' };
      const header = JSON.parse(decodeBase64Url(parts[0]).toString('utf8'));
      const claims = JSON.parse(decodeBase64Url(parts[1]).toString('utf8'));
      if (!['RS256', 'ES256'].includes(header.alg) || typeof header.kid !== 'string' || !header.kid || header.crit !== undefined) {
        return { valid: false, error: 'Unsupported OIDC signing algorithm or missing key ID.' };
      }
      let signingKeys: Array<Record<string, unknown>>;
      if (cachedJwks && cachedJwks.url === jwksUrl && cachedJwks.expiresAt > Date.now()) {
        signingKeys = cachedJwks.keys;
      } else {
        const response = await fetch(jwksUrl, { signal: AbortSignal.timeout(4000), headers: { accept: 'application/json' } });
        if (!response.ok) return { valid: false, error: 'OIDC JWKS endpoint returned a non-success status.' };
        const jwksDocument = await response.json() as { keys?: Array<Record<string, unknown>> };
        if (!Array.isArray(jwksDocument.keys) || jwksDocument.keys.length > 100) return { valid: false, error: 'OIDC JWKS document is invalid.' };
        signingKeys = jwksDocument.keys;
        cachedJwks = { url: jwksUrl, expiresAt: Date.now() + 5 * 60_000, keys: signingKeys };
      }
      const key = signingKeys.find((candidate) => candidate.kid === header.kid && (candidate.alg === undefined || candidate.alg === header.alg));
      if (!key || key.use && key.use !== 'sig') return { valid: false, error: 'No matching signing key found in trusted JWKS.' };
      const publicKey = createPublicKey({ key: key as any, format: 'jwk' });
      const signature = decodeBase64Url(parts[2]);
      const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
      const signatureValid = header.alg === 'RS256'
        ? verifySignature('RSA-SHA256', signingInput, publicKey, signature)
        : verifySignature('sha256', signingInput, { key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);
      if (!signatureValid) return { valid: false, error: 'OIDC signature verification failed.' };

      const now = nowSeconds();
      const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      const maxLifetime = Number(process.env.AUTH_MAX_TOKEN_LIFETIME_SECONDS || 3600);
      if (claims.iss !== issuer || !aud.includes(audience) ||
          (Array.isArray(claims.aud) && claims.aud.length > 1 && claims.azp !== audience) ||
          (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 5)) ||
          !Number.isFinite(claims.exp) || claims.exp <= now ||
          !Number.isFinite(claims.iat) || claims.iat > now + 5 || claims.exp <= claims.iat ||
          !Number.isFinite(maxLifetime) || maxLifetime < 60 || claims.exp - claims.iat > maxLifetime ||
          typeof claims.sub !== 'string' || !claims.sub || typeof claims.tenant_id !== 'string' || !claims.tenant_id ||
          !knownRole(claims.role)) {
        return { valid: false, error: 'OIDC issuer, audience, time, tenant, or role claims are invalid.' };
      }
      const role = claims.role as SovereignRole;
      // Role-to-permission mapping is server-owned. An OIDC token cannot grant
      // arbitrary capabilities by supplying a permissions array.
      const permissions = [...ROLE_PERMISSIONS[role]];
      return { valid: true, user: { user_id: claims.sub, tenant_id: claims.tenant_id,
        email: typeof claims.email === 'string' ? claims.email : claims.sub, role,
        issued_at: claims.iat, expires_at: claims.exp, permissions } };
    } catch {
      return { valid: false, error: 'OIDC token verification failed.' };
    }
  }

  public authorize(user: UserContext, action: string, targetTenantId?: string): { authorized: boolean; reason?: string } {
    if (!knownRole(user.role)) return { authorized: false, reason: 'Unknown role.' };
    if (targetTenantId && targetTenantId !== user.tenant_id && user.role !== 'OWNER') {
      return { authorized: false, reason: `Cross-tenant access denied for ${user.tenant_id}.` };
    }
    const rolePermissions = ROLE_PERMISSIONS[user.role];
    const tokenPermissions = Array.isArray(user.permissions) ? user.permissions : rolePermissions;
    const effective = rolePermissions.filter((permission) => tokenPermissions.includes(permission));
    if (!effective.includes(action) && !effective.includes('SYS_ADMIN')) {
      return { authorized: false, reason: `Role ${user.role} lacks permission ${action}.` };
    }
    return { authorized: true };
  }
}
