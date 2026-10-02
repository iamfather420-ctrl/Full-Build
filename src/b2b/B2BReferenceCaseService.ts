import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import { computeSha256 } from '../database/DatabaseSchema';
import { DurableStore } from '../database/DurableStore';
import { SqliteStore } from '../database/SqliteStore';
import { AuthService, UserContext } from '../auth/AuthService';

export type B2BEvidenceType = 'INTERNAL_SYNTHETIC' | 'INTERNAL_ENGINEERING' | 'AUTHORIZED_EVALUATOR' | 'CUSTOMER_ACCEPTANCE' | 'EXTERNAL_INDEPENDENT_EVIDENCE';
export type ReferenceCaseStatus = 'B2B_REFERENCE_READY' | 'AUTHORIZED_EVALUATION' | 'ACCEPTED' | 'REJECTED' | 'HOLD';

export interface B2BReferenceCase {
  reference_case_id: string;
  candidate_id: string;
  solution_id: string;
  customer_or_evaluator_type: 'REFERENCE_ONLY' | 'AUTHORIZED_EVALUATOR' | 'CUSTOMER';
  problem_statement: string;
  business_context: string;
  required_inputs: unknown;
  expected_outputs: unknown;
  acceptance_criteria: string[];
  measurable_outcomes: string[];
  test_dataset_reference: string;
  authorization_reference: string;
  evaluator_identity_reference: string;
  created_at: number;
  updated_at: number;
  status: ReferenceCaseStatus;
  evidence_type: B2BEvidenceType;
  solution_version: string;
  implementation_hash: string;
}

export interface B2BEvaluationEvidence {
  evaluation_id: string;
  reference_case_id: string;
  candidate_id: string;
  solution_version: string;
  implementation_hash: string;
  input_hash: string;
  expected_output_hash: string;
  observed_output_hash: string;
  acceptance_criteria: string[];
  evaluation_result: 'PASSED' | 'FAILED';
  evaluator_authorization: string;
  evaluator_identity_reference: string;
  evidence_type: B2BEvidenceType;
  test_environment: Record<string, string>;
  dependency_manifest: Record<string, string>;
  timestamp: number;
  evidence_hash: string;
  status: 'RECORDED' | 'REJECTED' | 'DUPLICATE';
}

export interface B2BReadiness {
  candidate_id: string;
  technical_verification: 'PASSED' | 'MISSING';
  b2b_acceptance: 'PRESENT' | 'MISSING';
  independent_b2b_evidence: 'PRESENT' | 'MISSING';
  marketplace_publication: 'ELIGIBLE' | 'BLOCKED';
  payment: 'CONFIGURED' | 'NOT_CONFIGURED';
  production: 'READY' | 'BLOCKED';
  reasons: string[];
}

const TABLE = 'verification_runs';
const TENANT = 'TENANT_SOVEREIGN_ROOT';
const REQUIRED_EVIDENCE_TYPES = new Set<B2BEvidenceType>(['AUTHORIZED_EVALUATOR', 'CUSTOMER_ACCEPTANCE', 'EXTERNAL_INDEPENDENT_EVIDENCE']);

function stableHash(value: unknown): string { return computeSha256(JSON.stringify(value)); }

export class B2BReferenceCaseService {
  private static instance: B2BReferenceCaseService | null = null;
  private readonly sqlite = SqliteStore.getInstance();
  private readonly durable = DurableStore.getInstance();
  private readonly auth = AuthService.getInstance();

  public static getInstance(): B2BReferenceCaseService {
    if (!this.instance) this.instance = new B2BReferenceCaseService();
    return this.instance;
  }

  private requireEvaluator(user: UserContext): void {
    const permitted = this.auth.authorize(user, 'VIEW_EVIDENCE', user.tenant_id);
    if (!permitted.authorized || !['VERIFIER', 'ADMIN', 'OWNER'].includes(user.role)) throw new Error(permitted.reason || 'Authorized evaluator role is required');
  }

  private getCandidate(candidateId: string): any {
    const candidate = this.durable.getState().solutions[candidateId] || this.sqlite.findRecordById<any>('solutions', candidateId);
    if (!candidate) throw new Error('Candidate not found');
    return candidate;
  }

  private getReference(referenceCaseId: string): B2BReferenceCase | undefined {
    return this.sqlite.findRecordById<any>(TABLE, referenceCaseId)?.reference_case as B2BReferenceCase | undefined;
  }

