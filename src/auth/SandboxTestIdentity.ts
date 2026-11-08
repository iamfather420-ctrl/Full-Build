import { createHmac, timingSafeEqual } from 'node:crypto';

export type SandboxRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';

export interface SandboxTestClaims {
  sub: string;
  tenant_id: string;
  email: string;
  role: SandboxRole;
  iss: 'full-build-sandbox-test';
  iat: number;
  exp: number;
}

/**
 * Explicitly opt-in, non-production test identity for integration tests only.
 * It is not an OIDC replacement and is never accepted by production auth.
 */
export class SandboxTestIdentity {
  private static readonly ISSUER = 'full-build-sandbox-test';
  private static readonly MAX_TTL_SECONDS = 15 * 60;

  private static enabled(): boolean {
    return process.env.SOLVEX_ENV === 'sandbox'
      && process.env.FULL_BUILD_TEST_AUTH === 'true'
      && process.env.NODE_ENV !== 'production';
  }

  private static secret(): string {
    const secret = process.env.FULL_BUILD_TEST_AUTH_SECRET || '';
    if (secret.length < 32) {
      throw new Error('Sandbox test auth requires a dedicated secret of at least 32 characters.');
    }
    return secret;
  }

  private static signature(payload: string): Buffer {
    return createHmac('sha256', this.secret()).update(payload).digest();
  }

  static issue(input: {
    userId: string;
    tenantId: string;
    email: string;
    role: SandboxRole;
    ttlSeconds?: number;
  }): string {
    if (!this.enabled()) throw new Error('Sandbox test identity is disabled outside explicit non-production sandbox mode.');
    const ttl = Math.min(Math.max(input.ttlSeconds ?? 300, 1), this.MAX_TTL_SECONDS);
    if (!input.userId || !input.tenantId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) {
      throw new Error('Sandbox test identity claims are incomplete or invalid.');
    }
    const now = Math.floor(Date.now() / 1000);
    const claims: SandboxTestClaims = {
      sub: input.userId,
      tenant_id: input.tenantId,
      email: input.email,
      role: input.role,
      iss: this.ISSUER,
      iat: now,
      exp: now + ttl
    };
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signature = this.signature(payload).toString('base64url');
    return payload + '.' + signature;
  }

  static verify(token: string): { valid: true; claims: SandboxTestClaims } | { valid: false; reason: string } {
    if (!this.enabled()) return { valid: false, reason: 'Sandbox test identity is disabled.' };
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return { valid: false, reason: 'Malformed sandbox test token.' };
      const [payload, encodedSignature] = parts;
      const expected = this.signature(payload);
      const actual = Buffer.from(encodedSignature, 'base64url');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        return { valid: false, reason: 'Invalid sandbox test token signature.' };
      }
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SandboxTestClaims;
      const now = Math.floor(Date.now() / 1000);
      if (claims.iss !== this.ISSUER || !claims.sub || !claims.tenant_id || !claims.email
        || !['OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER'].includes(claims.role)
        || !Number.isInteger(claims.iat) || !Number.isInteger(claims.exp)
        || claims.exp <= now || claims.iat > now + 30
        || claims.exp - claims.iat > this.MAX_TTL_SECONDS) {
        return { valid: false, reason: 'Sandbox test token claims are invalid or expired.' };
      }
      return { valid: true, claims };
    } catch {
      return { valid: false, reason: 'Sandbox test token could not be verified.' };
    }
  }

  static authorize(token: string, action: string, targetTenantId?: string): {
    authenticated: boolean; authorized: boolean; status: 'AUTHENTICATED' | 'BLOCKED'; reason: string;
  } {
    const verified = this.verify(token);
    if (!verified.valid) {
      return { authenticated: false, authorized: false, status: 'BLOCKED', reason: verified.reason };
    }
    if (targetTenantId && verified.claims.tenant_id !== targetTenantId) {
      return { authenticated: true, authorized: false, status: 'BLOCKED', reason: 'Sandbox tenant boundary rejected cross-tenant access.' };
    }
    const permissions: Record<SandboxRole, string[]> = {
      OWNER: ['*'],
      ADMIN: ['READ_SYSTEM', 'MANAGE_TENANTS', 'RUN_PIPELINE', 'READ_AUDIT'],
      VERIFIER: ['READ_SYSTEM', 'READ_AUDIT', 'VERIFY_PROOFS'],
      CUSTOMER: ['READ_SYSTEM', 'CREATE_ORDER']
    };
    const allowed = permissions[verified.claims.role];
    const authorized = allowed.includes('*') || allowed.includes(action);
    return {
      authenticated: true,
      authorized,
      status: authorized ? 'AUTHENTICATED' : 'BLOCKED',
      reason: authorized ? 'Sandbox test identity authorized.' : 'Sandbox test role does not permit this action.'
    };
  }
}
