import { ProofBundleEntity, computeSha256 } from '../database/DatabaseSchema';
import { Z3ProofResult } from './Z3FormalProofEngine';

/**
 * Builder input is untrusted metadata. It can assemble an evidence candidate but can
 * never self-certify it as VERIFIED; only an independent verifier may register a
 * completed bundle after executing its referenced tools and tests.
 */
export class ProofBundleBuilder {
  private bundle: ProofBundleEntity;

  constructor(proofId: string, subjectId: string, claim: string) {
    this.bundle = {
      proof_id: proofId, subject_id: subjectId, claim, claim_hash: computeSha256(claim), evidence: [], tests: [], formal_proofs: [],
      independent_oracles: [], replay_results: [], implementation_hash: computeSha256('EMPTY_IMPL'),
      environment_hash: computeSha256('UNVERIFIED_ENVIRONMENT'), dependency_hash: computeSha256('UNVERIFIED_DEPENDENCIES'),
      source_references: [], timestamp: Date.now(), verifier_identity: 'UNVERIFIED_BUILDER_INPUT', verification_status: 'PARTIAL',
      limitations: ['Builder-provided observations are untrusted until independently executed and verified.'],
      reproducibility_instructions: 'Execute the declared toolchain in an isolated environment and register signed receipts through an independent verifier.'
    };
  }

  public setImplementation(sourceCode: string): this { this.bundle.implementation_hash = computeSha256(sourceCode); return this; }
  public addTest(testId: string, description: string, passed: boolean, durationMs: number): this {
    this.bundle.tests.push({ test_id: testId, description, passed, duration_ms: durationMs, receipt_hash: computeSha256(`${testId}:${description}:${passed}:${durationMs}`) }); return this;
  }
  public addFormalProof(system: 'Z3_SMT' | 'LEAN4' | 'ISABELLE' | 'NOPOT' | 'TYPE_THEORY', spec: string, checked: boolean): this {
    this.bundle.formal_proofs.push({ system, specification: spec, checked, proof_term_hash: computeSha256(`${system}:${spec}:${checked}`) }); return this;
  }
  public addZ3Proof(proofResult: Z3ProofResult): this {
    return this.addFormalProof('Z3_SMT', `[${proofResult.theorem_id}] ${proofResult.theorem_name}: ${proofResult.solver_result}`, proofResult.proved);
  }
  public addLean4Proof(filePath: string): this {
    this.bundle.formal_proofs.push({ system: 'LEAN4', specification: filePath, checked: false, proof_term_hash: computeSha256(`UNEXECUTED_LEAN4:${filePath}`) });
    this.bundle.limitations.push(`Lean4 source ${filePath} has not been compiled by this builder.`); return this;
  }
  public addOracle(oracleId: string, name: string, method: string, verified: boolean): this {
    this.bundle.independent_oracles.push({ oracle_id: oracleId, name, method, attestation_hash: computeSha256(`${oracleId}:${name}:${method}:${verified}`), verified }); return this;
  }
  public addReplay(replayId: string, expectedHash: string, observedHash: string): this {
    this.bundle.replay_results.push({ replay_id: replayId, status: expectedHash === observedHash ? 'MATCH' : 'MISMATCH', expected_hash: expectedHash, observed_hash: observedHash }); return this;
  }
  public addEvidence(item: string): this { this.bundle.evidence.push(item); return this; }
  public addSourceReference(ref: string): this { this.bundle.source_references.push(ref); return this; }
  public addLimitation(limitation: string): this { this.bundle.limitations.push(limitation); return this; }

  public seal(): ProofBundleEntity {
    this.bundle.verification_status = this.bundle.tests.some(t => !t.passed) || this.bundle.replay_results.some(r => r.status === 'MISMATCH') ? 'FAIL' : 'PARTIAL';
    return this.bundle;
  }
}
