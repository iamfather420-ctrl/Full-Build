import assert from 'node:assert/strict';
import { Z3FormalProofEngine } from '../src/proofs/Z3FormalProofEngine';

async function main() {
  const engine = Z3FormalProofEngine.getInstance();

  const satisfiable = await engine.executeSmtVerification(
    'TEST-SAT',
    'Satisfiable integer constraint',
    'TEST',
    'There exists a positive integer',
    '(declare-const x Int) (assert (> x 0))',
    'sat'
  );
  assert.equal(satisfiable.solver_result, 'sat');
  assert.equal(satisfiable.proved, true);

  const mismatchedExpectation = await engine.executeSmtVerification(
    'TEST-MISMATCH',
    'Do not trust expected result',
    'TEST',
    'A positive integer exists, so this is satisfiable',
    '(declare-const x Int) (assert (> x 0))',
    'unsat'
  );
  assert.equal(mismatchedExpectation.solver_result, 'sat');
  assert.equal(mismatchedExpectation.proved, false);

  const unsatisfiable = await engine.executeSmtVerification(
    'TEST-UNSAT',
    'Contradictory integer constraints',
    'TEST',
    'No integer is both greater than zero and less than zero',
    '(declare-const x Int) (assert (> x 0)) (assert (< x 0))',
    'unsat'
  );
  assert.equal(unsatisfiable.solver_result, 'unsat');
  assert.equal(unsatisfiable.proved, true);

  const malformed = await engine.executeSmtVerification(
    'TEST-MALFORMED',
    'Malformed SMT must fail closed',
    'TEST',
    'Malformed syntax must not be marked proven',
    '(assert (this_is_an_undefined_operator 123 456))',
    'unsat'
  );
  assert.equal(malformed.solver_result, 'error');
  assert.equal(malformed.proved, false);

  console.log('Actual Z3 engine tests passed: SAT, UNSAT, expectation mismatch, malformed SMT fail-closed.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
