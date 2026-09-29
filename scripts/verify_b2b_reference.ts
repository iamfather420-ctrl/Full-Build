import { AuthService } from '../src/auth/AuthService';
import { SqliteStore } from '../src/database/SqliteStore';
import { DurableStore } from '../src/database/DurableStore';
import { SovereignApiRouter } from '../src/api/ApiRouter';
import { B2BReferenceCaseService } from '../src/b2b/B2BReferenceCaseService';
import { computeSha256 } from '../src/database/DatabaseSchema';
import fs from 'node:fs';

process.env.SOLVEX_AUTH_SECRET = process.env.SOLVEX_AUTH_SECRET || 'test-only-auth-secret-with-at-least-thirty-two-characters';
const candidateId = 'DH-C-B28A191DCBFE70D0';
const tenantId = 'TENANT_SOVEREIGN_ROOT';
const auth = AuthService.getInstance();
const service = B2BReferenceCaseService.getInstance();
const sqlite = SqliteStore.getInstance();
const durable = DurableStore.getInstance();

function ensureCandidate() {
  const source = `export function zenoConvergenceStep(distance: number, epsilon: number): number {\n  if (!Number.isFinite(distance) || !Number.isFinite(epsilon) || epsilon <= 0) throw new Error('finite distance and positive epsilon required');\n  return distance <= epsilon ? 0 : distance / 2;\n}`;
  if (durable.getState().solutions[candidateId]) return;
  const candidate = { id: candidateId, code: candidateId, title: 'Candidate solution for DH-P-001', domain: 'MATHEMATICAL_ANALYSIS', problem_ref: 'DH-P-001', paradox_ref: 'DH-P-001', implementation_source: source, implementation_hash: computeSha256(source), verification_status: 'PARTIAL' as const, proof_bundle_id: '', performance_boost_percent: 0, reversibility_guaranteed: false, status: 'PARTIAL' };
  sqlite.insertRecord('solutions', { ...candidate, tenant_id: tenantId, origin_classification: 'EXISTING_REGISTRY', execution_classification: 'CODE_EXECUTED', evidence_status: 'MISSING' });
  durable.getState().solutions[candidateId] = candidate;
  durable.persist();
}

function expectReject(name: string, fn: () => unknown) {
  try { fn(); throw new Error(`${name}: operation unexpectedly succeeded`); } catch (error: any) {
    if (String(error.message).includes('unexpectedly succeeded')) throw error;
    return { name, passed: true, reason: error.message };
  }
}

