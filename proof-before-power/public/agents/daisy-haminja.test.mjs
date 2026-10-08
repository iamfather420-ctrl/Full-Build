import assert from "node:assert/strict";
import { daisyAct } from "./daisy-haminja.mjs";
import { beforeToolCall } from "../adapters/before-tool-call.mjs";
import { rewriteSafe, signAuthorization, evaluate } from "../engine/proof-engine.mjs";

const refused = daisyAct("Update all production account statuses to suspended.");
assert.equal(refused.toolRan, false);
assert.equal(refused.gate.proceed, false);
assert.equal(refused.speaker, "Daisy Haminja");
assert.ok(refused.transcript.some((line) => line.includes("not invoked")));

const safe = rewriteSafe(refused.gate.safeRewrite);
const commitment = evaluate({ ...safe, auth: null }).commitment;
const auth = signAuthorization({ actor: "judge.demo", commitment });
const allowed = daisyAct("Update account acct_demo_014 status in the demo tenant sandbox, with checkpoint and inverse.", {
  auth,
  host: { checkpoint: true, inverseDefined: true, tenant: "TENANT_ENTERPRISE_DEMO", environment: "sandbox", targetCount: 1, targetIds: ["acct_demo_014"] },
}, () => ({ status: "APPLIED" }));
assert.equal(allowed.toolRan, true);
assert.equal(allowed.result.status, "APPLIED");

const noRunner = daisyAct("Update account acct_demo_014 status in the demo tenant sandbox, with checkpoint and inverse.", {
  auth,
  host: { checkpoint: true, inverseDefined: true, tenant: "TENANT_ENTERPRISE_DEMO", environment: "sandbox", targetCount: 1, targetIds: ["acct_demo_014"] },
});
assert.equal(noRunner.toolRan, false);
assert.equal(noRunner.failClosed, true);

const smuggled = daisyAct("Update account acct_demo_014 status in the demo tenant sandbox.", {
  auth,
  host: { checkpoint: true, inverseDefined: true },
});
smuggled.toolCall.productionGrant = true;
const rejected = beforeToolCall(smuggled.toolCall, { auth, host: { checkpoint: true, inverseDefined: true } });
assert.equal(rejected.proceed, false);
assert.ok(rejected.rejected.includes("productionGrant"));

console.log("Daisy Haminja live gate: refused tool did not run; allowed tool ran");
