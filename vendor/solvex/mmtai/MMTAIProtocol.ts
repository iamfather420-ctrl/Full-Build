import { computeSha256 } from '../database/DatabaseSchema';

export class MMTAIProtocol {
  private static instance: MMTAIProtocol | null = null;
  private activeTokens: Map<string, { role: string; capability: string; tenantId: string; created: number }> = new Map();
  private consumedTokens: Set<string> = new Set();

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
    const nonce = `${Date.now()}_${Math.random()}_${role}_${capability}_${tenantId}`;
    const token = computeSha256(nonce);
    this.activeTokens.set(token, {
      role,
      capability,
      tenantId,
      created: Date.now()
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
}
