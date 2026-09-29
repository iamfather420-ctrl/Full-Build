import { ProofBundleEntity } from '../database/DatabaseSchema';
import { DurableStore } from '../database/DurableStore';
import { SqliteStore } from '../database/SqliteStore';

/** Proof storage accepts only independently established VERIFIED bundles. */
export class ProofEngine {
  private static instance: ProofEngine | null = null;
  private readonly bundles = new Map<string, ProofBundleEntity>();

  private constructor() {
    const persisted = SqliteStore.getInstance().findAllRecords<ProofBundleEntity>('proof_bundles', 1000);
    for (const bundle of persisted) this.bundles.set(bundle.proof_id, bundle);
  }

  public static getInstance(): ProofEngine {
    if (!ProofEngine.instance) ProofEngine.instance = new ProofEngine();
    return ProofEngine.instance;
  }

  public getBundle(proofId: string): ProofBundleEntity | undefined { return this.bundles.get(proofId); }
  public getAllBundles(): ProofBundleEntity[] { return [...this.bundles.values()]; }

  public registerBundle(bundle: ProofBundleEntity, tenantId: string): void {
    const integrity = this.verifyBundleIntegrity(bundle);
    if (bundle.verification_status !== 'VERIFIED' || !integrity.verified) {
      throw new Error(`Refusing proof bundle registration: ${integrity.reasons.join('; ') || 'bundle is not independently VERIFIED'}`);
    }
    SqliteStore.getInstance().transaction(() => {
      SqliteStore.getInstance().insertRecord('proof_bundles', { ...bundle, id: bundle.proof_id, tenant_id: tenantId, status: 'VERIFIED' });
      this.bundles.set(bundle.proof_id, bundle);
      const durable = DurableStore.getInstance();
      durable.getState().proof_bundles[bundle.proof_id] = bundle;
      durable.appendAudit(tenantId, bundle.verifier_identity, 'PROOF_BUNDLE_REGISTERED', 'PROOF_BUNDLE', bundle.proof_id, { subject_id: bundle.subject_id, implementation_hash: bundle.implementation_hash, claim_hash: bundle.claim_hash });
      durable.persist();
    });
  }

  public verifyBundleIntegrity(bundle: ProofBundleEntity): { verified: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (bundle.verification_status !== 'VERIFIED') reasons.push('Bundle status is not VERIFIED');
    if (!bundle.subject_id || !bundle.claim_hash || !bundle.implementation_hash) reasons.push('Missing subject, claim, or implementation binding');
    if (!bundle.tests?.length || bundle.tests.some(t => !t.passed || !t.receipt_hash)) reasons.push('Missing executed empirical test receipts');
    if (!bundle.formal_proofs?.length || bundle.formal_proofs.some(p => !p.checked || !p.proof_term_hash)) reasons.push('Missing machine-checked formal proof receipt');
    if (!bundle.independent_oracles?.length || bundle.independent_oracles.some(o => !o.verified || !o.attestation_hash)) reasons.push('Missing independent verifier attestation');
    if (!bundle.replay_results?.length || bundle.replay_results.some(r => r.status !== 'MATCH')) reasons.push('Missing matched deterministic replay');
    if (!bundle.environment_hash || !bundle.dependency_hash || !bundle.verifier_identity || bundle.verifier_identity === 'UNVERIFIED_BUILDER_INPUT') reasons.push('Missing independent execution provenance');
    return { verified: reasons.length === 0, reasons };
  }
}
