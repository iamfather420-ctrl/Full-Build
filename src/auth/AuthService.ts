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
  private secretSalt: string = 'SOVEREIGN_AUTH_SECRET_v1';

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public createSignedToken(userId: string, tenantId: string, email: string, role: SovereignRole): string {
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
    if (!token || !token.includes('.')) {
      return { valid: false, error: 'Malformed token structure' };
    }
    const [b64, sig] = token.split('.');
    const expectedSig = computeSha256(`${b64}:${this.secretSalt}`);
    if (sig !== expectedSig) {
      return { valid: false, error: 'Invalid token cryptographic signature' };
    }
    try {
      const json = typeof atob === 'function'
        ? decodeURIComponent(escape(atob(b64)))
        : Buffer.from(b64, 'base64').toString('utf8');
      const user = JSON.parse(json) as UserContext;
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
    // 1. Cross-tenant isolation check
    if (targetTenantId && targetTenantId !== user.tenant_id) {
      if (user.role !== 'OWNER') {
        return {
          authorized: false,
          reason: `Cross-Tenant Access Violation: Role ${user.role} in tenant ${user.tenant_id} is blocked from partition ${targetTenantId}`
        };
      }
    }

    // 2. Role-based capability check
    if (action === 'DEPLOY_RUNTIME') {
      if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
        return {
          authorized: false,
          reason: `RBAC Violation: Role ${user.role} lacks permission DEPLOY_RUNTIME`
        };
      }
    }

    if (action === 'PUBLISH_OFFER') {
      if (user.role === 'CUSTOMER') {
        return {
          authorized: false,
          reason: `RBAC Violation: Role CUSTOMER lacks permission PUBLISH_OFFER`
        };
      }
    }

    if (action === 'RUN_PIPELINE') {
      if (user.role === 'CUSTOMER') {
        return {
          authorized: false,
          reason: `RBAC Violation: Role CUSTOMER lacks permission RUN_PIPELINE`
        };
      }
    }

    return { authorized: true };
  }
}
