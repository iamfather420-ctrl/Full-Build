import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { System46Gates } from '../src/proofs/System46Gates';
import { AuthoritativeVerificationPipeline } from '../src/tests/authoritativeVerificationPipeline';
import { setDiskDbChecker } from '../src/tests/persistenceVerification';

async function main() {
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  AuthoritativeVerificationPipeline.setNodePlatform({ execSync: cp.execSync, fs, path });
  setDiskDbChecker((file: string) => fs.existsSync(file));

  const sourceCommitSha = cp.execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const full = await System46Gates.getInstance().evaluateAll46Gates();
  const closure = full.gates.filter(g => g.gate_id === 'GATE-46');
  const sequence = full.gates.filter(g => g.gate_id !== 'GATE-46');

  if (full.total_gates !== 46 || sequence.length !== 45 || closure.length !== 1 ||
      full.gates[45]?.gate_id !== 'GATE-46' ||
      new Set(sequence.map(g => g.gate_id)).size !== 45) {
    throw new Error('Expected 45 unique sequential gates followed by exactly one separate GATE-46 closure gate.');
  }

  const sequenceReport = {
    pipeline_name: 'SolveX authoritative 45-gate sequence',
    total_gates: 45,
    observed_gates: sequence.length,
    gates_passed: sequence.filter(g => g.status === 'PASSED').length,
    blocked_count: sequence.filter(g => g.status === 'BLOCKED' || g.status === 'EXTERNAL_PROVIDER_REQUIRED').length,
    failed_count: sequence.filter(g => g.status === 'FAIL').length,
    source_commit_sha: sourceCommitSha,
    execution_id: full.execution_id,
    timestamp: full.timestamp,
    gates: sequence
  };
  const closureReport = {
    pipeline_name: 'SolveX subsequent master closure gate',
    sequence_gate_count: 45,
    total_gates: 1,
    source_commit_sha: sourceCommitSha,
    execution_id: full.execution_id,
    timestamp: full.timestamp,
    gate: closure[0]
  };

  fs.writeFileSync(path.join(artifactsDir, 'system-45-gates.json'), JSON.stringify(sequenceReport, null, 2));
  fs.writeFileSync(path.join(artifactsDir, 'system-46-closure-gate.json'), JSON.stringify(closureReport, null, 2));
  console.log('[45-GATE-SEQUENCE]', JSON.stringify({
    total: sequenceReport.total_gates,
    observed: sequenceReport.observed_gates,
    passed: sequenceReport.gates_passed,
    blocked: sequenceReport.blocked_count,
    failed: sequenceReport.failed_count,
    non_passed: sequence.filter(g => g.status !== 'PASSED').length,
    source_commit_sha: sourceCommitSha
  }));
  console.log('[SEPARATE-GATE-46]', JSON.stringify({
    gate_id: closure[0].gate_id,
    status: closure[0].status,
    source_commit_sha: sourceCommitSha
  }));
  if (sequence.some(g => g.status !== 'PASSED')) process.exitCode = 1;
}

main().catch(error => {
  console.error('[FATAL] 45-gate sequence verification failed:', error);
  process.exit(1);
});
