import { ProofBundleEntity, computeSha256 } from '../database/DatabaseSchema';
import { computeOracleInputSha256, IndependentModelOracle, type OracleAttestation } from '../security/IndependentModelOracle';
import { isAuthenticZ3ExecutionReceipt, Z3ProofResult } from './Z3FormalProofEngine';

export class ProofBundleBuilder {
  private bundle: ProofBundleEntity;
  private oracleInputSha256: string | null = null;

  constructor(proofId: string, subjectId: string, claim: string) {
    this.bundle = {
      proof_id: proofId,
      subject_id: subjectId,
      claim,
      claim_hash: computeSha256(claim),
      evidence: [],
      tests: [],
      formal_proofs: [],
      independent_oracles: [],
      replay_results: [],
      implementation_hash: computeSha256('EMPTY_IMPL'),
      environment_hash: computeSha256('SOVEREIGN_NODE_SANDBOX'),
      dependency_hash: computeSha256('ZERO_SPECULATIVE_DEPS'),
      source_references: [],
      timestamp: Date.now(),
      verifier_identity: 'DAISY_HAMINJA_PROOF_ENGINE_V1',
      verification_status: 'PARTIAL',
      limitations: [],
      reproducibility_instructions: 'Run `npm run verify:enterprise` in isolated container.'
    };
  }

  public setImplementation(sourceCode: string): this {
    this.bundle.implementation_hash = computeSha256(sourceCode);
    return this;
  }

  public addTest(testId: string, description: string, passed: boolean, durationMs: number): this {
    this.bundle.tests.push({
      test_id: testId,
      description,
      passed,
      duration_ms: durationMs,
      receipt_hash: computeSha256(`${testId}:${passed}:${durationMs}`)
    });
    return this;
  }

  public setOracleInput(input: unknown): this {
    this.oracleInputSha256 = computeOracleInputSha256(input);
    return this;
  }

  /**
   * A boolean supplied by the caller is not proof-engine evidence.
   * Keep the record explicitly unchecked until a verifier-produced,
   * source-bound certificate API is implemented.
   */
  public addFormalProof(system: 'Z3_SMT' | 'LEAN4' | 'ISABELLE' | 'NOPOT' | 'TYPE_THEORY', spec: string, _checked: boolean): this {
    this.bundle.formal_proofs.push({
      system,
      specification: spec,
      checked: false,
      proof_term_hash: computeSha256(`${system}:${spec}:UNVERIFIED_CALLER_ASSERTION`)
    });
    return this;
  }

  /**
   * A structurally supplied result can be fabricated by any caller.
   * It is retained as diagnostic metadata only, never as a verified proof.
   */
  public addZ3Proof(proofResult: Z3ProofResult): this {
    const verified = isAuthenticZ3ExecutionReceipt(proofResult) && proofResult.proved === true;
    this.bundle.formal_proofs.push({
      system: 'Z3_SMT',
      specification: `[${proofResult.theorem_id}] ${proofResult.theorem_name} (Z3 Engine) - Result: ${proofResult.solver_result.toUpperCase()}`,
      checked: verified,
      proof_term_hash: verified ? proofResult.certificate_sha256 : computeSha256(`UNVERIFIED_Z3_RESULT:${proofResult.certificate_sha256}`)
    });
    return this;
  }

  public addLean4Proof(filePath: string): this {
    return this.addFormalProof('LEAN4', `${filePath}; prover_executed=false`, false);
  }

  public addOracle(oracleId: string, name: string, method: string, _verified: boolean): this {
    this.bundle.independent_oracles.push({
      oracle_id: oracleId,
      name,
      method,
      attestation_hash: computeSha256(`${oracleId}:${name}:UNVERIFIED_BOOLEAN`),
      verified: false
    });
    return this;
  }

  /**
   * A valid signature against a caller-supplied key proves only self-consistency.
   * It does not establish a trusted oracle identity or bind the attestation to
   * this bundle's independently established claim. Therefore this API cannot
   * promote an oracle record. A pinned trust-store and expected-input contract
   * must be added before any attestation can be accepted.
   */
  public addSignedOracleAttestation(attestation: OracleAttestation): this {
    const expectedOracleId = process.env.SOLVEX_ORACLE_ID ?? '';
    const publicKeyPem = process.env.SOLVEX_ORACLE_ED25519_PUBLIC_KEY ?? '';
    const verified = Boolean(expectedOracleId && publicKeyPem && this.oracleInputSha256) &&
      IndependentModelOracle.verifyAttestation(attestation, expectedOracleId, this.oracleInputSha256 ?? '', publicKeyPem);
    this.bundle.independent_oracles.push({
      oracle_id: attestation.oracleId,
      name: attestation.modelId,
      method: 'Ed25519 attestation checked against deployment-pinned oracle identity/key and independently hashed bundle input',
      attestation_hash: computeSha256(`${attestation.signature}\n${attestation.inputSha256}\n${attestation.rationaleSha256}`),
      verified
    });
    if (!verified) this.bundle.limitations.push('Oracle attestation rejected: pinned oracle ID/key or independently derived input hash is missing or mismatched.');
    return this;
  }

  public addReplay(replayId: string, expectedHash: string, observedHash: string): this {
    const match = expectedHash === observedHash;
    this.bundle.replay_results.push({
      replay_id: replayId,
      status: match ? 'MATCH' : 'MISMATCH',
      expected_hash: expectedHash,
      observed_hash: observedHash
    });
    return this;
  }

  public addEvidence(item: string): this {
    this.bundle.evidence.push(item);
    return this;
  }

  public addSourceReference(ref: string): this {
    this.bundle.source_references.push(ref);
    return this;
  }

  public addLimitation(limitation: string): this {
    this.bundle.limitations.push(limitation);
    return this;
  }

  public seal(): ProofBundleEntity {
    const allTestsPassed = this.bundle.tests.length > 0 && this.bundle.tests.every(t => t.passed);
    const formalChecked = this.bundle.formal_proofs.length > 0 && this.bundle.formal_proofs.every(f => f.checked);
    const oraclesAttested = this.bundle.independent_oracles.length > 0 && this.bundle.independent_oracles.every(o => o.verified);
    const replaysMatched = this.bundle.replay_results.length > 0 && this.bundle.replay_results.every(r => r.status === 'MATCH');

    const oracleUnavailable = this.bundle.independent_oracles.length === 0 &&
      this.bundle.limitations.some(item => item.includes('Independent oracle attestation is unavailable'));
    if (allTestsPassed && formalChecked && oraclesAttested && replaysMatched) {
      this.bundle.verification_status = 'VERIFIED';
    } else if (allTestsPassed && formalChecked && replaysMatched && oracleUnavailable) {
      // Internal evidence is complete, but external authenticity is still unverified.
      // PARTIAL is not a pass and cannot authorize publication or activation.
      this.bundle.verification_status = 'PARTIAL';
    } else {
      this.bundle.verification_status = 'FAIL';
    }
    return this.bundle;
  }
}
