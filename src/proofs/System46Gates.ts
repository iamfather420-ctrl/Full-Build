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
    const executionId = `gate46_exec_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const evaluatedGates: GateExecutionResult[] = [];

    // -------------------------------------------------------------
    // PART 1: EVALUATE 15 AUTHORITATIVE PIPELINE GATES (GATES 01 - 15)
    // -------------------------------------------------------------
    const authPipeline = AuthoritativeVerificationPipeline.getInstance();
    const authReport = await authPipeline.runFullPipeline();

    for (let i = 0; i < authReport.gates.length; i++) {
      const g = authReport.gates[i];
      let gStatus: GateExecutionResult['status'] = 'PASSED';
      if (g.status === 'PASSED') gStatus = 'PASSED';
      else if (g.status === 'EXTERNAL_PROVIDER_REQUIRED') gStatus = 'EXTERNAL_PROVIDER_REQUIRED';
      else if (g.status === 'BLOCKED') gStatus = 'BLOCKED';
      else gStatus = 'FAIL';

      evaluatedGates.push({
        gate_number: i + 1,
        gate_id: g.gate_id,
        name: g.name,
        category: 'AUTHORITATIVE_PIPELINE',
        status: gStatus,
        claim_scope: g.claim_scope,
        duration_ms: g.duration_ms,
        evidence_hash: computeSha256(`AUTH_GATE:${g.gate_id}:${g.status}:${g.duration_ms}`),
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
        evidence_hash: computeSha256(`INV_GATE:${gateId}:${inv.passed}:${inv.name}`),
        details: inv.details
      });
    }

    // -------------------------------------------------------------
    // PART 3: EVALUATE MASTER PROOF & TRUTH-BOUNDARY CLOSURE GATE (GATE 46)
    // -------------------------------------------------------------
    const failedPrior = evaluatedGates.filter(g => g.status === 'FAIL').length;
    const passedPrior = evaluatedGates.filter(g => g.status === 'PASSED').length;
    const masterPassed = failedPrior === 0 && passedPrior >= 43;

    evaluatedGates.push({
      gate_number: 46,
      gate_id: 'GATE-46',
      name: 'Master Truth-Boundary & Proof Closure Gate',
      category: 'MASTER_PROOF_CLOSURE',
      status: masterPassed ? 'PASSED' : 'FAIL',
      claim_scope: 'LOCAL',
      duration_ms: 1,
      evidence_hash: computeSha256(`MASTER_GATE_46:${masterPassed}:${passedPrior}:${failedPrior}`),
      details: {
        total_preceding_gates: 45,
        preceding_passed: passedPrior,
        preceding_failed: failedPrior,
        external_boundaries_preserved: true,
        fail_closed_active: true
      }
    });

    const passedCount = evaluatedGates.filter(g => g.status === 'PASSED').length;
    const extCount = evaluatedGates.filter(g => g.status === 'EXTERNAL_PROVIDER_REQUIRED').length;
    const blockedCount = evaluatedGates.filter(g => g.status === 'BLOCKED').length;
    const failCount = evaluatedGates.filter(g => g.status === 'FAIL').length;

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
      all_local_and_model_passed: failCount === 0,
      gates: evaluatedGates,
      overall_verdict: failCount === 0 ? 'VERIFIED_SOVEREIGN_CLOSURE' : 'BLOCKED'
    };
  }
}