  public createReferenceCase(input: Omit<B2BReferenceCase, 'reference_case_id' | 'created_at' | 'updated_at' | 'status' | 'implementation_hash' | 'solution_version'>, user: UserContext): B2BReferenceCase {
    this.requireEvaluator(user);
    if (input.candidate_id !== input.solution_id) throw new Error('Candidate and solution binding mismatch');
    if (!input.problem_statement.trim() || !input.business_context.trim()) throw new Error('Problem statement and business context are required');
    if (!Array.isArray(input.acceptance_criteria) || input.acceptance_criteria.length === 0 || input.acceptance_criteria.some(x => !String(x).trim())) throw new Error('At least one acceptance criterion is required');
    if (!Array.isArray(input.measurable_outcomes) || input.measurable_outcomes.length === 0) throw new Error('At least one measurable outcome is required');
    if (!input.test_dataset_reference || !input.authorization_reference || !input.evaluator_identity_reference) throw new Error('Dataset, authorization, and evaluator references are required');
    if (!['REFERENCE_ONLY', 'AUTHORIZED_EVALUATOR', 'CUSTOMER'].includes(input.customer_or_evaluator_type)) throw new Error('Invalid evaluator type');
    const candidate = this.getCandidate(input.candidate_id);
    const referenceCaseId = `b2bref_${computeSha256(`${input.candidate_id}:${input.test_dataset_reference}:${input.authorization_reference}`).slice(0, 24)}`;
    const existing = this.getReference(referenceCaseId);
    if (existing) return existing;
    const reference: B2BReferenceCase = {
      ...input,
      reference_case_id: referenceCaseId,
      implementation_hash: candidate.implementation_hash,
      solution_version: '1.0.0-candidate',
      created_at: Date.now(), updated_at: Date.now(), status: 'B2B_REFERENCE_READY'
    };
    this.sqlite.insertRecord(TABLE, { id: referenceCaseId, tenant_id: user.tenant_id, record_type: 'B2B_REFERENCE_CASE', reference_case: reference, status: reference.status });
    this.durable.appendAudit(user.tenant_id, user.user_id, 'B2B_REFERENCE_CASE_CREATED', 'B2B_REFERENCE_CASE', referenceCaseId, { candidate_id: reference.candidate_id, implementation_hash: reference.implementation_hash, evidence_type: reference.evidence_type });
    return reference;
  }

  private executeExactImplementation(candidate: any, inputs: unknown): unknown {
    if (candidate.implementation_hash !== computeSha256(candidate.implementation_source)) throw new Error('Candidate implementation hash is corrupt');
    const compiled = transformSync(candidate.implementation_source, { loader: 'ts', format: 'cjs', target: 'es2020', sourcemap: false }).code;
    const module = { exports: {} as Record<string, unknown> };
    const context = vm.createContext({ module, exports: module.exports, Number, Error });
    new vm.Script(compiled, { filename: `${candidate.id}.b2b.cjs` }).runInContext(context, { timeout: 1000 });
    const fn = module.exports.zenoConvergenceStep;
    if (typeof fn !== 'function') throw new Error('Reference case requires the supported candidate entrypoint');
    const value = inputs as any;
    return (fn as (distance: number, epsilon: number) => number)(Number(value.distance), Number(value.epsilon));
  }

  public executeAuthorizedEvaluation(referenceCaseId: string, inputs: unknown, expectedOutputs: unknown, user: UserContext): B2BEvaluationEvidence {
    this.requireEvaluator(user);
    const reference = this.getReference(referenceCaseId);
    if (!reference) throw new Error('Reference case not found');
    if (reference.status !== 'B2B_REFERENCE_READY' && reference.status !== 'AUTHORIZED_EVALUATION') throw new Error(`Reference case is not evaluable from status ${reference.status}`);
    const candidate = this.getCandidate(reference.candidate_id);
    if (candidate.implementation_hash !== reference.implementation_hash || candidate.id !== reference.solution_id) throw new Error('Exact candidate implementation binding failed');
    const observed = this.executeExactImplementation(candidate, inputs);
    const passed = JSON.stringify(observed) === JSON.stringify(expectedOutputs);
    const evaluationId = `b2beval_${computeSha256(`${referenceCaseId}:${stableHash(inputs)}:${reference.implementation_hash}`).slice(0, 24)}`;
    const existing = this.sqlite.findRecordById<any>(TABLE, evaluationId);
    if (existing) throw new Error('Duplicate or replayed evaluation rejected');
    const evidenceBase = {
      evaluation_id: evaluationId, reference_case_id: referenceCaseId, candidate_id: reference.candidate_id, solution_version: reference.solution_version,
      implementation_hash: reference.implementation_hash, input_hash: stableHash(inputs), expected_output_hash: stableHash(expectedOutputs), observed_output_hash: stableHash(observed),
      acceptance_criteria: reference.acceptance_criteria, evaluation_result: passed ? 'PASSED' as const : 'FAILED' as const,
      evaluator_authorization: reference.authorization_reference, evaluator_identity_reference: user.user_id, evidence_type: reference.evidence_type,
      test_environment: { node: process.version, runtime: 'server-side-esbuild-vm', execution: 'CODE_EXECUTED' }, dependency_manifest: { esbuild: 'local-pinned-runtime' }, timestamp: Date.now()
    };
    const evidence: B2BEvaluationEvidence = { ...evidenceBase, evidence_hash: stableHash(evidenceBase), status: 'RECORDED' };
    this.sqlite.insertRecord(TABLE, { id: evaluationId, tenant_id: user.tenant_id, record_type: 'B2B_EVALUATION_EVIDENCE', evaluation: evidence, status: evidence.status });
    this.sqlite.updateTenantRecord(TABLE, user.tenant_id, referenceCaseId, { reference_case: { ...reference, status: 'AUTHORIZED_EVALUATION', updated_at: Date.now() }, status: 'AUTHORIZED_EVALUATION' });
    this.durable.appendAudit(user.tenant_id, user.user_id, 'B2B_EVALUATION_EXECUTED', 'B2B_EVALUATION', evaluationId, { reference_case_id: referenceCaseId, implementation_hash: reference.implementation_hash, evaluation_result: evidence.evaluation_result, evidence_type: evidence.evidence_type });
    return evidence;
  }

