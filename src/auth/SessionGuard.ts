import { AuthService, UserContext } from './AuthService';

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
        authenticated: false, authorized: false, status: 'BLOCKED',
        reason: `BLOCKED: no verified session for action "${action}".`
      };
    }
    const decision = AuthService.getInstance().requireVerifiedSession(session as UserContext, action, targetTenantId);
    return { ...decision, session };
  }

  public static isReadOnlyAllowed(session: SessionContext | null | undefined): SessionDecision {
    return this.requireVerifiedSession(session, 'READ_SYSTEM');
  }
}
