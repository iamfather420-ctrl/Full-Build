import assert from 'node:assert/strict';
import { NOPOTEngine, NOPOTVerifier } from '../src/proofs/NOPOTProof';
import { MMTAIProtocol } from '../src/mmtai/MMTAIProtocol';

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
  max_bounded_steps: 3
});
assert.equal(goal.termination_proved, true);
assert.equal(goal.actual_measured_steps, 3);
assert.equal(goal.formal_smt_verification?.verified_by_z3, false);
assert.equal(goal.verification_scope, 'BOUNDED_TRACE_ONLY');

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

console.log('PASS: NOPOT bounded trace honesty, bounded input validation, goal variant enforcement, MMTAI crypto token, context binding, and replay protection');
