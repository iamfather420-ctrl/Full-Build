export type SovereignRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';

export interface UserContext {
  user_id: string;
  tenant_id: string;
  email: string;
  role: SovereignRole;
  issued_at: number;
  /** Opaque database-HMAC token issued only after OIDC + active membership validation. */
  signed_token?: string;
}

export class AuthService {
  private static instance: AuthService | null = null;
  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  public createSignedToken(_userId: string, _tenantId: string, _email: string, _role: SovereignRole): string {
    throw new Error('BLOCKED: application-side tenant token minting is disabled; claims must be issued by Neon after OIDC verification.');
  }

  /** Verify the DB-issued HMAC token and re-check the live membership/role. */
  public async verifyToken(token: string): Promise<{ valid: boolean; user?: UserContext; error?: string }> {
    if (!token || token.length > 8192) return { valid: false, error: 'BLOCKED: missing or oversized signed tenant token.' };
    try {
      // Dynamic import keeps offline/local verification tools usable without a database URL.
      const { verifyOidcTenantToken } = await import('@workspace/db');
      // CI lifecycle verification must validate against the same disposable Neon branch
      // that issued the token. Outside GitHub Actions, normal configured DB routing is unchanged.
      const validationDatabaseUrl = process.env.GITHUB_ACTIONS === 'true'
        ? process.env.SOLVEX_NEON_ISOLATION_TEST_DATABASE_URL
        : undefined;
      const claims = await verifyOidcTenantToken(token, validationDatabaseUrl);
      if (!claims) return { valid: false, error: 'BLOCKED: signature, expiry, or active tenant membership verification failed.' };
      const role = claims.role;
      if (typeof claims.user_id !== 'string' || typeof claims.tenant_id !== 'string' ||
          typeof claims.email !== 'string' ||
          !['OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER'].includes(String(role)) ||
          typeof claims.issued_at !== 'number' || typeof claims.expires_at !== 'number') {
        return { valid: false, error: 'BLOCKED: signed tenant claim is malformed.' };
      }
      return {
        valid: true,
        user: {
          user_id: claims.user_id,
          tenant_id: claims.tenant_id,
          email: claims.email,
          role: role as SovereignRole,
          issued_at: claims.issued_at,
          signed_token: token,
        },
      };
    } catch {
      return { valid: false, error: 'BLOCKED: tenant claim verifier is unavailable.' };
    }
  }

  public async authorize(
    supplied: UserContext | null | undefined,
    action: string,
    targetTenantId?: string,
  ): Promise<{ authorized: boolean; reason: string }> {
    if (!supplied?.signed_token) {
      return { authorized: false, reason: 'BLOCKED: verified identity and signed tenant claims are required.' };
    }
    const verified = await this.verifyToken(supplied.signed_token);
    if (!verified.valid || !verified.user) {
      return { authorized: false, reason: verified.error || 'BLOCKED: signed tenant claim verification failed.' };
    }
    const user = verified.user;
    if (user.user_id !== supplied.user_id || user.tenant_id !== supplied.tenant_id ||
        user.email !== supplied.email || user.role !== supplied.role) {
      return { authorized: false, reason: 'BLOCKED: supplied lifecycle identity does not match its signed claims.' };
    }
    if (targetTenantId && user.tenant_id !== targetTenantId) {
      return { authorized: false, reason: 'BLOCKED: tenant mismatch.' };
    }
    if (action !== 'ORDER_TRANSITION') {
      return { authorized: false, reason: 'BLOCKED: action is not authorized by this lifecycle policy.' };
    }
    return { authorized: true, reason: 'Verified signed tenant claim and active membership.' };
  }

  public async requireVerifiedSession(
    session: UserContext | null | undefined,
    action: string,
    targetTenantId?: string,
  ): Promise<{ authenticated: boolean; authorized: boolean; status: 'BLOCKED' | 'AUTHENTICATED'; reason: string }> {
    const decision = await this.authorize(session, action, targetTenantId);
    return {
      authenticated: Boolean(session?.signed_token && decision.authorized),
      authorized: decision.authorized,
      status: decision.authorized ? 'AUTHENTICATED' : 'BLOCKED',
      reason: decision.reason,
    };
  }
}
