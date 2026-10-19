import assert from 'node:assert/strict';
import { NOPOTEngine, NOPOTVerifier } from '../src/proofs/NOPOTProof';
import { MMTAIProtocol } from '../src/mmtai/MMTAIProtocol';
import { Z3FormalProofEngine } from '../src/proofs/Z3FormalProofEngine';

const bounded = NOPOTVerifier.verifyAlgorithmTermination('decrement', n => n - 1, 5, 5);
assert.equal(bounded.termination_proved, true);
assert.equal(bounded.formal_smt_verification?.verified_by_z3, false);
assert.equal(bounded.verification_scope, 'BOUNDED_TRACE_ONLY');

const capped = NOPOTVerifier.verifyAlgorithmTermination('nonterminating', n => n, 2, 3);
assert.equal(capped.termination_proved, false);
assert.equal(capped.strictly_decreasing, false);

assert.throws(() => NOPOTVerifier.verifyAlgorithmTermination('negative', () => -1, 2, 5), /non-negative safe integer/);
assert.throws(() => NOPOTVerifier.verifyAlgorithmTermination('invalid-bound', n => n - 1, 2, -1), /maxBound/);

const goal = NOPOTEngine.verifyTermination({
  goal_id: 'custom-goal',
  initial_state: 6,
  terminal_state: 0,
  transition_function: n => n - 2,
  variant_function: n => n,
  max_bounded_steps: 3,
  smt_transition_expression: '(- s 2)',
  smt_variant_expression: 's',
  smt_state_invariant: '(= (mod s 2) 0)'
});
assert.equal(goal.termination_proved, true);
assert.equal(goal.actual_measured_steps, 3);
assert.equal(goal.formal_smt_verification?.verified_by_z3, false);
assert.equal(goal.verification_scope, 'BOUNDED_TRACE_ONLY');
const customZ3 = await NOPOTEngine.verifyWithZ3({
  goal_id: 'custom-even-countdown', initial_state: 6, terminal_state: 0,
  transition_function: n => n - 2, variant_function: n => n, max_bounded_steps: 3,
  smt_transition_expression: '(- s 2)', smt_variant_expression: 's', smt_state_invariant: '(= (mod s 2) 0)'
});
assert.equal(customZ3.z3Result.solver_result, 'unsat');
assert.equal(customZ3.certificate.formal_smt_verification?.verified_by_z3, true);
assert.equal(customZ3.certificate.verification_scope, 'CUSTOM_GOAL_SMT_AND_BOUNDED_REACHABILITY');
const missingSpec = await assert.rejects(() => NOPOTEngine.verifyWithZ3({
  goal_id: 'missing-smt-spec', initial_state: 2, terminal_state: 0,
  transition_function: n => n - 1, variant_function: n => n, max_bounded_steps: 2
}), /requires smt_transition_expression/);
void missingSpec;

const protocol = MMTAIProtocol.getInstance();
const token = protocol.issueAuthorizationToken('ROLE_OPERATOR', 'CAP_READ', 'tenant-a');
assert.equal(protocol.authorizeExecution('CAP_READ', 'ROLE_OPERATOR', token, 'read', 'tenant-a').permitted, true);
assert.equal(protocol.authorizeExecution('CAP_READ', 'ROLE_OPERATOR', token, 'read', 'tenant-a').permitted, false);

const contextToken = protocol.issueAuthorizationToken('ROLE_OPERATOR', 'CAP_READ', 'tenant-a');
assert.equal(protocol.authorizeExecution('CAP_READ', 'ROLE_OPERATOR', contextToken, 'read', 'tenant-b').permitted, false);
assert.equal(protocol.authorizeExecution('CAP_READ', 'ROLE_OPERATOR', contextToken, 'read', 'tenant-a').permitted, true);

assert.throws(
  () => protocol.issueAuthorizationToken('ROLE_VERIFIER', 'CAP_PERSISTENCE_MUTATE', 'tenant-a'),
  /Authority Violation/
);

console.log('PASS: NOPOT bounded trace honesty, bounded input validation, goal variant enforcement, goal-specific Z3 SMT verification, MMTAI crypto token, context binding, and replay protection');

const z3 = Z3FormalProofEngine.getInstance();
const actualUnsat = await z3.verifyCustomSmtScript(
  'actual-unsat-check',
  '(set-logic QF_LIA) (declare-const x Int) (assert (> x 5)) (assert (< x 3)) (check-sat)',
  'unsat'
);
assert.equal(actualUnsat.solver_result, 'unsat');
assert.equal(actualUnsat.proved, true);
assert.match(actualUnsat.solver_engine, /actual solver invocation/);

const actualSat = await z3.verifyCustomSmtScript(
  'actual-sat-check',
  '(set-logic QF_LIA) (declare-const x Int) (assert (= x 7)) (check-sat)',
  'sat'
);
assert.equal(actualSat.solver_result, 'sat');
assert.equal(actualSat.proved, true);
assert.ok(actualSat.counterexample_model?.model);

const mismatchedExpectation = await z3.verifyCustomSmtScript(
  'expectation-mismatch-check',
  '(set-logic QF_LIA) (declare-const x Int) (assert (= x 7)) (check-sat)',
  'unsat'
);
assert.equal(mismatchedExpectation.solver_result, 'sat');
assert.equal(mismatchedExpectation.proved, false);

const catalogResults = await z3.proveAllCatalogTheorems();
assert.equal(catalogResults.length, z3.getCatalog().length);
assert.ok(catalogResults.every(result => result.proved && result.solver_result === 'unsat'));
console.log('PASS: real Z3 custom SAT/UNSAT, model output, expected-result mismatch, and full theorem catalog');
