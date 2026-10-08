import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  POLICY,
  sha256,
  compileIntent,
  signAuthorization,
  evaluate,
  rewriteSafe,
  buildReceipt,
  verifyReceipt,
} from "./proof-engine.mjs";

const nist = createHash("sha256").update("abc").digest("hex");
assert.equal(sha256("abc"), nist);
assert.equal(sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");

const unsafe = compileIntent("Update all production account statuses to suspended.");
const refused = evaluate(unsafe, POLICY, 1_700_000_000_000);
assert.equal(refused.decision, "REFUSE");
for (const id of ["ENV_SAFE", "BLAST_RADIUS", "REVERSIBLE", "AUTH_PRESENT", "AUTH_BINDS"]) {
  assert.equal(refused.obligations.find((o) => o.id === id).result, "SAT", id);
}
assert.ok(refused.counterexamples.length >= 5);

const rewritten = rewriteSafe(unsafe);
const commitment = evaluate({ ...rewritten, auth: null }, POLICY, 1_700_000_000_000).commitment;
const auth = signAuthorization({ commitment, issuedAt: 1_700_000_000_000 });
const allowedAction = { ...rewritten, auth };
const allowed = evaluate(allowedAction, POLICY, 1_700_000_000_000);
assert.equal(allowed.decision, "ALLOW");
assert.ok(allowed.obligations.every((o) => o.result === "UNSAT"));

const forged = evaluate({ ...allowedAction, auth: { ...auth, token: "jit.forged" } }, POLICY, 1_700_000_000_000);
assert.equal(forged.obligations.find((o) => o.id === "AUTH_PRESENT").result, "SAT");
const grant = evaluate({ ...allowedAction, environment: "production", productionGrant: true }, POLICY, 1_700_000_000_000);
assert.equal(grant.decision, "REFUSE");
assert.equal(grant.obligations.find((o) => o.id === "ENV_SAFE").result, "SAT");
const stolen = evaluate({ ...allowedAction, auth: { ...auth, commitment: "0".repeat(64) } }, POLICY, 1_700_000_000_000);
assert.equal(stolen.decision, "REFUSE");
assert.equal(stolen.obligations.find((o) => o.id === "AUTH_BINDS").result, "SAT");

const stale = evaluate(allowedAction, POLICY, 1_700_000_000_000 + POLICY.jitWindowMs + 1);
assert.equal(stale.obligations.find((o) => o.id === "JIT_FRESH").result, "SAT");

const receipt = buildReceipt({
  action: allowedAction,
  proof: allowed,
  execution: { status: "APPLIED", checkpoint: "ckpt_demo_014" },
  recovery: { status: "ROLLED_BACK" },
});
assert.equal(verifyReceipt(receipt).ok, true);
const tampered = { ...receipt, decision: "ALLOW_EVERYTHING" };
assert.equal(verifyReceipt(tampered).ok, false);

const samples = [];
for (let i = 0; i < 200; i++) samples.push(evaluate(allowedAction, POLICY, 1_700_000_000_000).elapsedMs);
const max = Math.max(...samples);
assert.ok(max < 25, `prove path exceeded 25ms budget: ${max}`);

console.log("PBP-1 engine: 6 checks passed");
console.log(`unsafe refused with ${refused.counterexamples.length} countermodels`);
console.log(`safe path ALLOW in max ${max}ms across 200 runs`);
console.log(`receipt ${receipt.receiptHash.slice(0, 16)}… re-verifies; tamper fails closed`);
