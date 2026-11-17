import { type System46GatesReport } from './System46Gates';
export type System46Stage = 'INPUT' | 'OUTPUT';
export type System46Evaluator = () => Promise<System46GatesReport>;
export class System46GateBlockedError extends Error {
  constructor(public readonly stage: System46Stage, public readonly reason: string, public readonly report?: System46GatesReport) {
    super(`System blocked at ${stage}: ${reason}`);
    this.name = 'System46GateBlockedError';
  }
}
/** Fail-closed release authorization over the actual evaluated report. */
export async function requireSystem46Pass(stage: System46Stage, evaluate: System46Evaluator): Promise<System46GatesReport> {
  let report: System46GatesReport;
  try { report = await evaluate(); }
  catch (error) {
    throw new System46GateBlockedError(stage, error instanceof Error ? error.message : 'Gate evaluator failed.');
  }
  const gates = report?.gates;
  const validStatuses = new Set(['PASSED', 'EXTERNAL_PROVIDER_REQUIRED', 'BLOCKED', 'FAIL']);
  const expectedId = (index: number) => index < 15
    ? `GATE-${String(index + 1).padStart(2, '0')}`
    : index < 45 ? `INV-${String(index - 14).padStart(2, '0')}` : 'GATE-46';
  const expectedCategory = (index: number) => index < 15
    ? 'AUTHORITATIVE_PIPELINE'
    : index < 45 ? 'ENTERPRISE_INVARIANT' : 'MASTER_PROOF_CLOSURE';
  const structurallyValid =
    report?.total_gates === 46 && report.authoritative_gates_count === 15 &&
    report.enterprise_gates_count === 30 && report.master_closure_gate_count === 1 &&
    typeof report.execution_id === 'string' && report.execution_id.length > 0 &&
    Number.isFinite(Date.parse(report.timestamp)) && Array.isArray(gates) && gates.length === 46 &&
    gates.every((gate, index) => gate != null && gate.gate_number === index + 1 &&
      gate.gate_id === expectedId(index) && gate.category === expectedCategory(index) &&
      typeof gate.name === 'string' && gate.name.trim().length > 0 &&
      validStatuses.has(gate.status) &&
      ['LOCAL', 'MODEL', 'SANDBOX', 'PRODUCTION'].includes(gate.claim_scope) &&
      Number.isFinite(gate.duration_ms) && gate.duration_ms >= 0 &&
      typeof gate.evidence_hash === 'string' && /^[a-f0-9]{64}$/i.test(gate.evidence_hash) &&
      gate.details !== null && typeof gate.details === 'object') &&
    new Set(gates.map(gate => gate.gate_id)).size === 46;
  if (!structurallyValid) throw new System46GateBlockedError(stage, 'The 46-gate report is incomplete, duplicated, or has invalid evidence metadata.', report);
  const passed = gates.filter(gate => gate.status === 'PASSED').length;
  const external = gates.filter(gate => gate.status === 'EXTERNAL_PROVIDER_REQUIRED').length;
  const blocked = gates.filter(gate => gate.status === 'BLOCKED').length;
  const failed = gates.filter(gate => gate.status === 'FAIL').length;
  const summaryConsistent = report.gates_passed === passed &&
    report.external_provider_required_count === external && report.blocked_count === blocked &&
    report.failed_count === failed && report.all_local_and_model_passed === (passed === 46) &&
    report.overall_verdict === (passed === 46 ? 'VERIFIED_SOVEREIGN_CLOSURE' : 'BLOCKED');
  if (!summaryConsistent || passed !== 46 || external !== 0 || blocked !== 0 || failed !== 0) {
    throw new System46GateBlockedError(stage, 'Release denied: all 46 gates must pass with matching aggregate counts; blocked, failed, or external-provider gates remain closed.', report);
  }
  return report;
}