  public commitAcceptance(evaluationId: string, user: UserContext): B2BEvaluationEvidence {
    this.requireEvaluator(user);
    const record = this.sqlite.findTenantRecordById<any>(TABLE, user.tenant_id, evaluationId);
    const evidence = record?.evaluation as B2BEvaluationEvidence | undefined;
    if (!evidence) throw new Error('Evaluation evidence not found');
    if (!REQUIRED_EVIDENCE_TYPES.has(evidence.evidence_type)) throw new Error('Evidence type is not eligible for B2B acceptance');
    if (evidence.evaluator_identity_reference !== user.user_id) throw new Error('Evaluator identity mismatch');
    if (evidence.evaluation_result !== 'PASSED') throw new Error('Failed business outcome cannot be accepted');
    const { evidence_hash: _evidenceHash, status: _status, ...unsignedEvidence } = evidence;
    const expectedHash = stableHash(unsignedEvidence);
    if (expectedHash !== evidence.evidence_hash) throw new Error('Evidence tampering detected');
    const reference = this.getReference(evidence.reference_case_id);
    if (!reference || reference.implementation_hash !== evidence.implementation_hash) throw new Error('Reference implementation binding mismatch');
    const accepted = { ...evidence, status: 'RECORDED' as const };
    this.sqlite.updateTenantRecord(TABLE, user.tenant_id, evaluationId, { evaluation: accepted, status: 'ACCEPTED' });
    this.sqlite.updateTenantRecord(TABLE, user.tenant_id, reference.reference_case_id, { reference_case: { ...reference, status: 'ACCEPTED', updated_at: Date.now() }, status: 'ACCEPTED' });
    this.durable.appendAudit(user.tenant_id, user.user_id, 'B2B_ACCEPTANCE_COMMITTED', 'B2B_EVALUATION', evaluationId, { candidate_id: evidence.candidate_id, implementation_hash: evidence.implementation_hash, evidence_type: evidence.evidence_type });
    return accepted;
  }

  public getReadiness(candidateId: string): B2BReadiness {
    const evidencePath = path.resolve('artifacts', `candidate-verification-${candidateId}.json`);
    let technicalVerification: B2BReadiness['technical_verification'] = 'MISSING';
    try { const report = JSON.parse(fs.readFileSync(evidencePath, 'utf8')); if (report.local_evidence_complete === true || report.verification_status === 'HOLD') technicalVerification = 'PASSED'; } catch {}
    const cases = this.sqlite.findAllRecords<any>(TABLE, 1000).map(r => r.reference_case).filter(Boolean).filter((r: B2BReferenceCase) => r.candidate_id === candidateId);
    const accepted = cases.some((r: B2BReferenceCase) => r.status === 'ACCEPTED' && REQUIRED_EVIDENCE_TYPES.has(r.evidence_type));
    const independent = this.sqlite.findAllRecords<any>(TABLE, 1000).map(r => r.evaluation).filter(Boolean).some((e: B2BEvaluationEvidence) => e.candidate_id === candidateId && e.status === 'RECORDED' && e.evidence_type === 'EXTERNAL_INDEPENDENT_EVIDENCE');
    const reasons: string[] = [];
    if (technicalVerification !== 'PASSED') reasons.push('Technical verification evidence is missing');
    if (!accepted) reasons.push('B2B acceptance evidence is missing');
    if (!independent) reasons.push('Independent B2B evidence is missing');
    reasons.push('Payment is not configured');
    reasons.push('Commercial production prerequisites are not configured');
    return { candidate_id: candidateId, technical_verification: technicalVerification, b2b_acceptance: accepted ? 'PRESENT' : 'MISSING', independent_b2b_evidence: independent ? 'PRESENT' : 'MISSING', marketplace_publication: technicalVerification === 'PASSED' && accepted && independent ? 'ELIGIBLE' : 'BLOCKED', payment: 'NOT_CONFIGURED', production: 'BLOCKED', reasons };
  }
}
