import { randomBytes } from 'node:crypto';
import { computeSha256 } from '../database/DatabaseSchema';

interface AuthorizationTokenRecord {
  role: string;
  capability: string;
  tenantId: string;
  operation?: string;
  created: number;
}

export class MMTAIProtocol {
  private static instance: MMTAIProtocol | null = null;
  private activeTokens: Map<string, AuthorizationTokenRecord> = new Map();
  private consumedTokens: Set<string> = new Set();
  private static readonly SCOPED_TOKEN_TTL_MS = 30_000;

  private constructor() {}

  public static getInstance(): MMTAIProtocol {
    if (!MMTAIProtocol.instance) MMTAIProtocol.instance = new MMTAIProtocol();
    return MMTAIProtocol.instance;
  }

  private assertRoleCapability(role: string, capability: string): void {
    if (role === 'ROLE_VERIFIER' && capability === 'CAP_PERSISTENCE_MUTATE') {
      throw new Error(`Authority Violation: Role ${role} is barred from executing ${capability}. Invariant [CAPABILITY != AUTHORITY] enforced.`);
    }
    if (capability === 'CAP_BITCOIN_BLOCK_READ_VERIFY' && role !== 'ROLE_BLOCKCHAIN_VERIFIER') {
      throw new Error('Authority Violation: Bitcoin read/verify capability requires ROLE_BLOCKCHAIN_VERIFIER.');
    }
  }

  private createToken(record: AuthorizationTokenRecord): string {
    const token = computeSha256(randomBytes(32).toString('hex'));
    this.activeTokens.set(token, record);
    return token;
  }

  /** Legacy unscoped token API retained for existing callers. Do not use for new privileged operations. */
  public issueAuthorizationToken(role: string, capability: string, tenantId: string): string {
    this.assertRoleCapability(role, capability);
    return this.createToken({ role, capability, tenantId, created: Date.now() });
  }

  /**
   * Issues a short-lived, single-use token bound to one exact operation string.
   * The operation must contain every resource/range parameter that the caller intends to authorize.
   */
  public issueScopedAuthorizationToken(role: string, capability: string, tenantId: string, operation: string): string {
    this.assertRoleCapability(role, capability);
    if (!tenantId.trim() || !operation.trim() || operation.length > 512) {
      throw new Error('Scoped authorization requires a tenant and a non-empty operation of at most 512 characters.');
    }
    return this.createToken({ role, capability, tenantId, operation, created: Date.now() });
  }

  public authorizeExecution(
    capability: string,
    role: string,
    token: string,
    operation: string,
    tenantId: string
  ): { permitted: boolean; error?: string } {
    if (this.consumedTokens.has(token)) {
      return { permitted: false, error: 'Replay Attack Blocked: single-use token was previously consumed.' };
    }
    const record = this.activeTokens.get(token);
    if (!record) return { permitted: false, error: 'Invalid or expired authorization token' };
    if (record.operation !== undefined) {
      this.activeTokens.delete(token);
      this.consumedTokens.add(token);
      return { permitted: false, error: 'Scoped token requires authorizeScopedExecution; legacy authorization is prohibited.' };
    }
    if (record.role !== role || record.capability !== capability || record.tenantId !== tenantId) {
      return { permitted: false, error: 'Token context mismatch' };
    }
    this.activeTokens.delete(token);
    this.consumedTokens.add(token);
    return { permitted: true };
  }

  /** Consumes the token on its first authorization attempt, including mismatched attempts. */
  public authorizeScopedExecution(
    capability: string,
    role: string,
    token: string,
    operation: string,
    tenantId: string
  ): { permitted: boolean; error?: string } {
    if (this.consumedTokens.has(token)) {
      return { permitted: false, error: 'Replay Attack Blocked: scoped single-use token was previously consumed.' };
    }
    const record = this.activeTokens.get(token);
    if (!record) return { permitted: false, error: 'Invalid or expired scoped authorization token' };

    this.activeTokens.delete(token);
    this.consumedTokens.add(token);

    if (Date.now() - record.created > MMTAIProtocol.SCOPED_TOKEN_TTL_MS) {
      return { permitted: false, error: 'Scoped authorization token expired.' };
    }
    if (record.operation === undefined || record.operation !== operation) {
      return { permitted: false, error: 'Scoped operation mismatch.' };
    }
    if (record.role !== role || record.capability !== capability || record.tenantId !== tenantId) {
      return { permitted: false, error: 'Scoped token context mismatch.' };
    }
    return { permitted: true };
  }
}