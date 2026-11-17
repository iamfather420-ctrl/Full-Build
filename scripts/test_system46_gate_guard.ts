import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { requireSystem46Pass, System46GateBlockedError } from '../src/proofs/System46GateGuard';
import type { GateExecutionResult, System46GatesReport } from '../src/proofs/System46Gates';
function makeReport(): System46GatesReport {
  const gates: GateExecutionResult[] = Array.from({ length: 46 }, (_, index) => ({
    gate_number: index + 1,
    gate_id: index < 15 ? `GATE-${String(index + 1).padStart(2, '0')}` : index < 45 ? `INV-${String(index - 14).padStart(2, '0')}` : 'GATE-46',
    name: `Test gate ${index + 1}`,
    category: index < 15 ? 'AUTHORITATIVE_PIPELINE' : index < 45 ? 'ENTERPRISE_INVARIANT' : 'MASTER_PROOF_CLOSURE',
    status: 'PASSED', claim_scope: 'LOCAL', duration_ms: 1,
    evidence_hash: createHash('sha256').update(String(index + 1)).digest('hex'), details: {},
  }));
  return { execution_id: 'test-execution', timestamp: new Date().toISOString(), total_gates: 46,
    authoritative_gates_count: 15, enterprise_gates_count: 30, master_closure_gate_count: 1,
    gates_passed: 46, external_provider_required_count: 0, blocked_count: 0, failed_count: 0,
    all_local_and_model_passed: true, gates, overall_verdict: 'VERIFIED_SOVEREIGN_CLOSURE' };
}
async function blocked(report: System46GatesReport | (() => Promise<System46GatesReport>), label: string) {
  await assert.rejects(() => requireSystem46Pass('OUTPUT', typeof report === 'function' ? report : async () => report),
    error => error instanceof System46GateBlockedError, label);
}
async function main() {
  const passing = makeReport();
  assert.equal(await requireSystem46Pass('OUTPUT', async () => passing), passing);
  const failed = makeReport(); failed.gates[7].status = 'FAIL'; failed.gates_passed = 45;
  failed.failed_count = 1; failed.all_local_and_model_passed = false; failed.overall_verdict = 'BLOCKED';
  await blocked(failed, 'Failed gate blocks.');
  const external = makeReport(); external.gates[10].status = 'EXTERNAL_PROVIDER_REQUIRED';
  external.gates_passed = 45; external.external_provider_required_count = 1;
  external.all_local_and_model_passed = false; external.overall_verdict = 'BLOCKED';
  await blocked(external, 'External provider gate blocks.');
  const missing = makeReport(); missing.gates.pop(); await blocked(missing, 'Missing gate blocks.');
  const duplicate = makeReport(); duplicate.gates[1].gate_id = duplicate.gates[0].gate_id;
  await blocked(duplicate, 'Duplicate ID blocks.');
  const badDigest = makeReport(); badDigest.gates[0].evidence_hash = 'bad';
  await blocked(badDigest, 'Malformed digest blocks.');
  const inconsistent = makeReport(); inconsistent.failed_count = 1;
  await blocked(inconsistent, 'Inconsistent counters block.');
  await blocked(async () => { throw new Error('injected evaluator failure'); }, 'Evaluator errors fail closed.');
  console.log('PASS: System 46 release guard rejects incomplete, invalid, or non-passing evidence.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
