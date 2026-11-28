import { createHash, createPublicKey, verify } from 'node:crypto';

export interface OracleAttestation {
  oracleId: string;
  modelId: string;
  inputSha256: string;
  verdict: 'ACCEPT' | 'REJECT';
  rationaleSha256: string;
  rationale: string;
  signature: string;
}

/**
 * Hash the canonical input envelope for a future first-party independent
 * verifier. No remote evaluator is contacted by this module.
 */
export function computeOracleInputSha256(input: unknown): string {
  const payload = JSON.stringify({ protocol: 'solvex-first-party-independent-oracle-v1', input });
  return createHash('sha256').update(payload).digest('hex');
}

export class IndependentModelOracle {
  static verifyAttestation(
    attestation: OracleAttestation,
    expectedOracleId: string,
    expectedInputSha: string,
    publicKeyPem: string,
  ): boolean {
    try {
      const canonical = [
        attestation.oracleId,
        attestation.modelId,
        attestation.inputSha256,
        attestation.verdict,
        attestation.rationaleSha256,
      ].join('\n');
      const signature = Buffer.from(attestation.signature, 'base64');
      return attestation.oracleId === expectedOracleId &&
        Boolean(attestation.modelId) &&
        attestation.inputSha256 === expectedInputSha &&
        ['ACCEPT', 'REJECT'].includes(attestation.verdict) &&
        /^[a-f0-9]{64}$/.test(attestation.rationaleSha256) &&
        typeof attestation.rationale === 'string' &&
        attestation.rationale.length > 0 &&
        createHash('sha256').update(attestation.rationale).digest('hex') === attestation.rationaleSha256 &&
        signature.length === 64 &&
        (() => {
          const key = createPublicKey(publicKeyPem);
          return key.asymmetricKeyType === 'ed25519' &&
            verify(null, Buffer.from(canonical), key, signature);
        })();
    } catch {
      return false;
    }
  }

  /**
   * Stage 14 is intentionally unavailable until a first-party independent
   * verifier and its trust root are implemented and tested. Third-party AI
   * evaluators are prohibited by project policy; this method performs no I/O.
   */
  static async verify(_input: unknown): Promise<OracleAttestation> {
    throw new Error(
      'FIRST_PARTY_ORACLE_UNAVAILABLE: no first-party independent evaluator and trusted verification root are implemented. External AI providers are prohibited; no network request was made.',
    );
  }
}
