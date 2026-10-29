import { computeSha256 } from '../database/DatabaseSchema';
import { runEnterpriseVerification, EnterpriseTestResult } from '../tests/enterpriseVerification';
import { AuthoritativeVerificationPipeline } from '../tests/authoritativeVerificationPipeline';

export interface GateExecutionResult {
  gate_number: number;
  gate_id: string;
  name: string;
  category: 'AUTHORITATIVE_PIPELINE' | 'ENTERPRISE_INVARIANT' | 'MASTER_PROOF_CLOSURE';
  status: 'PASSED' | 'EXTERNAL_PROVIDER_REQUIRED' | 'BLOCKED' | 'FAIL';
  claim_scope: 'LOCAL' | 'MODEL' | 'SANDBOX' | 'PRODUCTION';
  duration_ms: number;
  evidence_hash: string;
  details: Record<string, any>;
}

export interface System46GatesReport {
  execution_id: string;
  timestamp: string;
  total_gates: 46;
  authoritative_gates_count: 15;
  enterprise_gates_count: 30;
  master_closure_gate_count: 1;
  gates_passed: number;
  external_provider_required_count: number;
  blocked_count: number;
  failed_count: number;
  all_local_and_model_passed: boolean;
  gates: GateExecutionResult[];
  overall_verdict: 'VERIFIED_SOVEREIGN_CLOSURE' | 'BLOCKED';
}

export class System46Gates {
  private static instance: System46Gates | null = null;

  public static getInstance(): System46Gates {
    if (!System46Gates.instance) {
      System46Gates.instance = new System46Gates();
    }
    return System46Gates.instance;
  }

