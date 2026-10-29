import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { DHFormalVerifier } from '../src/proofs/DHFormalVerifier';
import { AuthoritativeVerificationPipeline } from '../src/tests/authoritativeVerificationPipeline';
import { System46Gates } from '../src/proofs/System46Gates';

/**
 * Run the 46-gate suite in its own Node/WASM process.
 * The 120-case formal aggregation also creates many Z3 contexts; keeping both
 * suites in one process can exhaust the ~2 GiB WebAssembly memory ceiling.
 * This script emits a gate artifact only when the real suite returns a report.
 */
async function main(): Promise<void> {
  // Supply the real Node platform to both verifiers and the authoritative
  // pipeline. Without this injection the pipeline silently skips CLI checks
  // and artifact writes, producing weaker evidence than the gate names imply.
  const nodePlatform = {
    execSync: cp.execSync,
    fs,
    path
  };
  DHFormalVerifier.setPlatform(nodePlatform);
  AuthoritativeVerificationPipeline.setNodePlatform(nodePlatform);

  const startedAt = new Date().toISOString();
  console.log('[46-GATE-ISOLATED] Starting independent 46-gate evaluation.');
  const report = await System46Gates.getInstance().evaluateAll46Gates();

  if (report.total_gates !== 46 || report.gates.length !== 46 ||
      new Set(report.gates.map(g => g.gate_id)).size !== 46) {
    throw new Error('46-gate suite returned an invalid inventory; artifact not accepted.');
  }

  const outDir = path.join(process.cwd(), 'artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  const commitSha = cp.execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const artifact = {
    ...report,
    source_commit_sha: commitSha,
    isolated_process: true,
    started_at: startedAt,
    completed_at: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(outDir, 'system-46-gates.json'),
    JSON.stringify(artifact, null, 2) + '\n',
    'utf8'
  );

  console.log('[46-GATE-ISOLATED-DIAGNOSTICS]', JSON.stringify({
    source_commit_sha: commitSha,
    total: report.total_gates,
    passed: report.gates_passed,
    external_provider_required: report.external_provider_required_count,
    blocked: report.blocked_count,
    failed: report.failed_count,
    verdict: report.overall_verdict
  }));

  // A complete inventory may still be BLOCKED. The report is evidence, not
  // activation authorization; callers must inspect every gate status.
}

main().catch(error => {
  console.error('[46-GATE-ISOLATED-ERROR]', error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
