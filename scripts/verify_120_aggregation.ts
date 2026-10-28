import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { DFRLFormalVerifier } from '../src/proofs/DFRLFormalVerifier';
import { DHFormalVerifier } from '../src/proofs/DHFormalVerifier';

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
  const outDir = path.join(process.cwd(), 'artifacts');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('\n[STAGE 1/2] Executing 88 DFRL Operators through Microsoft Research Z3...');
  const dfrlVerifier = DFRLFormalVerifier.getInstance();
  const dfrlReport = await dfrlVerifier.verifyAll88();
  console.log(` -> DFRL Executed:       ${dfrlReport.executed} / ${dfrlReport.total_operators}`);
  console.log(` -> DFRL status:         ${dfrlReport.overall_status}`);
  console.log(` -> DFRL Replays:        ${dfrlReport.deterministic_replays_matched} / ${dfrlReport.total_operators}`);

  console.log('\n[STAGE 2/2] Executing 32 DH Formal Contracts through Microsoft Research Z3...');
  const dhReport = await dhVerifier.verifyAll32();
  console.log(` -> DH Executed:         ${dhReport.executed} / ${dhReport.total_cases}`);
  console.log(` -> DH Expected Matches: ${dhReport.expected_result_matches} / ${dhReport.total_cases}`);
  console.log(` -> DH Replays:          ${dhReport.replay_matches} / ${dhReport.total_cases}`);
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
  const dfrlCasesValid = dfrlReport.results.length === 88 && new Set(dfrlIds).size === 88 &&
    dfrlReport.results.every(r => r.proved && (r.solver_result === 'unsat' || r.solver_result === 'sat')) &&
    dfrlReport.replays.length === 88 &&
    dfrlReport.replays.every(r => r.replay_match &&
      (r.original_result === 'unsat' || r.original_result === 'sat') &&
      r.replay_result === r.original_result &&
      r.original_assertion_hash === r.replay_assertion_hash);
  const dhCasesValid = dhReport.results.length === 32 && new Set(dhIds).size === 32 &&
    dhReport.results.every(r => r.verified &&
      r.actual_result === r.expected_result &&
      r.replay_result === r.actual_result &&
      r.replay_match &&
      ['MODEL_VERIFIED', 'MODEL_VERIFIED_BOUNDED', 'MODEL_VERIFIED_AXIOMATIC'].includes(r.scope) &&
      (r.actual_result === 'unsat' || r.actual_result === 'sat') &&
      r.evidence_integrity === 'PASS' &&
      r.source_integrity === 'PASS' &&
      typeof r.contract_hash === 'string' && /^[a-f0-9]{64}$/i.test(r.contract_hash) &&
      typeof r.source_hash === 'string' && /^[a-f0-9]{64}$/i.test(r.source_hash) &&
      typeof r.source_content_hash === 'string' && /^[a-f0-9]{64}$/i.test(r.source_content_hash) &&
      typeof r.evidence_hash === 'string' && /^[a-f0-9]{64}$/i.test(r.evidence_hash));

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

  console.log('[120-GATE-DIAGNOSTICS]', JSON.stringify({
    totalZ3Executions,
    totalExpectedMatches,
    totalReplays,
    totalReplayMatches,
    totalUnknown,
    totalError,
    dfrlOverallStatus: dfrlReport.overall_status,
    dhOverallStatus: dhReport.overall_status,
    dfrlResultsCount: dfrlReport.results.length,
    dfrlUniqueIds: new Set(dfrlIds).size,
    dfrlAllProved: dfrlReport.results.every(r => r.proved),
    dfrlAllResultsSatOrUnsat: dfrlReport.results.every(r => r.solver_result === 'unsat' || r.solver_result === 'sat'),
    dfrlReplayCount: dfrlReport.replays.length,
    dfrlReplayIntegrity: dfrlReport.replays.every(r => r.replay_match &&
      (r.original_result === 'unsat' || r.original_result === 'sat') &&
      r.replay_result === r.original_result &&
      r.original_assertion_hash === r.replay_assertion_hash),
    dhResultsCount: dhReport.results.length,
    dhUniqueIds: new Set(dhIds).size,
    dfrlCasesValid,
    dhCasesValid,
    passed120,
    adversarialOk
  }));

  // 46-gate suite is required for ACTIVE; if unavailable, stay BLOCKED.
  let gatesPassed = 0;
  let gatesTotal = 0;
  let gatesFailed = 0;
  try {
    const { System46Gates } = await import('../src/proofs/System46Gates');
    const gates = System46Gates.getInstance();
    const report = await gates.evaluateAll46Gates();
    gatesTotal = report.total_gates;
    gatesPassed = report.gates.filter(g => g.status === 'PASSED').length;
    // BLOCKED and EXTERNAL_PROVIDER_REQUIRED are not passes; never exclude them.
    gatesFailed = report.gates.filter(g => g.status !== 'PASSED').length;
    fs.writeFileSync(path.join(outDir, 'system-46-gates.json'), JSON.stringify(report, null, 2));
    console.log('[46-GATE-DIAGNOSTICS]', JSON.stringify({
      total: gatesTotal,
      passed: gatesPassed,
      notPassed: gatesFailed,
      blocked: report.blocked_count,
      externalProviderRequired: report.external_provider_required_count,
      failed: report.failed_count,
      verdict: report.overall_verdict,
      nonPassedGateIds: report.gates.filter(g => g.status !== 'PASSED').map(g => ({
        gate_number: g.gate_number, gate_id: g.gate_id, status: g.status, name: g.name
      }))
    }));
  } catch (e: any) {
    console.warn('System46Gates not executed:', e?.message || e);
  }

  const brainActive =
    passed120 &&
    adversarialOk &&
    gatesTotal > 0 &&
    gatesPassed === gatesTotal &&
    gatesFailed === 0;

  const activationGate = {
    schema_version: '1.0.0',
    status: brainActive ? 'ACTIVE' : 'BLOCKED',
    reason: brainActive
      ? '120/120 formal corpus and adversarial checks passed; all 46 system gates are PASSED.'
      : 'Activation blocked until formal corpus, adversarial checks, and all 46 system gates pass; no provider or blocked gate may be excluded.',
    commit_sha: commitSha,
    timestamp: new Date().toISOString(),
    corpus: {
      total_required: 120,
      dfrl_required: 88,
      dh_required: 32,
      executed: totalZ3Executions,
      deterministic_replays: totalReplayMatches,
      unknown: totalUnknown,
      errors: totalError,
      dfrl_cases_valid: dfrlCasesValid,
      dh_cases_valid: dhCasesValid,
      passed_120: passed120
    },
    adversarial_verification: {
      passed: adversarialOk,
      dfrl_mutation: mutation.passed,
      dfrl_failure_injection: fault.passed,
      dfrl_tamper_alarm: tamper.passed
    },
    mandatory_gates: {
      total: gatesTotal,
      passed: gatesPassed,
      failed: gatesFailed
    }
  };

  // ALWAYS write — CI checks for this path even when status is BLOCKED.
  const gatePath = path.join(outDir, 'daisy-brain-activation-gate.json');
  fs.writeFileSync(gatePath, JSON.stringify(activationGate, null, 2));
  console.log(`Wrote ${gatePath} status=${activationGate.status}`);

  const durationMs = Date.now() - startTime;
  const outPath = path.join(outDir, `verify-120-aggregation-${commitSha.slice(0, 12)}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        commit_sha: commitSha,
        timestamp: new Date().toISOString(),
        duration_ms: durationMs,
        passed_120: passed120,
        adversarial_ok: adversarialOk,
        brain_active: brainActive,
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
        adversarial: { mutation, fault, tamper },
        activation_gate: activationGate
      },
      null,
      2
    )
  );
  console.log(`Wrote ${outPath}`);
  console.log(`Activation Gate Verdict:   ${activationGate.status}`);
  console.log(passed120 && adversarialOk ? 'AGGREGATION: corpus+adversarial OK' : 'AGGREGATION: FAIL');
  // Exit 0 only when brain would activate; missing gate file is no longer a silent gap.
  process.exit(brainActive ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  try {
    const outDir = path.join(process.cwd(), 'artifacts');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, 'daisy-brain-activation-gate.json'),
      JSON.stringify(
        {
          schema_version: '1.0.0',
          status: 'BLOCKED',
          reason: `verify_120 crashed: ${e?.message || String(e)}`,
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
  } catch {
    /* ignore */
  }
  process.exit(1);
});
