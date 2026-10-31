export type SovereignRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';

export interface UserContext {
  user_id: string;
  tenant_id: string;
  email: string;
  role: SovereignRole;
  issued_at: number;
}

/**
 * Fail-closed auth boundary. Production identity verification must be supplied
 * by the approved OIDC issuer and signed-claim verifier before sessions exist.
 * This module deliberately does not mint local tokens or contain a static key.
 */
export class AuthService {
  private static instance: AuthService | null = null;
  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  public createSignedToken(_userId: string, _tenantId: string, _email: string, _role: SovereignRole): string {
    throw new Error('BLOCKED: local token issuance is disabled; use the approved OIDC issuer.');
  }

  public verifyToken(_token: string): { valid: boolean; user?: UserContext; error?: string } {
    return { valid: false, error: 'BLOCKED: no configured production OIDC verifier is available.' };
  }

  public authorize(_user: UserContext | null | undefined, _action: string, _targetTenantId?: string): { authorized: boolean; reason: string } {
    return { authorized: false, reason: 'BLOCKED: verified identity and signed tenant claims are required.' };
  }
}
