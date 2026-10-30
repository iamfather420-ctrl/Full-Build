import { createHmac, timingSafeEqual } from 'node:crypto';

export type SovereignRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';

export interface UserContext {
  user_id: string;
  tenant_id: string;
  email: string;
  role: SovereignRole;
  issued_at: number;
}

interface LocalSessionPayload extends UserContext {
  iss: 'daisy-local-auth';
  aud: 'solvex-enterprise';
  exp: number;
}

const ALLOWED_ROLES = new Set<SovereignRole>(['OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER']);

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decode(value: string): unknown {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

/**
 * First-party session boundary.
 *
 * The local HS256 issuer is restricted to isolated verification/test runs.
 * Production remains fail-closed until the production key-management and
 * account-authentication flow is separately configured and reviewed.
 */
export class AuthService {
  private static instance: AuthService | null = null;
  private readonly verifiedContexts = new WeakSet<object>();
  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  private getLocalSecret(): string {
    const secret = process.env.SOVEREIGN_AUTH_SECRET || '';
    if (secret.length < 32) throw new Error('BLOCKED: SOVEREIGN_AUTH_SECRET must contain at least 32 characters.');
    return secret;
  }

  private localModeAllowed(): boolean {
    return process.env.NODE_ENV !== 'production' && process.env.AUTH_MODE === 'local_hs256';
  }

  public createSignedToken(userId: string, tenantId: string, email: string, role: SovereignRole): string {
    if (!this.localModeAllowed()) {
      throw new Error('BLOCKED: local HS256 token issuance is restricted to isolated verification runs.');
    }
    if (!userId.trim() || !tenantId.trim() || !email.trim() || !ALLOWED_ROLES.has(role)) {
      throw new Error('BLOCKED: incomplete or invalid local identity claims.');
    }
    const now = Math.floor(Date.now() / 1000);
    const payload: LocalSessionPayload = {
      iss: 'daisy-local-auth',
      aud: 'solvex-enterprise',
      user_id: userId,
      tenant_id: tenantId,
      email,
      role,
      issued_at: now,
      exp: now + 15 * 60
    };
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const body = encode(payload);
    const signingInput = header + '.' + body;
    const signature = createHmac('sha256', this.getLocalSecret()).update(signingInput).digest('base64url');
    return signingInput + '.' + signature;
  }

  public verifyToken(token: string): { valid: boolean; user?: UserContext; error?: string } {
    if (!this.localModeAllowed()) {
      return { valid: false, error: 'BLOCKED: no configured production identity verifier is available.' };
    }
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false, error: 'BLOCKED: malformed session token.' };
      const [headerPart, payloadPart, signaturePart] = parts;
      const header = decode(headerPart) as Record<string, unknown>;
      if (header.alg !== 'HS256' || header.typ !== 'JWT') {
        return { valid: false, error: 'BLOCKED: unsupported session token algorithm.' };
      }
      const expected = createHmac('sha256', this.getLocalSecret())
        .update(headerPart + '.' + payloadPart)
        .digest();
      const supplied = Buffer.from(signaturePart, 'base64url');
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
        return { valid: false, error: 'BLOCKED: session signature is invalid.' };
      }
      const payload = decode(payloadPart) as Partial<LocalSessionPayload>;
      const now = Math.floor(Date.now() / 1000);
      if (
        payload.iss !== 'daisy-local-auth' ||
        payload.aud !== 'solvex-enterprise' ||
        typeof payload.user_id !== 'string' || !payload.user_id ||
        typeof payload.tenant_id !== 'string' || !payload.tenant_id ||
        typeof payload.email !== 'string' || !payload.email ||
        typeof payload.issued_at !== 'number' ||
        typeof payload.exp !== 'number' ||
        payload.issued_at > now + 60 ||
        payload.exp <= now ||
        payload.exp <= payload.issued_at ||
        !ALLOWED_ROLES.has(payload.role as SovereignRole)
      ) {
        return { valid: false, error: 'BLOCKED: session claims are incomplete, expired, or invalid.' };
      }
      const user: UserContext = {
        user_id: payload.user_id,
        tenant_id: payload.tenant_id,
        email: payload.email,
        role: payload.role as SovereignRole,
        issued_at: payload.issued_at
      };
      this.verifiedContexts.add(user);
      return { valid: true, user };
    } catch {
      return { valid: false, error: 'BLOCKED: session token could not be verified.' };
    }
  }

  public authorize(user: UserContext | null | undefined, action: string, targetTenantId?: string): { authorized: boolean; reason: string } {
    if (!user || !this.verifiedContexts.has(user)) {
      return { authorized: false, reason: 'BLOCKED: verified identity and signed tenant claims are required.' };
    }
    if (targetTenantId && user.tenant_id !== targetTenantId) {
      return { authorized: false, reason: 'BLOCKED: verified identity is not authorized for this tenant.' };
    }
    if (action !== 'ORDER_TRANSITION' || !['OWNER', 'ADMIN'].includes(user.role)) {
      return { authorized: false, reason: 'BLOCKED: role is not authorized for this operation.' };
    }
    return { authorized: true, reason: 'AUTHORIZED: verified first-party session and tenant scope.' };
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
