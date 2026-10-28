import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { DFRLFormalVerifier } from '../src/proofs/DFRLFormalVerifier';
import { DHFormalVerifier } from '../src/proofs/DHFormalVerifier';
import { buildFormalEvidenceHashes } from '../src/proofs/formalEvidenceHash';
import { System46Gates } from '../src/proofs/System46Gates';
import { AuthoritativeVerificationPipeline } from '../src/tests/authoritativeVerificationPipeline';
import { setDiskDbChecker } from '../src/tests/persistenceVerification';
import { isBrainActivationAllowed } from './activationGateDecision';

async function main() {
  console.log('================================================================');
  console.log(' PROJECT AGATE / DAISY / SOLVEX — 120-CASE FORMAL Z3 AGGREGATION');
  console.log(' (88 DFRL OPERATORS + 32 DH PARADOX CONTRACTS)');
  console.log('================================================================');

  DHFormalVerifier.setPlatform({
    execSync: cp.execSync,
    fs
  });

  const dhVerifier = DHFormalVerifier.getInstance();
  const commitSha = dhVerifier.getCommitSha();
  console.log(`Current Git Commit SHA: ${commitSha}`);

  const startTime = Date.now();

  console.log('\n[STAGE 1/2] Executing 88 DFRL Operators through Microsoft Research Z3...');
  const dfrlVerifier = DFRLFormalVerifier.getInstance();
  const dfrlReport = await dfrlVerifier.verifyAll88();
  console.log(` -> DFRL Executed:       ${dfrlReport.executed} / ${dfrlReport.total_operators}`);
  console.log(` -> DFRL UNSAT Proved:   ${dfrlReport.unsat_count} / ${dfrlReport.total_operators}`);
  console.log(` -> DFRL Replays:        ${dfrlReport.deterministic_replays_matched} / ${dfrlReport.total_operators}`);

  console.log('\n[STAGE 2/2] Executing 32 DH Formal Contracts through Microsoft Research Z3...');
  const dhReport = await dhVerifier.verifyAll32();
  console.log(` -> DH Formalized:       ${dhReport.formalized} / ${dhReport.total_cases}`);
  console.log(` -> DH Executed:         ${dhReport.executed} / ${dhReport.total_cases}`);
  console.log(` -> DH Expected Matches: ${dhReport.expected_result_matches} / ${dhReport.total_cases}`);
  console.log(` -> DH Replays:          ${dhReport.replay_matches} / ${dhReport.total_cases}`);
  console.log(` -> DH Distribution:     UNSAT: ${dhReport.unsat_count}, SAT: ${dhReport.sat_count}`);
  console.log(` -> DH Blocked:          ${dhReport.blocked_count}`);

  const totalZ3Executions = dfrlReport.executed + dhReport.executed;
  const dfrlExpectedMatches = dfrlReport.results.filter(r =>
    r.solver_result === 'unsat' && r.proved && r.claim_scope === 'MODEL_VERIFIED'
  ).length;
  const dhExpectedMatches = dhReport.results.filter(r => r.actual_result === r.expected_result).length;
  const totalExpectedMatches = dfrlExpectedMatches + dhExpectedMatches;
  const totalReplays = dfrlReport.replays.length + dhReport.replays.length;
  const dfrlReplayMatches = dfrlReport.replays.filter(r =>
    r.replay_match && r.original_result === 'unsat' && r.replay_result === 'unsat' &&
    r.original_assertion_hash === r.replay_assertion_hash
  ).length;
  const dhReplayMatches = dhReport.replays.filter(r => r.replay_match && r.original_result === r.replay_result).length;
  const totalReplayMatches = dfrlReplayMatches + dhReplayMatches;
  const totalUnsat = dfrlReport.results.filter(r => r.solver_result === 'unsat').length +
    dhReport.results.filter(r => r.actual_result === 'unsat').length;
  const totalSat = dfrlReport.results.filter(r => r.solver_result === 'sat').length +
    dhReport.results.filter(r => r.actual_result === 'sat').length;
  const totalUnknown = dfrlReport.results.filter(r => r.solver_result === 'unknown').length +
    dhReport.results.filter(r => r.actual_result === 'unknown').length;
  const totalError = dfrlReport.results.filter(r =>
    r.solver_result === 'error' || r.solver_result === 'formal_execution_not_performed'
  ).length + dhReport.results.filter(r => r.actual_result === 'error' || !!r.error).length;

  const expectedSatCaseIds = ['DH-P-019', 'DH-P-031'];
  const actualSatCaseIds = dhReport.results.filter(r => r.actual_result === 'sat').map(r => r.case_id).sort();
  const dfrlIds = dfrlReport.results.map(r => r.operator_id);
  const dhIds = dhReport.results.map(r => r.case_id);
  const dfrlCasesValid = dfrlReport.results.length === 88 && new Set(dfrlIds).size === 88 &&
    dfrlReport.results.every(r => r.solver_result === 'unsat' && r.proved) &&
    dfrlReport.replays.length === 88 &&
    dfrlReport.replays.every(r => r.replay_match && r.original_result === 'unsat' &&
      r.replay_result === 'unsat' && r.original_assertion_hash === r.replay_assertion_hash);
  const dhCasesValid = dhReport.results.length === 32 && new Set(dhIds).size === 32 &&
    dhReport.results.every(r => r.actual_result === r.expected_result && r.replay_result === r.actual_result &&
      r.replay_match && r.verified && r.source_integrity === 'PASS' &&
      r.evidence_integrity === 'PASS' && !r.error) &&
    dhReport.replays.length === 32 &&
    dhReport.replays.every(r => r.replay_match && r.original_result === r.replay_result) &&
    JSON.stringify(actualSatCaseIds) === JSON.stringify(expectedSatCaseIds);

  const duration = Date.now() - startTime;
  const evidenceHashes = buildFormalEvidenceHashes(commitSha, dfrlReport, dhReport);
  const combinedRootSha256 = evidenceHashes.corpus_root_sha256;
  const runEvidenceSha256 = evidenceHashes.run_evidence_sha256;

  const passed120 = totalZ3Executions === 120 && totalExpectedMatches === 120 &&
    totalReplays === 120 && totalReplayMatches === 120 && totalUnknown === 0 && totalError === 0 &&
    dfrlReport.overall_status === 'VERIFIED' && dhReport.overall_status === 'VERIFIED' &&
    dhReport.blocked_count === 0 && dfrlCasesValid && dhCasesValid;

  const adversarialVerification = {
    dfrl_mutation: await dfrlVerifier.runSmtMutationTest(),
    dfrl_failure_injection: await dfrlVerifier.runZ3FailureInjectionTest(),
    dfrl_tamper_alarm: dfrlVerifier.runArtifactTamperTest(dfrlReport),
    dh_smt_mutation: await dhVerifier.runSmtMutationTest(),
    dh_failure_injection: await dhVerifier.runFailureInjectionTest(),
    dh_artifact_tamper: dhVerifier.runArtifactTamperTest(dhReport),
    contract_hash_integrity: dhReport.results.every(r => r.evidence_integrity === 'PASS' && !!r.contract_hash),
    source_hash_integrity: dhReport.results.every(r => r.source_integrity === 'PASS' && !!r.source_content_hash),
    replay_integrity: dfrlReport.replays.every(r => r.replay_match) && dhReport.replays.every(r => r.replay_match)
  };
  const adversarialVerificationPassed =
    adversarialVerification.dfrl_mutation.passed &&
    adversarialVerification.dfrl_failure_injection.passed &&
    adversarialVerification.dfrl_tamper_alarm.passed &&
    adversarialVerification.dh_smt_mutation.passed &&
    adversarialVerification.dh_failure_injection.passed &&
    adversarialVerification.dh_artifact_tamper.passed &&
    adversarialVerification.contract_hash_integrity &&
    adversarialVerification.source_hash_integrity &&
    adversarialVerification.replay_integrity;

  console.log('\n================================================================');
  console.log('120-CASE FORMAL Z3 VERIFICATION SUMMARY');
  console.log('================================================================');
  console.log(`DFRL Z3 executions:        ${dfrlReport.executed} / 88`);
  console.log(`DH Z3 executions:          ${dhReport.executed} / 32`);
  console.log(`TOTAL Z3 executions:       ${totalZ3Executions} / 120`);
  console.log(`Expected-result matches:   ${totalExpectedMatches} / 120`);
  console.log(`Cleanroom replays:         ${totalReplays} / 120`);
  console.log(`Replay matches:            ${totalReplayMatches} / 120`);
  console.log(`UNSAT Count:               ${totalUnsat} (88 DFRL + ${dhReport.unsat_count} DH)`);
  console.log(`SAT Count:                 ${totalSat} (0 DFRL + ${dhReport.sat_count} DH)`);
  console.log(`UNKNOWN:                   ${totalUnknown}`);
  console.log(`ERROR:                     ${totalError}`);
  console.log(`Combined Root Hash:        ${combinedRootSha256}`);
  console.log(`Commit SHA:                ${commitSha}`);
  console.log(`Duration:                  ${duration}ms`);
  console.log(`Activation Gate Verdict:   ${passed120 ? 'PROVEN_120_FORMAL_CLOSURE' : 'BLOCKED'}`);
  console.log('================================================================');

  const artifactsDir = path.resolve(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  AuthoritativeVerificationPipeline.setNodePlatform({ execSync: cp.execSync, fs, path });
  setDiskDbChecker((p: string) => fs.existsSync(p));
  const gatesReport = await System46Gates.getInstance().evaluateAll46Gates();
  fs.writeFileSync(path.join(artifactsDir, 'system-46-gates.json'), JSON.stringify(gatesReport, null, 2), 'utf8');

  const nonPassedGates = gatesReport.gates.filter(g => g.status !== 'PASSED');
  const brainActive = isBrainActivationAllowed({
    corpusPassed: passed120,
    adversarialPassed: adversarialVerificationPassed,
    observedGateCount: gatesReport.gates.length,
    requiredGateCount: 46,
    nonPassedGateCount: nonPassedGates.length
  });

  const activationGate = {
    schema_version: '1.0.0',
    status: brainActive ? 'ACTIVE' : 'BLOCKED',
    reason: brainActive
      ? '120/120 formal corpus and adversarial checks passed; all 46 system gates are PASSED.'
      : 'Activation blocked until formal corpus, adversarial checks, and all 46 system gates pass; no provider or blocked gate may be excluded.',
    corpus: {
      total_required: 120,
      dfrl_required: 88,
      dh_required: 32,
      executed: totalZ3Executions,
      deterministic_replays: totalReplayMatches,
      unknown: totalUnknown,
      errors: totalError
    },
    adversarial_verification: {
      passed: adversarialVerificationPassed,
      dfrl_mutation: adversarialVerification.dfrl_mutation.passed,
      dfrl_failure_injection: adversarialVerification.dfrl_failure_injection.passed,
      dfrl_tamper_alarm: adversarialVerification.dfrl_tamper_alarm.passed,
      dh_smt_mutation: adversarialVerification.dh_smt_mutation.passed,
      dh_failure_injection: adversarialVerification.dh_failure_injection.passed,
      dh_artifact_tamper: adversarialVerification.dh_artifact_tamper.passed,
      contract_hash_integrity: adversarialVerification.contract_hash_integrity,
      source_hash_integrity: adversarialVerification.source_hash_integrity,
      replay_integrity: adversarialVerification.replay_integrity
    },
    mandatory_gates: {
      total: 46,
      observed: gatesReport.gates.length,
      passed: gatesReport.gates.filter(g => g.status === 'PASSED').length,
      failed: gatesReport.gates.filter(g => g.status === 'FAIL').length,
      blocked: gatesReport.gates.filter(g => g.status === 'BLOCKED').length,
      external_provider_required: gatesReport.gates.filter(g => g.status === 'EXTERNAL_PROVIDER_REQUIRED').length,
      non_passed: nonPassedGates.length
    },
    gate_exceptions: nonPassedGates.map(g => ({ gate_number: g.gate_number, gate_id: g.gate_id, status: g.status, name: g.name, details: g.details })),
    verification_root_sha256: combinedRootSha256,
    corpus_root_sha256: combinedRootSha256,
    run_evidence_sha256: runEvidenceSha256,
    source_commit_sha: commitSha,
    generated_at: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(process.cwd(), 'artifacts', 'daisy-brain-activation-gate.json'),
    JSON.stringify(activationGate, null, 2),
    'utf8'
  );

  // Remainder of artifact packaging is unchanged in spirit from main; keep compact
  // formal summary files for CI consumption.
  const formalAggregationArtifact = {
    aggregation_name: 'Z3_120_FORMAL_AGGREGATION',
    commit_sha: commitSha,
    timestamp: new Date().toISOString(),
    total: {
      required: 120,
      actual_z3_executions: totalZ3Executions,
      replays: totalReplays,
      replay_matches: totalReplayMatches,
      distribution: { unsat: totalUnsat, sat: totalSat, unknown: totalUnknown, error: totalError },
      combined_root_sha256: combinedRootSha256,
      corpus_root_sha256: combinedRootSha256,
      run_evidence_sha256: runEvidenceSha256,
      closure_verdict: passed120 ? 'PROVEN_120_FORMAL_CLOSURE' : 'BLOCKED',
      activation_status: brainActive ? 'ACTIVE' : 'BLOCKED'
    }
  };
  fs.writeFileSync(path.join(artifactsDir, 'formal-aggregation.json'), JSON.stringify(formalAggregationArtifact, null, 2), 'utf8');

  const summaryArtifact = {
    aggregation_name: 'Z3_120_FORMAL_VERIFICATION_SUMMARY',
    commit_sha: commitSha,
    timestamp: new Date().toISOString(),
    total_z3_executions: totalZ3Executions,
    expected_result_matches: totalExpectedMatches,
    cleanroom_replays: totalReplays,
    replay_matches: totalReplayMatches,
    distribution: { unsat: totalUnsat, sat: totalSat, unknown: totalUnknown, error: totalError },
    combined_root_sha256: combinedRootSha256,
    corpus_root_sha256: combinedRootSha256,
    run_evidence_sha256: runEvidenceSha256,
    activation_gate: brainActive ? 'ACTIVE' : 'BLOCKED',
    formal_corpus_closure: passed120 ? 'PROVEN_120_FORMAL_CLOSURE' : 'BLOCKED'
  };
  fs.writeFileSync(path.join(artifactsDir, 'z3-120-formal-verification-summary.json'), JSON.stringify(summaryArtifact, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(artifactsDir, 'z3-120-formal-verification-summary.md'),
    `# 120-Case Formal Summary\n\n- Commit: \`${commitSha}\`\n- Formal corpus: **${passed120 ? 'PROVEN_120_FORMAL_CLOSURE' : 'BLOCKED'}**\n- Activation: **${brainActive ? 'ACTIVE' : 'BLOCKED'}**\n- Combined root: \`${combinedRootSha256}\`\n`,
    'utf8'
  );

  console.log(`\nWritten artifacts under ${artifactsDir}`);
  console.log(`Duration: ${duration}ms`);

  // Fail closed on incomplete activation (corpus + adversarial + all 46 gates).
  // Formal corpus-only success must not green-exit when mandatory gates are blocked.
  if (!brainActive) {
    console.error('[BLOCKED] Activation requirements not satisfied; inspect system-46-gates.json and daisy-brain-activation-gate.json.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL] 120-case aggregation failure:', err);
  process.exit(1);
});
