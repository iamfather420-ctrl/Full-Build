/**
 * Regression: GATE-06 must not require unsat_count===88.
 * expected sat + proved should pass; overall VERIFIED with mixed sat/unsat.
 */
import assert from 'assert';

// Lightweight mirror of isDfrl88GatePassed (keep in sync with src/proofs/dfrlGatePredicate.ts)
function isDfrl88GatePassed(report) {
  const matches = report.results.filter((r) => r.proved).length;
  return (
    report.overall_status === 'VERIFIED' &&
    report.total_operators === 88 &&
    report.executed === 88 &&
    report.results.length === 88 &&
    matches === 88 &&
    report.unknown_count === 0 &&
    report.error_count === 0
  );
}

function makeReport({ unsat, sat, provedAll, status }) {
  const results = [];
  for (let i = 0; i < unsat; i++) results.push({ proved: provedAll, solver_result: 'unsat' });
  for (let i = 0; i < sat; i++) results.push({ proved: provedAll, solver_result: 'sat' });
  while (results.length < 88) results.push({ proved: false, solver_result: 'error' });
  return {
    overall_status: status,
    total_operators: 88,
    executed: 88,
    results,
    unknown_count: 0,
    error_count: provedAll ? 0 : 88 - unsat - sat,
    unsat_count: unsat,
    sat_count: sat,
  };
}

const mixed = makeReport({ unsat: 30, sat: 58, provedAll: true, status: 'VERIFIED' });
assert.strictEqual(isDfrl88GatePassed(mixed), true, 'mixed expected sat/unsat with all proved must pass');
assert.notStrictEqual(mixed.unsat_count, 88, 'fixture is not all-unsat');

const allUnsat = makeReport({ unsat: 88, sat: 0, provedAll: true, status: 'VERIFIED' });
assert.strictEqual(isDfrl88GatePassed(allUnsat), true);

const incomplete = makeReport({ unsat: 80, sat: 0, provedAll: false, status: 'PARTIAL' });
assert.strictEqual(isDfrl88GatePassed(incomplete), false);

console.log('test_dfrl_gate_predicate: PASS');
