import { DFRLFormalVerifier } from '../src/proofs/DFRLFormalVerifier';

async function main() {
  console.log('===========================================================');
  console.log(' DFRL 88-OPERATOR FORMAL SMT VERIFICATION (Z3 WASM)');
  console.log('===========================================================');

  const verifier = DFRLFormalVerifier.getInstance();
  console.log('Executing 88 operator assertions through Microsoft Research Z3...');
  const report = await verifier.verifyAll88();
  console.log(`Propositions Evaluated: ${report.total_operators}`);
  console.log(`Attempted:              ${report.attempted}`);
  console.log(`Executed:               ${report.executed}`);
  console.log(`UNSAT Theorems Proved:  ${report.unsat_proved_count}`);
  console.log(`SAT Results:            ${report.sat_count}`);
  console.log(`Unknown Results:        ${report.unknown_count}`);
  console.log(`Execution Errors:       ${report.error_count}`);
  console.log(`Authored Models:        ${report.authored_models_count} (DFRL-P-001 to P-020)`);
  console.log(`Generated Models:       ${report.generated_models_count} (DFRL-P-021 to P-088)`);
  console.log(`Deterministic Replays:  ${report.deterministic_replays_matched}`);
  console.log(`Claim Scope:            ${report.claim_scope}`);
  console.log(`Root Hash:              ${report.verification_root_sha256}`);

  console.log('\nRunning SMT Operator Premise Perturbation Mutation Test...');
  const mut = await verifier.runSmtMutationTest();
  console.log(`Mutation Test Passed:   ${mut.passed} (${mut.operator_code}: ${mut.observed_original_result} -> ${mut.observed_mutated_result})`);

  console.log('\nRunning Z3 Failure Injection & Fail-Closed Guard Test...');
  const failInj = await verifier.runFailureInjectionTest();
  console.log(`Failure Injection Passed: ${failInj.passed} (Observed: ${failInj.observed_solver_result}, Never UNSAT: ${failInj.never_converted_to_unsat})`);

  console.log('\nRunning Cryptographic Proof Artifact Tamper Test...');
  const tamp = verifier.runArtifactTamperTest(report);
  console.log(`Tamper Test Passed:     ${tamp.passed} (Alarm Triggered: ${tamp.alarm_triggered})`);

  if (report.unsat_proved_count === 88 && mut.passed && failInj.passed && tamp.passed) {
    console.log('\n✅ DFRL 88-OPERATOR FORMAL VERIFICATION: 100% SUCCESS');
  } else {
    console.error('\n❌ DFRL VERIFICATION FAILED');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL] DFRL verification error:', err);
  process.exit(1);
});
