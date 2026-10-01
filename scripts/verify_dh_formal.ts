import fs from 'fs';
import path from 'path';
import { DHFormalVerifier } from '../src/proofs/DHFormalVerifier';
import { computeSha256 } from '../src/database/DatabaseSchema';

async function main() {
  console.log('================================================================');
  console.log(' PROJECT AGATE / DAISY / SOLVEX — 32 DH FORMAL Z3 VERIFICATION');
  console.log('================================================================');

  const verifier = DHFormalVerifier.getInstance();
  console.log('Executing 32 DH formal contracts through Microsoft Research Z3...');
  const startTime = Date.now();
  const report = await verifier.verifyAll32();
  const duration = Date.now() - startTime;

  console.log(`\n--- DH FORMAL VERIFICATION SUMMARY ---`);
  console.log(`Total Cases:              ${report.total_cases}`);
  console.log(`Executed:                 ${report.executed}`);
  console.log(`Expected Result Matches:  ${report.expected_result_matches} / ${report.total_cases}`);
  console.log(`Cleanroom Replays:        ${report.cleanroom_replays}`);
  console.log(`Replays Matched:          ${report.replay_matches} / ${report.total_cases}`);
  console.log(`UNSAT Count:              ${report.unsat_count}`);
  console.log(`SAT Count:                ${report.sat_count}`);
  console.log(`UNKNOWN Count:            ${report.unknown_count}`);
  console.log(`ERROR Count:              ${report.error_count}`);
  console.log(`Root Hash:                ${report.verification_root_sha256}`);
  console.log(`Duration:                 ${duration}ms`);
  console.log(`Overall Status:           ${report.overall_status}`);

  console.log('\n--- INDIVIDUAL 32 DH RESULTS ---');
  for (const r of report.results) {
    const mark = r.verified ? '✓' : '✗';
    console.log(`[${r.case_id}] ${r.name.padEnd(46)}: exp=${r.expected_result.padEnd(5)} act=${r.actual_result.padEnd(5)} rep=${r.replay_result.padEnd(5)} [${r.scope}] ${mark}`);
  }

  console.log('\nRunning SMT Operator Premise Perturbation Mutation Test (DH-P-028)...');
  const mut = await verifier.runSmtMutationTest();
  console.log(`Mutation Test Passed:     ${mut.passed} (${mut.target_case_id}: ${mut.observed_original_result} -> ${mut.observed_mutated_result})`);

  console.log('\nRunning Z3 Failure Injection & Fail-Closed Guard Test...');
  const failInj = await verifier.runFailureInjectionTest();
  console.log(`Failure Injection Passed: ${failInj.passed} (Observed: ${failInj.observed_result}, Fail-Closed: ${failInj.fail_closed_enforced})`);

  console.log('\nRunning Cryptographic Proof Artifact Tamper Test...');
  const tamp = verifier.runArtifactTamperTest(report);
  console.log(`Tamper Test Passed:       ${tamp.passed} (Alarm Triggered: ${tamp.alarm_triggered})`);

  // Write artifacts
  const artifactsDir = path.resolve(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const receiptsDir = path.join(artifactsDir, 'proof-receipts');
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
  }

  // 1. JSON Report
  fs.writeFileSync(
    path.join(artifactsDir, 'dh-32-formal-verification.json'),
    JSON.stringify(
      {
        ...report,
        mutation_test: mut,
        failure_injection_test: failInj,
        tamper_test: tamp
      },
      null,
      2
    ),
    'utf8'
  );

  // 2. Individual proof receipts
  for (const r of report.results) {
    const receipt = {
      proof_id: `PROOF-RECEIPT-${r.case_id}`,
      case_id: r.case_id,
      name: r.name,
      domain: r.domain,
      statement: r.statement,
      formal_proposition: r.formal_proposition,
      assumptions: r.assumptions,
      expected_result: r.expected_result,
      actual_result: r.actual_result,
      replay_result: r.replay_result,
      replay_match: r.replay_match,
      verified: r.verified,
      scope: r.scope,
      solver: r.solver,
      solver_version: r.solver_version,
      execution_id: r.execution_id,
      commit_sha: r.commit_sha,
      source_hash: r.source_hash,
      contract_hash: r.contract_hash,
      evidence_hash: r.evidence_hash,
      duration_ms: r.duration_ms,
      timestamp: r.timestamp,
      proof_method: 'Automated Theorem Proving via Microsoft Research Z3 WebAssembly Kernel'
    };
    fs.writeFileSync(
      path.join(receiptsDir, `proof-${r.case_id}.json`),
      JSON.stringify(receipt, null, 2),
      'utf8'
    );
  }

  // 3. Markdown Report
  const md = `# DH 32-Case Formal Z3 SMT Verification Dossier
## Automated Theorem Prover Machine Verification Audit

- **Execution ID:** \`${report.execution_id}\`
- **Commit SHA:** \`${report.commit_sha}\`
- **Solver Engine:** \`${report.solver} (${report.solver_version})\`
- **Verification Root Hash:** \`${report.verification_root_sha256}\`
- **Total Cases:** 32 / 32 Executed
- **Expected Result Matches:** ${report.expected_result_matches} / 32
- **Deterministic Cleanroom Replays:** ${report.replay_matches} / 32
- **Distribution:** UNSAT: ${report.unsat_count}, SAT: ${report.sat_count}, UNKNOWN: ${report.unknown_count}, ERROR: ${report.error_count}
- **SMT Mutation Detection:** ${mut.passed ? 'PASSED (UNSAT -> SAT confirmed)' : 'FAILED'}
- **Z3 Fault Injection (Fail-Closed):** ${failInj.passed ? 'PASSED (error, verified=false, fail-closed enforced)' : 'FAILED'}
- **Tamper Detection Alarm:** ${tamp.passed ? 'PASSED (Alarm Triggered)' : 'FAILED'}

### Complete Proposition Matrix (32 DH Formal Cases)

| Case ID | Name | Domain | Scope | Expected | Actual | Replay | Verified |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|
${report.results.map(r => `| \`${r.case_id}\` | ${r.name} | \`${r.domain}\` | \`${r.scope}\` | \`${r.expected_result}\` | \`${r.actual_result}\` | \`${r.replay_result}\` | \`${r.verified ? 'VERIFIED' : 'FAILED'}\` |`).join('\n')}
`;
  fs.writeFileSync(path.join(artifactsDir, 'dh-32-formal-verification.md'), md, 'utf8');

  console.log(`\nArtifacts written to: ${artifactsDir}/dh-32-formal-verification.json & .md`);
  console.log(`Proof receipts written to: ${receiptsDir}/proof-DH-P-*.json`);

  if (report.overall_status === 'VERIFIED' && mut.passed && failInj.passed && tamp.passed) {
    console.log('\n================================================================');
    console.log('✅ DH 32-CASE FORMAL Z3 VERIFICATION: 100% SUCCESS');
    console.log('================================================================');
  } else {
    console.error('\n❌ DH FORMAL VERIFICATION FAILED');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL] DH Formal verification error:', err);
  process.exit(1);
});
