import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { DFRLFormalVerifier } from '../src/proofs/DFRLFormalVerifier';
import { DHFormalVerifier } from '../src/proofs/DHFormalVerifier';
import { buildFormalEvidenceHashes } from '../src/proofs/formalEvidenceHash';
import { System46Gates } from '../src/proofs/System46Gates';
import { AuthoritativeVerificationPipeline } from '../src/tests/authoritativeVerificationPipeline';
import { setDiskDbChecker } from '../src/tests/persistenceVerification';

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
    r.proved && (r.solver_result === 'unsat' || r.solver_result === 'sat') && r.claim_scope === 'MODEL_VERIFIED'
  ).length;
  const totalExpectedMatches = dfrlExpectedMatches + dhReport.expected_result_matches;
  const totalReplays = dfrlReport.replays.length + dhReport.results.length;
  const totalReplayMatches = dfrlReport.deterministic_replays_matched + dhReport.replay_matches;
  const totalUnknown = dfrlReport.unknown_count + dhReport.unknown_count;
  const totalError = dfrlReport.error_count + dhReport.error_count;

  const dfrlIds = dfrlReport.results.map(r => r.operator_id || r.code);
  const dhIds = dhReport.results.map(r => r.case_id);
  // DFRL may expect sat or unsat (theorem-specific models). Require proved + replay consistency.
  const dfrlCasesValid = dfrlReport.results.length === 88 && new Set(dfrlIds).size === 88 &&
    dfrlReport.results.every(r => r.proved && (r.solver_result === 'unsat' || r.solver_result === 'sat')) &&
    dfrlReport.replays.length === 88 &&
    dfrlReport.replays.every(r => r.replay_match &&
      (r.original_result === 'unsat' || r.original_result === 'sat') &&
      r.replay_result === r.original_result &&
      r.original_assertion_hash === r.replay_assertion_hash);
  const dhCasesValid = dhReport.results.length === 32 && new Set(dhIds).size === 32 &&
    dhReport.results.every(r => r.actual_result === r.expected_result && r.replay_result === r.actual_result &&
      r.replay_match && r.claim_scope === 'MODEL_VERIFIED' &&
      (r.actual_result === 'unsat' || r.actual_result === 'sat') &&
      r.original_assertion_hash === r.replay_assertion_hash && r.certificate_sha256);

  const passed120 = totalZ3Executions === 120 && totalExpectedMatches === 120 &&
    totalReplays === 120 && totalReplayMatches === 120 && totalUnknown === 0 && totalError === 0 &&
    dfrlReport.overall_status === 'VERIFIED' && dhReport.overall_status === 'VERIFIED' &&
    dhReport.blocked_count === 0 && dfrlCasesValid && dhCasesValid;

  console.log('\n[STAGE 3] Adversarial mutation / fail-closed checks...');
  const mutation = await dfrlVerifier.runSmtMutationTest();
  const fault = await dfrlVerifier.runZ3FailureInjectionTest();
  const tamper = dfrlVerifier.runArtifactTamperTest(dfrlReport);

  const adversarialOk = mutation.passed && fault.passed && tamper.passed;
  console.log(` -> Mutation: ${mutation.passed} Fault: ${fault.passed} Tamper: ${tamper.passed}`);

  const durationMs = Date.now() - startTime;
  const outDir = path.join(process.cwd(), 'artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `verify-120-aggregation-${commitSha.slice(0, 12)}.json`);

  const payload = {
    commit_sha: commitSha,
    timestamp: new Date().toISOString(),
    duration_ms: durationMs,
    passed_120: passed120,
    adversarial_ok: adversarialOk,
    dfrl: dfrlReport,
    dh: dhReport,
    totals: {
      totalZ3Executions,
      totalExpectedMatches,
      totalReplays,
      totalReplayMatches,
      totalUnknown,
      totalError,
      dfrlCasesValid,
      dhCasesValid
    },
    adversarial: { mutation, fault, tamper }
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(passed120 && adversarialOk ? 'AGGREGATION: PASS' : 'AGGREGATION: FAIL');
  process.exit(passed120 && adversarialOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