async function main() {
  ensureCandidate();
  const evaluator = { user_id: 'evaluator-reference-01', tenant_id: tenantId, email: 'evaluator@reference.invalid', role: 'VERIFIER' as const, issued_at: Date.now(), expires_at: Date.now() + 60000, issuer: 'SOLVEX' as const, audience: 'SOLVEX_API' as const, token_id: 'reference-token' };
  const customer = { ...evaluator, user_id: 'customer-not-evaluator', role: 'CUSTOMER' as const };
  const results: any[] = [];
  results.push(await SovereignApiRouter.getInstance().handleRequest('/api/b2b/reference-cases', 'POST', {}));
  results.push(expectReject('missing acceptance criteria', () => service.createReferenceCase({ candidate_id: candidateId, solution_id: candidateId, customer_or_evaluator_type: 'REFERENCE_ONLY', problem_statement: 'Reference problem', business_context: 'Synthetic engineering fixture', required_inputs: { distance: 10, epsilon: 1 }, expected_outputs: { output: 5 }, acceptance_criteria: [], measurable_outcomes: ['output matches'], test_dataset_reference: 'synthetic-b2b-dataset-v1', authorization_reference: 'internal-test-only', evaluator_identity_reference: 'reference-evaluator' , evidence_type: 'INTERNAL_SYNTHETIC' }, evaluator)));
  results.push(expectReject('missing evaluator authorization', () => service.createReferenceCase({ candidate_id: candidateId, solution_id: candidateId, customer_or_evaluator_type: 'REFERENCE_ONLY', problem_statement: 'Reference problem', business_context: 'Synthetic engineering fixture', required_inputs: { distance: 10, epsilon: 1 }, expected_outputs: { output: 5 }, acceptance_criteria: ['output equals reference result'], measurable_outcomes: ['deterministic output'], test_dataset_reference: 'synthetic-b2b-dataset-missing-auth', authorization_reference: '', evaluator_identity_reference: 'reference-evaluator', evidence_type: 'INTERNAL_SYNTHETIC' }, evaluator)));
  results.push(expectReject('unauthorized evaluator role', () => service.createReferenceCase({ candidate_id: candidateId, solution_id: candidateId, customer_or_evaluator_type: 'REFERENCE_ONLY', problem_statement: 'Reference problem', business_context: 'Synthetic engineering fixture', required_inputs: { distance: 10, epsilon: 1 }, expected_outputs: { output: 5 }, acceptance_criteria: ['output equals reference result'], measurable_outcomes: ['deterministic output'], test_dataset_reference: 'synthetic-b2b-dataset-unauthorized', authorization_reference: 'internal-test-only', evaluator_identity_reference: 'customer-not-evaluator', evidence_type: 'INTERNAL_SYNTHETIC' }, customer)));
  results.push(expectReject('wrong candidate', () => service.createReferenceCase({ candidate_id: 'DH-C-WRONG', solution_id: 'DH-C-WRONG', customer_or_evaluator_type: 'REFERENCE_ONLY', problem_statement: 'Reference problem', business_context: 'Synthetic engineering fixture', required_inputs: { distance: 10, epsilon: 1 }, expected_outputs: { output: 5 }, acceptance_criteria: ['output equals reference result'], measurable_outcomes: ['deterministic output'], test_dataset_reference: 'synthetic-b2b-dataset-wrong-candidate', authorization_reference: 'internal-test-only', evaluator_identity_reference: 'reference-evaluator', evidence_type: 'INTERNAL_SYNTHETIC' }, evaluator)));

  const datasetReference = `synthetic-b2b-dataset-v1-${Date.now()}`;
  const referenceInput = { candidate_id: candidateId, solution_id: candidateId, customer_or_evaluator_type: 'REFERENCE_ONLY' as const, problem_statement: 'Reference case for testing the B2B evaluation mechanism; not a customer claim.', business_context: 'Synthetic engineering fixture only; no customer data or acceptance is asserted.', required_inputs: { distance: 10, epsilon: 1 }, expected_outputs: { output: 5 }, acceptance_criteria: ['Exact implementation returns 0 when distance is at or below epsilon and distance/2 otherwise.'], measurable_outcomes: ['Observed output equals expected output for supplied reference inputs.'], test_dataset_reference: datasetReference, authorization_reference: 'internal-test-only', evaluator_identity_reference: 'reference-evaluator', evidence_type: 'INTERNAL_SYNTHETIC' as const };
  const reference = service.createReferenceCase(referenceInput, evaluator);
  const evaluatorToken = auth.createSignedToken(evaluator.user_id, evaluator.tenant_id, evaluator.email, evaluator.role);
  const apiHeaders = { authorization: `Bearer ${evaluatorToken}` };
  const apiReference = await SovereignApiRouter.getInstance().handleRequest('/api/b2b/reference-cases', 'POST', referenceInput, apiHeaders);
  if (apiReference.status !== 201) throw new Error(`Authorized reference-case API path failed: ${apiReference.status}`);
  const apiReadiness = await SovereignApiRouter.getInstance().handleRequest(`/api/b2b/readiness/${candidateId}`, 'GET');
  if (apiReadiness.status !== 200) throw new Error('Public B2B readiness route failed');
  results.push({ name: 'authorized server-side B2B API path', passed: true });
  const failed = service.executeAuthorizedEvaluation(reference.reference_case_id, { distance: 10, epsilon: 1 }, 999, evaluator);
  if (failed.evaluation_result !== 'FAILED') throw new Error('Failed business outcome was not recorded as FAILED');
  results.push({ name: 'failed business outcome', passed: true });
  results.push(expectReject('failed acceptance', () => service.commitAcceptance(failed.evaluation_id, evaluator)));
  const passed = service.executeAuthorizedEvaluation(reference.reference_case_id, { distance: 1, epsilon: 1 }, 0, evaluator);
  results.push(expectReject('synthetic evidence cannot be accepted as customer evidence', () => service.commitAcceptance(passed.evaluation_id, evaluator)));
  results.push(expectReject('duplicate evaluation replay', () => service.executeAuthorizedEvaluation(reference.reference_case_id, { distance: 1, epsilon: 1 }, 0, evaluator)));
  const before = sqlite.findRecordById<any>('verification_runs', reference.reference_case_id);
  sqlite.insertRecord('verification_runs', { id: reference.reference_case_id, tenant_id: tenantId, record_type: 'B2B_REFERENCE_CASE', reference_case: { ...before.reference_case, implementation_hash: 'tampered-hash' }, status: 'B2B_REFERENCE_READY' });
  results.push(expectReject('wrong implementation hash', () => service.executeAuthorizedEvaluation(reference.reference_case_id, { distance: 2, epsilon: 1 }, 1, evaluator)));
  sqlite.insertRecord('verification_runs', { id: reference.reference_case_id, tenant_id: tenantId, record_type: 'B2B_REFERENCE_CASE', reference_case: before.reference_case, status: 'B2B_REFERENCE_READY' });
  const readiness = service.getReadiness(candidateId);
  if (readiness.technical_verification !== 'PASSED' || readiness.b2b_acceptance !== 'MISSING' || readiness.independent_b2b_evidence !== 'MISSING' || readiness.marketplace_publication !== 'BLOCKED') throw new Error('Readiness gate did not remain blocked');
  results.push({ name: 'technical pass without B2B acceptance remains blocked', passed: true, readiness });
  const reportPath = 'artifacts/b2b-reference-verification-v2.json';
  fs.writeFileSync(reportPath, JSON.stringify({ execution_classification: 'CODE_EXECUTED', synthetic_data_only: true, customer_claims: 'NONE', candidate_id: candidateId, reference_case_id: reference.reference_case_id, negative_cases: results, readiness, lifecycle: ['PARTIAL', 'TECHNICALLY_VERIFIED', 'B2B_REFERENCE_READY', 'AUTHORIZED_EVALUATION', 'B2B_ACCEPTANCE_EVIDENCE', 'INDEPENDENT_VERIFICATION', 'VERIFIED', 'MARKETPLACE_PUBLISHED'], marketplace_publication: 'NOT_ATTEMPTED' }, null, 2));
  console.log(JSON.stringify({ candidate_id: candidateId, reference_case_id: reference.reference_case_id, technical_verification: 'PASSED', b2b_reference_framework: 'IMPLEMENTED', b2b_evaluation_workflow: 'IMPLEMENTED_TESTED', customer_acceptance_evidence: 'MISSING', independent_b2b_evidence: 'MISSING', marketplace_eligibility: 'BLOCKED', marketplace_publication: 'NOT_ATTEMPTED', all_negative_cases_passed: results.every(r => r.passed !== false), artifact: reportPath }, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
