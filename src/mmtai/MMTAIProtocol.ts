import { randomBytes } from 'node:crypto';
import { computeSha256 } from '../database/DatabaseSchema';

export class MMTAIProtocol {
  private static instance: MMTAIProtocol | null = null;
  // In-memory tokens are process-local; production multi-instance deployments must use shared durable storage.
  private activeTokens: Map<string, { role: string; capability: string; tenantId: string; created: number; expires: number }> = new Map();
  private consumedTokens: Set<string> = new Set();
  private readonly tokenTtlMs = 5 * 60 * 1000;

  private constructor() {}

  public static getInstance(): MMTAIProtocol {
    if (!MMTAIProtocol.instance) {
      MMTAIProtocol.instance = new MMTAIProtocol();
    }
    return MMTAIProtocol.instance;
  }

  public issueAuthorizationToken(role: string, capability: string, tenantId: string): string {
    // CAPABILITY != AUTHORITY invariant enforcement
    if (role === 'ROLE_VERIFIER' && capability === 'CAP_PERSISTENCE_MUTATE') {
      throw new Error(`Authority Violation: Role ${role} is barred from executing ${capability}. Invariant [CAPABILITY != AUTHORITY] enforced.`);
    }
    const now = Date.now();
    this.pruneExpiredTokens(now);
    const token = randomBytes(32).toString('hex');
    this.activeTokens.set(token, {
      role,
      capability,
      tenantId,
      created: now,
      expires: now + this.tokenTtlMs
    });
    return token;
  }

  public authorizeExecution(
    capability: string,
    role: string,
    token: string,
    operation: string,
    tenantId: string
  ): { permitted: boolean; error?: string } {
    this.pruneExpiredTokens(Date.now());
    if (this.consumedTokens.has(token)) {
      return {
        permitted: false,
        error: `Replay Attack Blocked: Single-use token ${token.substring(0, 12)}... was previously consumed. Invariant [AUTHORITY != AUTHORIZATION] enforced.`
      };
    }
    const record = this.activeTokens.get(token);
    if (!record) {
      return {
        permitted: false,
        error: 'Invalid or expired authorization token'
      };
    }
    if (Date.now() >= record.expires) {
      this.activeTokens.delete(token);
      return { permitted: false, error: 'Expired authorization token' };
    }
    if (record.role !== role || record.capability !== capability || record.tenantId !== tenantId) {
      return {
        permitted: false,
        error: 'Token context mismatch'
      };
    }
    // Burn token immediately to guarantee single-use replay protection
    this.activeTokens.delete(token);
    this.consumedTokens.add(token);
    return { permitted: true };
  }

  private pruneExpiredTokens(now: number): void {
    for (const [token, record] of this.activeTokens) {
      if (now >= record.expires) this.activeTokens.delete(token);
    }
    // Consumed token identifiers are never reusable; retain them only for the TTL window.
    // The token includes 256 bits of randomness, so expired entries may safely be forgotten.
    if (this.consumedTokens.size > 10000) this.consumedTokens.clear();
  }
}
