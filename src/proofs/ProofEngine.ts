import { ProofBundleEntity, computeSha256 } from '../database/DatabaseSchema';
import { DurableStore } from '../database/DurableStore';

const SHA256_HEX = /^[a-f0-9]{64}$/i;

export class ProofEngine {
  private static instance: ProofEngine | null = null;
  private bundles: Map<string, ProofBundleEntity> = new Map();

  private constructor() {
    const persisted = DurableStore.getInstance().getState().proof_bundles;
    for (const [id, bundle] of Object.entries(persisted)) this.bundles.set(id, bundle);
  }

  public static getInstance(): ProofEngine {
    if (!ProofEngine.instance) ProofEngine.instance = new ProofEngine();
    return ProofEngine.instance;
  }

  public getBundle(proofId: string): ProofBundleEntity | undefined {
    return this.bundles.get(proofId);
  }

  public getAllBundles(): ProofBundleEntity[] {
    return Array.from(this.bundles.values());
  }

  public registerBundle(bundle: ProofBundleEntity): void {
    if (!bundle || typeof bundle.proof_id !== 'string' || !bundle.proof_id.trim()) {
      throw new Error('A proof bundle requires a non-empty proof_id.');
    }
    this.bundles.set(bundle.proof_id, bundle);
    const store = DurableStore.getInstance();
    store.getState().proof_bundles[bundle.proof_id] = bundle;
    store.persist();
  }

  /**
   * Structural integrity gate only. Boolean flags are never sufficient:
   * content hashes, claim binding, non-empty source references, and replay
   * equality are independently recomputed here. Oracle authenticity still
   * requires a separately configured trusted-key verifier.
   */
  public verifyBundleIntegrity(bundle: ProofBundleEntity): { verified: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (!bundle || typeof bundle !== 'object') {
      return { verified: false, reasons: ['Missing proof bundle'] };
    }

    if (!bundle.proof_id || !bundle.subject_id) reasons.push('Missing proof or subject identity');
    if (!bundle.claim || typeof bundle.claim !== 'string') reasons.push('Missing claim text');
    if (!SHA256_HEX.test(bundle.claim_hash || '') || bundle.claim_hash !== computeSha256(bundle.claim || '')) {
      reasons.push('Claim hash is missing, malformed, or does not match claim text');
    }
    if (!Array.isArray(bundle.source_references) || bundle.source_references.length === 0 ||
        bundle.source_references.some(ref => typeof ref !== 'string' || !ref.trim())) {
      reasons.push('Missing source-bound references');
    }
    if (!SHA256_HEX.test(bundle.implementation_hash || '')) reasons.push('Invalid implementation SHA-256');
    if (!SHA256_HEX.test(bundle.environment_hash || '')) reasons.push('Invalid environment SHA-256');
    if (!SHA256_HEX.test(bundle.dependency_hash || '')) reasons.push('Invalid dependency SHA-256');
    if (!Number.isFinite(bundle.timestamp) || bundle.timestamp <= 0) reasons.push('Invalid proof timestamp');
    if (!bundle.verifier_identity || !bundle.verifier_identity.trim()) reasons.push('Missing verifier identity');

    if (!Array.isArray(bundle.tests) || bundle.tests.length === 0) {
      reasons.push('Zero empirical tests provided');
    } else {
      for (const test of bundle.tests) {
        if (!test.passed) reasons.push('One or more empirical tests failed');
        if (!SHA256_HEX.test(test.receipt_hash || '')) reasons.push('Empirical test receipt hash missing or invalid');
      }
    }

    if (!Array.isArray(bundle.formal_proofs) || bundle.formal_proofs.length === 0) {
      reasons.push('Zero machine-checked formal proofs');
    } else {
      for (const proof of bundle.formal_proofs) {
        if (!proof.checked) reasons.push('One or more formal proof terms failed verification');
        if (!SHA256_HEX.test(proof.proof_term_hash || '')) reasons.push('Formal proof term hash missing or invalid');
        if (!proof.system?.trim() || !proof.specification?.trim()) reasons.push('Formal proof system or specification missing');
      }
    }

    if (!Array.isArray(bundle.independent_oracles) || bundle.independent_oracles.length === 0) {
      reasons.push('Missing independent oracle attestation');
    } else {
      for (const oracle of bundle.independent_oracles) {
        if (!oracle.verified) reasons.push('One or more oracle attestations rejected');
        if (!SHA256_HEX.test(oracle.attestation_hash || '')) reasons.push('Oracle attestation hash missing or invalid');
        if (!oracle.oracle_id?.trim() || !oracle.name?.trim() || !oracle.method?.trim()) reasons.push('Oracle identity or method missing');
      }
      reasons.push('Oracle signatures require verification against configured trusted keys');
    }

    if (!Array.isArray(bundle.replay_results) || bundle.replay_results.length === 0) {
      reasons.push('Missing deterministic replay runs');
    } else {
      for (const replay of bundle.replay_results) {
        if (replay.status !== 'MATCH' || !SHA256_HEX.test(replay.expected_hash || '') ||
            !SHA256_HEX.test(replay.observed_hash || '') || replay.expected_hash !== replay.observed_hash) {
          reasons.push('Replay trace is missing, malformed, or divergent');
          break;
        }
      }
    }

    if (bundle.verification_status !== 'VERIFIED') reasons.push('Bundle status is not VERIFIED');
    return { verified: reasons.length === 0, reasons: Array.from(new Set(reasons)) };
  }
}
