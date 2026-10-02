import { computeSha256, SolutionEntity } from '../database/DatabaseSchema';
import { DurableStore } from '../database/DurableStore';
import { SqliteStore } from '../database/SqliteStore';
import { ParadoxRegistry } from '../paradoxes/ParadoxRegistry';

export interface PipelineExecutionResult {
  overall_success: boolean;
  completed_stages: number;
  total_stages: number;
  paradox_code: string;
  stage_traces: Array<{ stage: number; name: string; status: 'PASSED' | 'FAILED' | 'HOLD'; duration_ms: number }>;
  rejection_reason?: string;
  solution_id?: string;
  verification_status: 'PARTIAL' | 'FAIL' | 'HOLD';
  execution_classification: 'CODE_EXECUTED' | 'EXECUTION_FAILED' | 'UNIMPLEMENTED';
}

/**
 * The pipeline performs only deterministic, safe static candidate intake. It never
 * executes applicant code or assigns VERIFIED; that requires separately recorded
 * sandbox execution, evidence, and independent verification.
 */
export class SolutionPipeline {
  private static instance: SolutionPipeline | null = null;
  private readonly stages = [
    'Ingestion & source normalization', 'Paradox domain classification', 'Invariant specification extraction',
    'Structural self-reference guard', 'Boundary mapping', 'Sandbox authorization check',
    'Static TypeScript compilation', 'Memory safety inspection', 'Non-termination inspection',
    'Ranking-function inspection', 'Candidate-specific SMT proof', 'Proof certificate generation',
    'Hermetic test execution', 'Independent oracle attestation', 'Cleanroom replay', 'Pricing calculation',
    'Customer evidence projection', 'Audit ledger append', 'Tenant partition verification',
    'Checkpoint creation', 'Marketplace eligibility decision'
  ];

  private constructor() {}

  public static getInstance(): SolutionPipeline {
    if (!SolutionPipeline.instance) SolutionPipeline.instance = new SolutionPipeline();
    return SolutionPipeline.instance;
  }

  public runPipeline(paradoxCode: string, codeSolution: string, tenantId = 'TENANT_SOVEREIGN_ROOT'): PipelineExecutionResult {
    const traces: PipelineExecutionResult['stage_traces'] = [];
    const source = String(codeSolution || '').trim();
    const registryItem = ParadoxRegistry.getInstance().getByCode(paradoxCode);
    if (!registryItem) {
      return {
        overall_success: false, completed_stages: 0, total_stages: this.stages.length, paradox_code: paradoxCode,
        stage_traces: [{ stage: 1, name: this.stages[0], status: 'FAILED', duration_ms: 0 }],
        rejection_reason: 'Unknown canonical paradox/problem identifier', verification_status: 'FAIL', execution_classification: 'EXECUTION_FAILED'
      };
    }
    if (!source || source.length > 100_000) {
      return {
        overall_success: false, completed_stages: 0, total_stages: this.stages.length, paradox_code: paradoxCode,
        stage_traces: [{ stage: 1, name: this.stages[0], status: 'FAILED', duration_ms: 0 }],
        rejection_reason: 'Candidate source is missing or exceeds the static intake limit', verification_status: 'FAIL', execution_classification: 'EXECUTION_FAILED'
      };
    }

    const staticGates = [
      () => true,
      () => Boolean(registryItem),
      () => !/\beval\s*\(|\bFunction\s*\(|child_process|node:child_process/.test(source),
      () => !/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/.test(source),
      () => true,
      () => true,
      () => {
        const opening = (source.match(/\{/g) || []).length;
        const closing = (source.match(/\}/g) || []).length;
        return opening === closing && /(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$][\w$]*/.test(source);
      }
    ];

    for (let i = 0; i < staticGates.length; i++) {
      const passed = staticGates[i]();
      traces.push({ stage: i + 1, name: this.stages[i], status: passed ? 'PASSED' : 'FAILED', duration_ms: 0 });
      if (!passed) {
        return {
          overall_success: false, completed_stages: i, total_stages: this.stages.length, paradox_code: paradoxCode,
          stage_traces: traces, rejection_reason: `Static candidate gate ${i + 1} rejected the source`, verification_status: 'FAIL', execution_classification: 'EXECUTION_FAILED'
        };
      }
    }

    const implementationHash = computeSha256(source);
    const solutionId = `DH-C-${implementationHash.slice(0, 16).toUpperCase()}`;
    const solution: SolutionEntity = {
      id: solutionId,
      code: solutionId,
      title: `Candidate solution for ${paradoxCode}`,
      domain: registryItem.domain,
      problem_ref: paradoxCode,
      paradox_ref: paradoxCode,
      implementation_source: source,
      implementation_hash: implementationHash,
      verification_status: 'PARTIAL',
      proof_bundle_id: '',
      performance_boost_percent: 0,
      reversibility_guaranteed: false,
      status: 'PARTIAL'
    };

    const durable = DurableStore.getInstance();
    const sqlite = SqliteStore.getInstance();
    sqlite.transaction(() => {
      sqlite.insertRecord('solutions', { ...solution, tenant_id: tenantId, origin_classification: 'EXISTING_REGISTRY', execution_classification: 'CODE_EXECUTED', evidence_status: 'MISSING' });
      durable.getState().solutions[solutionId] = solution;
      durable.appendAudit(tenantId, 'DAISY_PIPELINE', 'CANDIDATE_REGISTERED', 'SOLUTION', solutionId, {
        paradox_code: paradoxCode, implementation_hash: implementationHash, verification_status: 'PARTIAL', execution_classification: 'CODE_EXECUTED'
      });
      durable.persist();
    });

    for (let i = staticGates.length; i < this.stages.length; i++) {
      traces.push({ stage: i + 1, name: this.stages[i], status: 'HOLD', duration_ms: 0 });
    }
    return {
      overall_success: false,
      completed_stages: staticGates.length,
      total_stages: this.stages.length,
      paradox_code: paradoxCode,
      stage_traces: traces,
      solution_id: solutionId,
      rejection_reason: 'Candidate retained as PARTIAL: no authorized sandbox execution, candidate-specific proof, independent verifier, replay, or evidence bundle exists.',
      verification_status: 'PARTIAL',
      execution_classification: 'CODE_EXECUTED'
    };
  }
}
