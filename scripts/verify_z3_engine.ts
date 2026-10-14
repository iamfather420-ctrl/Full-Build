import assert from "node:assert/strict";
import { Z3FormalProofEngine } from "../src/proofs/Z3FormalProofEngine";

const engine = Z3FormalProofEngine.getInstance();

const unsat = await engine.executeSmtVerification(
  "CI-UNSAT",
  "Contradiction smoke test",
  "CI",
  "p and not p has no model",
  "(declare-const p Bool)\n(assert p)\n(assert (not p))\n(check-sat)",
  "unsat",
);
assert.equal(unsat.solver_result, "unsat");
assert.equal(unsat.proved, true);

const sat = await engine.executeSmtVerification(
  "CI-SAT",
  "Witness smoke test",
  "CI",
  "There exists an integer x equal to 7",
  "(declare-const x Int)\n(assert (= x 7))\n(check-sat)",
  "sat",
);
assert.equal(sat.solver_result, "sat");
assert.equal(sat.proved, true);
assert.ok(sat.counterexample_model?.model);

const invalid = await engine.executeSmtVerification(
  "CI-INVALID",
  "Invalid SMT must fail closed",
  "CI",
  "Invalid input must not become a proof",
  "(assert (= undeclared_symbol 7))\n(check-sat)",
  "unsat",
);
assert.equal(invalid.solver_result, "unknown");
assert.equal(invalid.proved, false);

console.log(JSON.stringify({
  test: "z3-formal-proof-engine-real-solver",
  passed: true,
  unsat: unsat.solver_result,
  sat: sat.solver_result,
  invalid: invalid.solver_result,
  invalid_proved: invalid.proved,
}, null, 2));
