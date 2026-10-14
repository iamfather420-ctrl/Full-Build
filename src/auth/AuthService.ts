import { computeSha256 } from '../database/DatabaseSchema';

export type SovereignRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';

export interface UserContext {
  user_id: string;
  tenant_id: string;
  email: string;
  role: SovereignRole;
  issued_at: number;
}

export class AuthService {
  private static instance: AuthService | null = null;
  // Production must supply a high-entropy secret. The development fallback is never
  // accepted in production, preventing a known default from minting trusted tokens.
  private readonly secretSalt: string;

  private constructor() {
    const configured = (typeof process !== 'undefined' && process.env?.SOLVEX_AUTH_SECRET) || '';
    this.secretSalt = configured.trim() || (process.env.NODE_ENV === 'production' ? '' : 'SOVEREIGN_AUTH_SECRET_v1');
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public createSignedToken(userId: string, tenantId: string, email: string, role: SovereignRole): string {
    if (!this.secretSalt) {
      throw new Error('SOLVEX_AUTH_SECRET is required to issue tokens in production.');
    }
    const payload = {
      user_id: userId,
      tenant_id: tenantId,
      email,
      role,
      issued_at: Date.now()
    };
    const b64 = typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
      : Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = computeSha256(`${b64}:${this.secretSalt}`);
    return `${b64}.${signature}`;
  }

  public verifyToken(token: string): { valid: boolean; user?: UserContext; error?: string } {
    if (!this.secretSalt) {
      return { valid: false, error: 'SOLVEX_AUTH_SECRET is not configured; authentication fails closed' };
    }
    if (!token || !token.includes('.')) {
      return { valid: false, error: 'Malformed token structure' };
    }
    const [b64, sig, ...extra] = token.split('.');
    if (!b64 || !sig || extra.length > 0) {
      return { valid: false, error: 'Malformed token structure' };
    }
    const expectedSig = computeSha256(`${b64}:${this.secretSalt}`);
    if (sig !== expectedSig) {
      return { valid: false, error: 'Invalid token cryptographic signature' };
    }
    try {
      const json = typeof atob === 'function'
        ? decodeURIComponent(escape(atob(b64)))
        : Buffer.from(b64, 'base64').toString('utf8');
      const user = JSON.parse(json) as UserContext;
      if (
        !user ||
        typeof user.user_id !== 'string' || !user.user_id ||
        typeof user.tenant_id !== 'string' || !user.tenant_id ||
        typeof user.email !== 'string' || !user.email ||
        !['OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER'].includes(user.role) ||
        !Number.isFinite(user.issued_at)
      ) {
        return { valid: false, error: 'Invalid token claims' };
      }
      return { valid: true, user };
    } catch {
      return { valid: false, error: 'Failed to decode token payload' };
    }
  }

  public authorize(
    user: UserContext,
    action: string,
    targetTenantId?: string
  ): { authorized: boolean; reason?: string } {
    if (targetTenantId && targetTenantId !== user.tenant_id && user.role !== 'OWNER') {
      return {
        authorized: false,
        reason: `Cross-Tenant Access Violation: Role ${user.role} in tenant ${user.tenant_id} is blocked from partition ${targetTenantId}`
      };
    }

    if (action === 'DEPLOY_RUNTIME' && user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return { authorized: false, reason: `RBAC Violation: Role ${user.role} lacks permission DEPLOY_RUNTIME` };
    }
    if (action === 'PUBLISH_OFFER' && user.role === 'CUSTOMER') {
      return { authorized: false, reason: 'RBAC Violation: Role CUSTOMER lacks permission PUBLISH_OFFER' };
    }
    if (action === 'RUN_PIPELINE' && user.role === 'CUSTOMER') {
      return { authorized: false, reason: 'RBAC Violation: Role CUSTOMER lacks permission RUN_PIPELINE' };
    }
    return { authorized: true };
  }
}
