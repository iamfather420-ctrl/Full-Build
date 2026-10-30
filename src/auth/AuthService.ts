export type SovereignRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';

export interface UserContext {
  user_id: string;
  tenant_id: string;
  email: string;
  role: SovereignRole;
  issued_at: number;
}

/**
 * Fail-closed production auth boundary.
 *
 * No local token issuer or verifier is implemented. A non-persistent in-memory
 * identity fixture exists solely for isolated CI lifecycle tests; it cannot be
 * created in production and is not a login/session mechanism.
 */
export class AuthService {
  private static instance: AuthService | null = null;
  private readonly verifiedContexts = new WeakSet<object>();
  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  public createSignedToken(_userId: string, _tenantId: string, _email: string, _role: SovereignRole): string {
    throw new Error('BLOCKED: local token issuance is disabled; no production identity issuer is configured.');
  }

  public verifyToken(_token: string): { valid: boolean; user?: UserContext; error?: string } {
    return { valid: false, error: 'BLOCKED: no configured production identity verifier is available.' };
  }

  /** Test fixture only. It creates no token, session, persistence record, or reusable credential. */
  public createVerificationFixture(
    claims: Omit<UserContext, 'issued_at'>
  ): UserContext {
    if (
      process.env.NODE_ENV !== 'test' ||
      process.env.SOLVEX_ENV !== 'ci' ||
      process.env.SOLVEX_TEST_IDENTITY_ENABLED !== 'true'
    ) {
      throw new Error('BLOCKED: in-memory verification identities are restricted to isolated CI tests.');
    }
    if (
      !claims.user_id.trim() ||
      !claims.tenant_id.trim() ||
      !claims.email.trim() ||
      !['OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER'].includes(claims.role)
    ) {
      throw new Error('BLOCKED: invalid verification identity claims.');
    }
    const context: UserContext = { ...claims, issued_at: Math.floor(Date.now() / 1000) };
    this.verifiedContexts.add(context);
    return context;
  }

  public authorize(
    user: UserContext | null | undefined,
    action: string,
    targetTenantId?: string
  ): { authorized: boolean; reason: string } {
    if (!user || !this.verifiedContexts.has(user)) {
      return { authorized: false, reason: 'BLOCKED: verified identity and signed tenant claims are required.' };
    }
    if (targetTenantId && user.tenant_id !== targetTenantId) {
      return { authorized: false, reason: 'BLOCKED: verified identity is not authorized for this tenant.' };
    }
    if (action !== 'ORDER_TRANSITION' || !['OWNER', 'ADMIN'].includes(user.role)) {
      return { authorized: false, reason: 'BLOCKED: role is not authorized for this operation.' };
    }
    return { authorized: true, reason: 'AUTHORIZED: isolated CI verification fixture and tenant scope.' };
  }

  public requireVerifiedSession(
    session: UserContext | null | undefined,
    action: string,
    targetTenantId?: string
  ): { authenticated: boolean; authorized: boolean; status: 'VERIFIED' | 'BLOCKED'; reason: string } {
    if (!session || !this.verifiedContexts.has(session)) {
      return {
        authenticated: false,
        authorized: false,
        status: 'BLOCKED',
        reason: 'BLOCKED: no verified first-party session is available.'
      };
    }
    const result = this.authorize(session, action, targetTenantId);
    return {
      authenticated: true,
      authorized: result.authorized,
      status: result.authorized ? 'VERIFIED' : 'BLOCKED',
      reason: result.reason
    };
  }
}
