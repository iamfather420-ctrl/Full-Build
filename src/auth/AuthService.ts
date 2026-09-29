import { createHmac, timingSafeEqual } from 'node:crypto';

export type SovereignRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';

export interface UserContext {
  user_id: string;
  tenant_id: string;
  email: string;
  role: SovereignRole;
  issued_at: number;
  expires_at: number;
  issuer: 'SOLVEX';
  audience: 'SOLVEX_API';
  token_id: string;
}

const ROLE_SET = new Set<SovereignRole>(['OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER']);

/**
 * HMAC-authenticated, expiring service tokens. Production token issuance belongs to
 * an upstream identity provider; this class only verifies server-originated tokens.
 */
export class AuthService {
  private static instance: AuthService | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  public isConfigured(): boolean {
    return Boolean(process.env.SOLVEX_AUTH_SECRET && process.env.SOLVEX_AUTH_SECRET.length >= 32);
  }

  private getSecret(): string {
    const secret = process.env.SOLVEX_AUTH_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('SOLVEX_AUTH_SECRET must be set to at least 32 characters; authentication fails closed');
    }
    return secret;
  }

  private encode(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.getSecret()).update(payload).digest('base64url');
  }

  /** Test and service bootstrap helper; it is not exposed by a public API route. */
  public createSignedToken(userId: string, tenantId: string, email: string, role: SovereignRole, ttlMs = 15 * 60 * 1000): string {
    if (!ROLE_SET.has(role)) throw new Error('Unsupported role');
    if (!userId || !tenantId || !email || ttlMs <= 0) throw new Error('Token subject, tenant, email, and TTL are required');
    const issuedAt = Date.now();
    const payload: UserContext = {
      user_id: userId,
      tenant_id: tenantId,
      email,
      role,
      issued_at: issuedAt,
      expires_at: issuedAt + ttlMs,
      issuer: 'SOLVEX',
      audience: 'SOLVEX_API',
      token_id: createHmac('sha256', this.getSecret()).update(`${userId}:${tenantId}:${issuedAt}`).digest('hex').slice(0, 32)
    };
    const encoded = this.encode(payload);
    return `${encoded}.${this.sign(encoded)}`;
  }

  public verifyToken(token: string): { valid: boolean; user?: UserContext; error?: string } {
    if (!this.isConfigured()) return { valid: false, error: 'Authentication is not configured' };
    const parts = token?.split('.') || [];
    if (parts.length !== 2 || !parts[0] || !parts[1]) return { valid: false, error: 'Malformed token' };
    const [encoded, signature] = parts;
    const expected = this.sign(encoded);
    const receivedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) {
      return { valid: false, error: 'Invalid token signature' };
    }
    try {
      const user = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as UserContext;
      if (!ROLE_SET.has(user.role) || !user.user_id || !user.tenant_id || !user.email || !user.token_id) return { valid: false, error: 'Invalid token claims' };
      if (user.issuer !== 'SOLVEX' || user.audience !== 'SOLVEX_API') return { valid: false, error: 'Invalid token issuer or audience' };
      if (!Number.isFinite(user.expires_at) || user.expires_at <= Date.now()) return { valid: false, error: 'Token expired' };
      return { valid: true, user };
    } catch {
      return { valid: false, error: 'Invalid token payload' };
    }
  }

  public authorize(user: UserContext, action: string, targetTenantId?: string): { authorized: boolean; reason?: string } {
    if (targetTenantId && targetTenantId !== user.tenant_id && user.role !== 'OWNER') {
      return { authorized: false, reason: 'Cross-tenant access denied' };
    }
    const allowed: Record<string, SovereignRole[]> = {
      VIEW_OWN: ['CUSTOMER', 'VERIFIER', 'ADMIN', 'OWNER'],
      CREATE_ORDER: ['CUSTOMER', 'VERIFIER', 'ADMIN', 'OWNER'],
      CREATE_CHECKOUT: ['CUSTOMER', 'VERIFIER', 'ADMIN', 'OWNER'],
      RUN_PIPELINE: ['VERIFIER', 'ADMIN', 'OWNER'],
      VIEW_EVIDENCE: ['VERIFIER', 'ADMIN', 'OWNER'],
      PUBLISH_OFFER: ['ADMIN', 'OWNER'],
      VERIFY_PAYMENT: ['ADMIN', 'OWNER'],
      DEPLOY_RUNTIME: ['ADMIN', 'OWNER'],
      MANAGE_TENANTS: ['OWNER'],
      VIEW_AUDIT: ['ADMIN', 'OWNER'],
      ROLLBACK: ['ADMIN', 'OWNER']
    };
    const permittedRoles = allowed[action];
    if (!permittedRoles || !permittedRoles.includes(user.role)) {
      return { authorized: false, reason: `Role ${user.role} is not authorized for ${action}` };
    }
    return { authorized: true };
  }
}
