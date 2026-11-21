import { ProofBundleEntity, computeSha256 } from '../database/DatabaseSchema';
import { ProofEngine } from '../proofs/ProofEngine';

export interface CustomerEvidenceView {
  proof_id: string;
  claim: string;
  claim_hash: string;
  verification_verdict: string;
  proprietary_weights_redacted: boolean;
  internal_reasoning_redacted: boolean;
  public_audit_token: string;
  verified_tests_count: number;
  formal_proofs_count: number;
  oracle_attestations_count: number;
  replay_verification_status: string;
  evidence_statements: string[];
  reproducibility_instructions: string;
  timestamp: number;
}

const SHA256_HEX = /^[a-f0-9]{64}$/i;

export class CrystalClearBox {
  public static projectCustomerEvidence(bundle: ProofBundleEntity): CustomerEvidenceView {
    if (!bundle || bundle.verification_status !== 'VERIFIED') {
      throw new Error('Customer evidence projection requires a VERIFIED proof bundle.');
    }
    const integrity = ProofEngine.getInstance().verifyBundleIntegrity(bundle);
    if (!integrity.verified) {
      throw new Error(`Customer evidence projection rejected: ${integrity.reasons.join('; ')}`);
    }
    if (!bundle.claim || !SHA256_HEX.test(bundle.claim_hash || '') ||
        computeSha256(bundle.claim) !== bundle.claim_hash) {
      throw new Error('Customer evidence projection rejected: claim hash is invalid.');
    }

    const replayVerified = Array.isArray(bundle.replay_results) && bundle.replay_results.length > 0 &&
      bundle.replay_results.every(r => r.status === 'MATCH' &&
        SHA256_HEX.test(r.expected_hash || '') &&
        r.expected_hash === r.observed_hash);
    if (!replayVerified) throw new Error('Customer evidence projection rejected: deterministic replay is not verified.');

    // This digest is a public content identifier, NOT a digital signature or
    // proof of authorship. Only allowlisted fields leave the trust boundary.
    const publicToken = computeSha256(
      JSON.stringify({
        proof_id: bundle.proof_id,
        claim_hash: bundle.claim_hash,
        verification_verdict: bundle.verification_status,
        timestamp: bundle.timestamp
      })
    );

    return {
      proof_id: bundle.proof_id,
      claim: bundle.claim,
      claim_hash: bundle.claim_hash,
      verification_verdict: bundle.verification_status,
      proprietary_weights_redacted: true,
      internal_reasoning_redacted: true,
      public_audit_token: publicToken,
      verified_tests_count: Array.isArray(bundle.tests) ? bundle.tests.filter(t => t.passed).length : 0,
      formal_proofs_count: Array.isArray(bundle.formal_proofs) ? bundle.formal_proofs.filter(f => f.checked).length : 0,
      oracle_attestations_count: Array.isArray(bundle.independent_oracles) ? bundle.independent_oracles.filter(o => o.verified).length : 0,
      replay_verification_status: 'DETERMINISTIC_MATCH_CONFIRMED',
      // Arbitrary evidence strings and instructions are untrusted and may
      // contain private reasoning, weights, credentials, or tenant data.
      evidence_statements: [],
      reproducibility_instructions: 'Request the source-bound proof manifest from the authorized verifier. This public view intentionally omits private evidence and execution details.',
      timestamp: bundle.timestamp
    };
  }
}
