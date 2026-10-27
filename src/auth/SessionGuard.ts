export interface SessionContext {
  user_id: string;
  tenant_id: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';
  issued_at: number;
}

export interface SessionDecision {
  authenticated: boolean;
  authorized: boolean;
  status: 'BLOCKED' | 'UNAVAILABLE' | 'AUTHENTICATED';
  reason: string;
  session?: SessionContext;
}

export class SessionGuard {
  public static requireVerifiedSession(session: SessionContext | null | undefined, action: string, targetTenantId?: string): SessionDecision {
    if (!session) {
      return {
        authenticated: false,
        authorized: false,
        status: 'BLOCKED',
        reason: `BLOCKED: no verified session for action "${action}". First-party identity and tenant verification are not yet implemented.`
      };
    }

    if (!session.user_id || !session.tenant_id || !session.email) {
      return {
        authenticated: false,
        authorized: false,
        status: 'BLOCKED',
        reason: 'BLOCKED: session is partial or malformed; no production authentication boundary is configured.'
      };
    }

    if (targetTenantId && session.tenant_id !== targetTenantId) {
      return {
        authenticated: true,
        authorized: false,
        status: 'BLOCKED',
        reason: 'BLOCKED: tenant mismatch; first-party authorization checks are not enabled for cross-tenant access.',
        session
      };
    }

    return {
      authenticated: false,
      authorized: false,
      status: 'BLOCKED',
      reason: 'BLOCKED: verified first-party session enforcement is not available in this source tree yet.',
      session
    };
  }

  public static isReadOnlyAllowed(_session: SessionContext | null | undefined): SessionDecision {
    return {
      authenticated: false,
      authorized: false,
      status: 'BLOCKED',
      reason: 'BLOCKED: no verified first-party session manager is configured for read/write access. Public health/status reads remain the only authorized operation.'
    };
  }
}
