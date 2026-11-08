import { SandboxTestIdentity, SandboxRole } from './SandboxTestIdentity';

export type SovereignRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';

export interface UserContext {
  user_id: string;
  tenant_id: string;
  email: string;
  role: SovereignRole;
  issued_at: number;
}

/**
 * Production auth remains fail-closed. The only local token path is an explicit,
 * short-lived, HMAC-signed sandbox identity, disabled in production.
 */
export class AuthService {
  private static instance: AuthService | null = null;
  private readonly verifiedSandboxUsers = new WeakSet<UserContext>();
  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  public createSignedToken(userId: string, tenantId: string, email: string, role: SovereignRole): string {
    if (process.env.SOLVEX_ENV !== 'sandbox' || process.env.FULL_BUILD_TEST_AUTH !== 'true' || process.env.NODE_ENV === 'production') {
      throw new Error('BLOCKED: local token issuance is disabled; use the approved OIDC issuer.');
    }
    return SandboxTestIdentity.issue({
      userId, tenantId, email, role: role as SandboxRole, ttlSeconds: 300
    });
  }

  public verifyToken(token: string): { valid: boolean; user?: UserContext; error?: string } {
    const result = SandboxTestIdentity.verify(token);
    if (!result.valid) {
      return { valid: false, error: result.reason };
    }
    const user: UserContext = {
      user_id: result.claims.sub,
      tenant_id: result.claims.tenant_id,
      email: result.claims.email,
      role: result.claims.role,
      issued_at: result.claims.iat
    };
    this.verifiedSandboxUsers.add(user);
    return { valid: true, user };
  }

  public authorize(user: UserContext | null | undefined, action: string, targetTenantId?: string): { authorized: boolean; reason: string } {
    if (!user || !this.verifiedSandboxUsers.has(user)) {
      return { authorized: false, reason: 'BLOCKED: verified signed sandbox identity or approved OIDC session required.' };
    }
    if (targetTenantId && user.tenant_id !== targetTenantId) {
      return { authorized: false, reason: 'BLOCKED: tenant mismatch; cross-tenant access is denied.' };
    }
    const permissions: Record<SovereignRole, string[]> = {
      OWNER: ['*'],
      ADMIN: ['READ_SYSTEM', 'MANAGE_TENANTS', 'RUN_PIPELINE', 'READ_AUDIT', 'ORDER_TRANSITION'],
      VERIFIER: ['READ_SYSTEM', 'READ_AUDIT', 'VERIFY_PROOFS'],
      CUSTOMER: ['READ_SYSTEM', 'CREATE_ORDER']
    };
    const allowed = permissions[user.role];
    if (!allowed || (!allowed.includes('*') && !allowed.includes(action))) {
      return { authorized: false, reason: 'BLOCKED: sandbox role does not permit this action.' };
    }
    return { authorized: true, reason: 'Sandbox identity authorized.' };
  }

  public requireVerifiedSession(session: UserContext | null | undefined, action: string, targetTenantId?: string): { authenticated: boolean; authorized: boolean; status: 'BLOCKED' | 'AUTHENTICATED'; reason: string } {
    const decision = this.authorize(session, action, targetTenantId);
    return {
      authenticated: Boolean(session && this.verifiedSandboxUsers.has(session)),
      authorized: decision.authorized,
      status: decision.authorized ? 'AUTHENTICATED' : 'BLOCKED',
      reason: decision.reason
    };
  }
}