  public async evaluateAll46Gates(): Promise<System46GatesReport> {
    const startedAt = Date.now();
    const executionId = `gate46_exec_${startedAt}`;
    const timestamp = new Date().toISOString();
    const evaluatedGates: GateExecutionResult[] = [];

    // -------------------------------------------------------------
    // PART 1: EVALUATE 15 AUTHORITATIVE PIPELINE GATES (GATES 01 - 15)
    // -------------------------------------------------------------
    const authPipeline = AuthoritativeVerificationPipeline.getInstance();
    const authReport = await authPipeline.runFullPipeline();

    for (let i = 0; i < authReport.gates.length; i++) {
      const g = authReport.gates[i];
      // Map pipeline statuses into the 46-gate vocabulary without promoting CONFIGURED to FAIL.
      // CONFIGURED means a provider is partially present but not fully verified — external boundary, not local failure.
      let gStatus: GateExecutionResult['status'] = 'FAIL';
      if (g.status === 'PASSED') gStatus = 'PASSED';
      else if (g.status === 'EXTERNAL_PROVIDER_REQUIRED' || g.status === 'CONFIGURED') gStatus = 'EXTERNAL_PROVIDER_REQUIRED';
      else if (g.status === 'BLOCKED') gStatus = 'BLOCKED';
      else if (g.status === 'FAILED') gStatus = 'FAIL';
      else gStatus = 'FAIL';

      evaluatedGates.push({
        gate_number: i + 1,
        gate_id: g.gate_id,
        name: g.name,
        category: 'AUTHORITATIVE_PIPELINE',
        status: gStatus,
        claim_scope: g.claim_scope,
        duration_ms: g.duration_ms,
        evidence_hash: computeSha256(JSON.stringify({ gate_id: g.gate_id, status: g.status, duration_ms: g.duration_ms, claim_scope: g.claim_scope, details: g.details })),
        details: g.details
      });
    }

    // -------------------------------------------------------------
    // PART 2: EVALUATE 30 ENTERPRISE INVARIANT GATES (GATES 16 - 45)
    // -------------------------------------------------------------
    const enterpriseReport = await runEnterpriseVerification();

    for (let i = 0; i < enterpriseReport.results.length; i++) {
      const inv = enterpriseReport.results[i];
      const gateNum = 15 + inv.test_number;
      const gateId = `INV-${String(inv.test_number).padStart(2, '0')}`;

      evaluatedGates.push({
        gate_number: gateNum,
        gate_id: gateId,
        name: inv.name,
        category: 'ENTERPRISE_INVARIANT',
        status: inv.passed ? 'PASSED' : 'FAIL',
        claim_scope: 'LOCAL',
        duration_ms: inv.duration_ms,
        evidence_hash: computeSha256(JSON.stringify({ gate_id: gateId, name: inv.name, passed: inv.passed, duration_ms: inv.duration_ms, details: inv.details })),
        details: inv.details
      });
    }

    // -------------------------------------------------------------
    // PART 3: EVALUATE MASTER PROOF & TRUTH-BOUNDARY CLOSURE GATE (GATE 46)
    // -------------------------------------------------------------
    const failedPrior = evaluatedGates.filter(g => g.status === 'FAIL').length;
    const passedPrior = evaluatedGates.filter(g => g.status === 'PASSED').length;
    const nonPassedPrior = evaluatedGates.filter(g => g.status !== 'PASSED').length;
    const failClosedChecks = enterpriseReport.results.filter(inv => /fail.closed|unauthorized|unverified.*blocked/i.test(inv.name));
    const externalBoundaryChecks = enterpriseReport.results.filter(inv => /external adapter inventory|paypal dn-35 server.authoritative fail.closed/i.test(inv.name));
    const failClosedActive = failClosedChecks.length > 0 && failClosedChecks.every(inv => inv.passed);
    const externalBoundariesPreserved = externalBoundaryChecks.length > 0 && externalBoundaryChecks.every(inv => inv.passed);
    const structuralIntegrityOk = evaluatedGates.length === 45 && failClosedActive && externalBoundariesPreserved;
    const masterPassed = structuralIntegrityOk && nonPassedPrior === 0 && failedPrior === 0;
    const masterBlocked = !masterPassed && structuralIntegrityOk && failedPrior === 0 && nonPassedPrior > 0;
    const masterStatus: GateExecutionResult['status'] = masterPassed
      ? 'PASSED'
      : masterBlocked ? 'BLOCKED' : 'FAIL';

    evaluatedGates.push({
      gate_number: 46,
      gate_id: 'GATE-46',
      name: 'Master Truth-Boundary & Proof Closure Gate',
      category: 'MASTER_PROOF_CLOSURE',
      status: masterStatus,
      claim_scope: 'LOCAL',
      duration_ms: Date.now() - startedAt,
      evidence_hash: computeSha256(JSON.stringify({ gate_id: 'GATE-46', master_passed: masterPassed, preceding_passed: passedPrior, preceding_failed: failedPrior, preceding_non_passed: nonPassedPrior, fail_closed_active: failClosedActive, external_boundaries_preserved: externalBoundariesPreserved })),
      details: {
        total_preceding_gates: 45,
        preceding_passed: passedPrior,
        preceding_failed: failedPrior,
        preceding_non_passed: nonPassedPrior,
        external_boundaries_preserved: externalBoundariesPreserved,
        fail_closed_active: failClosedActive,
        structural_integrity_ok: structuralIntegrityOk,
        closure_state: masterPassed ? 'VERIFIED' : masterBlocked ? 'BLOCKED' : 'FAILED'
      }
    });

    const passedCount = evaluatedGates.filter(g => g.status === 'PASSED').length;
    const extCount = evaluatedGates.filter(g => g.status === 'EXTERNAL_PROVIDER_REQUIRED').length;
    const blockedCount = evaluatedGates.filter(g => g.status === 'BLOCKED').length;
    const failCount = evaluatedGates.filter(g => g.status === 'FAIL').length;

    // Inventory must be exactly 46 unique gate_ids derived from this run (15 auth + 30 enterprise + 1 master).
    // Do not pad or synthesize missing gates.
    const uniqueIds = new Set(evaluatedGates.map(g => g.gate_id));
    if (evaluatedGates.length !== 46 || uniqueIds.size !== 46) {
      throw new Error(
        `System46Gates inventory invalid: length=${evaluatedGates.length} unique=${uniqueIds.size} (expected 46 unique). ` +
        `auth=${authReport.gates.length} enterprise=${enterpriseReport.results.length}`
      );
    }
    if (authReport.gates.length !== 15) {
      throw new Error(`Authoritative pipeline must contribute exactly 15 gates; observed ${authReport.gates.length}`);
    }
    if (enterpriseReport.results.length !== 30) {
      throw new Error(`Enterprise suite must contribute exactly 30 gates; observed ${enterpriseReport.results.length}`);
    }

    return {
      execution_id: executionId,
      timestamp,
      total_gates: 46,
      authoritative_gates_count: 15,
      enterprise_gates_count: 30,
      master_closure_gate_count: 1,
      gates_passed: passedCount,
      external_provider_required_count: extCount,
      blocked_count: blockedCount,
      failed_count: failCount,
      all_local_and_model_passed: failCount === 0 && extCount === 0 && blockedCount === 0 && passedCount === 46,
      gates: evaluatedGates,
      overall_verdict: failCount === 0 && extCount === 0 && blockedCount === 0 && passedCount === 46
        ? 'VERIFIED_SOVEREIGN_CLOSURE'
        : 'BLOCKED'
    };
  }
}
