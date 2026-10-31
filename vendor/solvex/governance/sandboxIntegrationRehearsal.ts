import { computeSha256 } from '../database/DatabaseSchema';
import { assertPublicEd25519 } from '../auth/installHumanRoot';
import { verifyClaims } from '../auth/VerifiedHumanSession';
import { productionIntegrationPermitted } from './HumanApprovalGate';

export interface SignedClaims {
  claims: Record<string, string | number>;
  signature: string;
}

export interface SandboxAttempt {
  ok: boolean;
  reason: string;
  hash: string | null;
}

/**
 * In-memory sandbox slot. It has no production credentials and cannot open the production switch.
 */
export class SandboxRehearsal {
  private current: string | null = null;
  private good: string | null = null;
  private readonly seen = new Set<string>();
  readonly switchSamples: boolean[] = [];
  readonly environment = 'sandbox' as const;
  readonly productionCredentials = false;

  constructor(private readonly publicKeyPem: string) {}

  private sample(): void {
    this.switchSamples.push(productionIntegrationPermitted());
  }

  private verify(token: SignedClaims, now: number): string | null {
    if (token.claims.environment !== 'sandbox' || token.claims.production !== 'false') return 'BLOCKED: rehearsal claims must stay in the sandbox.';
    if (typeof token.claims.issued_at !== 'number' || typeof token.claims.expires_at !== 'number') return 'BLOCKED: rehearsal lifetime is missing.';
    if (token.claims.expires_at <= token.claims.issued_at || token.claims.expires_at - token.claims.issued_at > 15 * 60 * 1000) return 'BLOCKED: rehearsal lifetime is invalid.';
    if (now < token.claims.issued_at || now >= token.claims.expires_at) return 'BLOCKED: rehearsal signature has expired.';
    let publicKey = '';
    try {
      publicKey = assertPublicEd25519(this.publicKeyPem);
    } catch (error) {
      return error instanceof Error ? error.message : 'BLOCKED: operator public key rejected.';
    }
    if (!verifyClaims(publicKey, token.claims, token.signature)) return 'BLOCKED: operator signature did not verify.';
    return null;
  }

  public deploy(input: { source: string; candidate: SignedClaims; integration: SignedClaims; now: number }): SandboxAttempt {
    this.sample();
    const candidateError = this.verify(input.candidate, input.now);
    if (candidateError) return { ok: false, reason: candidateError, hash: this.hash() };
    const integrationError = this.verify(input.integration, input.now);
    if (integrationError) return { ok: false, reason: integrationError, hash: this.hash() };
    if (input.candidate.claims.typ !== 'solvex-sandbox-candidate-v1') return { ok: false, reason: 'BLOCKED: candidate token has the wrong type.', hash: this.hash() };
    if (input.integration.claims.typ !== 'solvex-sandbox-integration-v1' || input.integration.claims.procedure !== 'SANDBOX_INTEGRATION_REHEARSAL_V1') {
      return { ok: false, reason: 'BLOCKED: integration token is not a separate sandbox rehearsal approval.', hash: this.hash() };
    }
    if (input.integration.claims.production_credentials !== 'false') return { ok: false, reason: 'BLOCKED: production credentials are not allowed.', hash: this.hash() };
    if (input.candidate.signature === input.integration.signature || input.candidate.claims.nonce === input.integration.claims.nonce) {
      return { ok: false, reason: 'BLOCKED: the integration approval must be a separate signature.', hash: this.hash() };
    }
    if (input.integration.claims.candidate_nonce !== input.candidate.claims.nonce) {
      return { ok: false, reason: 'BLOCKED: integration approval is not bound to this candidate signature.', hash: this.hash() };
    }
    const nonce = String(input.integration.claims.nonce);
    if (this.seen.has(nonce)) return { ok: false, reason: 'BLOCKED: rehearsal replay was rejected.', hash: this.hash() };
    const expected = computeSha256(input.source);
    if (input.candidate.claims.content_sha256 !== expected || input.integration.claims.content_sha256 !== expected) {
      return { ok: false, reason: 'BLOCKED: signed hash does not match the artifact.', hash: this.hash() };
    }
    this.seen.add(nonce);
    this.current = input.source;
    this.good = input.source;
    return { ok: true, reason: 'Sandbox artifact stored.', hash: this.hash() };
  }

  public hash(): string | null {
    return this.current === null ? null : computeSha256(this.current);
  }

  public corrupt(): void {
    this.sample();
    if (this.current !== null) this.current = `${this.current}\nCORRUPT`;
  }

  public rollback(): boolean {
    this.sample();
    if (this.good === null) return false;
    this.current = this.good;
    return true;
  }

  public switchRemainedFalse(): boolean {
    return this.switchSamples.length > 0 && this.switchSamples.every((value) => value === false);
  }
}
