import assert from "node:assert/strict";
import { Lifecycle, State, GOVERNANCE_TRANSITIONS, type Actor } from "../src/lib/lifecycle";

const DAISY: Actor = { id: "daisy-haminja", kind: "partner" };
const OWNER: Actor = { id: "owner", kind: "human" };
const REVIEWER: Actor = { id: "independent-reviewer", kind: "human" };
const coveredEdges = new Set<string>();
const coveredStates = new Set<string>();

function edge(from: string, to: string) {
  coveredEdges.add(`${from}->${to}`);
  coveredStates.add(from);
  coveredStates.add(to);
}
function assertState(actual: string, expected: string) {
  assert.equal(actual, expected);
  coveredStates.add(actual);
}
function configuredLife(tool: string, available = true, validate = true) {
  const life = new Lifecycle();
  life.grant("owner", tool, "operate");
  life.setTool(tool, available, available ? "test tool available" : "test tool intentionally unavailable", validate);
  return life;
}
function highRiskReviewed(life: Lifecycle, tool: string) {
  const task = life.propose(DAISY, "owner", "Governance transition test", tool, "operate", "HIGH");
  assertState(task.state, State.PROPOSED);
  try {
    life.authorize(task.id, DAISY);
    assert.fail("AI partner must not authorize HIGH risk work");
  } catch (error) {
    assert.match(String(error), /human authorizer|owner/);
  }
  assertState(task.state, State.PROPOSED);
  life.review(task.id, REVIEWER, true);
  assertState(task.state, State.REVIEWED);
  edge(State.PROPOSED, State.REVIEWED);
  life.authorize(task.id, OWNER);
  assertState(task.state, State.AUTHORIZED);
  edge(State.REVIEWED, State.AUTHORIZED);
  return task;
}

// Happy path: proposal -> review -> authorization -> run -> validation -> completion.
{
  const life = configuredLife("happy");
  const task = highRiskReviewed(life, "happy");
  life.run(task.id, OWNER);
  assertState(task.state, State.COMPLETED);
  edge(State.AUTHORIZED, State.RUNNING);
  edge(State.RUNNING, State.VALIDATING);
  edge(State.VALIDATING, State.COMPLETED);
  assert.equal(life.chainOk(), true, "audit hash chain must remain valid");
}

// Rejection before review and after review are distinct legal edges.
{
  const life = configuredLife("reject-proposed");
  const task = life.propose(DAISY, "owner", "Reject from proposal", "reject-proposed", "operate", "HIGH");
  life.review(task.id, REVIEWER, false);
  assertState(task.state, State.REJECTED);
  edge(State.PROPOSED, State.REJECTED);
  assert.equal(life.chainOk(), true);
}
{
  const life = configuredLife("reject-reviewed");
  const task = life.propose(DAISY, "owner", "Reject after review", "reject-reviewed", "operate", "HIGH");
  life.review(task.id, REVIEWER, true);
  assertState(task.state, State.REVIEWED);
  life.review(task.id, REVIEWER, false);
  assertState(task.state, State.REJECTED);
  edge(State.REVIEWED, State.REJECTED);
  assert.equal(life.chainOk(), true);
}

// Unavailable tools must block with a real reason; restoring availability allows reauthorization.
{
  const life = configuredLife("offline", false);
  const task = highRiskReviewed(life, "offline");
  life.run(task.id, OWNER);
  assertState(task.state, State.BLOCKED);
  assert.match(task.blockReason ?? "", /tool unavailable: test tool intentionally unavailable/);
  edge(State.AUTHORIZED, State.BLOCKED);
  life.setTool("offline", true, "test tool restored", true);
  life.authorize(task.id, OWNER);
  assertState(task.state, State.AUTHORIZED);
  edge(State.BLOCKED, State.AUTHORIZED);
  life.run(task.id, OWNER);
  assertState(task.state, State.COMPLETED);
  assert.equal(life.chainOk(), true);
}

// Failed validation is recorded, not silently marked completed.
{
  const life = configuredLife("invalid-result", true, false);
  const task = life.propose(DAISY, "owner", "Validation failure", "invalid-result", "operate", "MEDIUM");
  life.review(task.id, REVIEWER, true);
  life.authorize(task.id, OWNER);
  life.run(task.id, OWNER);
  assertState(task.state, State.FAILED);
  assert.equal(task.error, "validation failed");
  edge(State.REVIEWED, State.AUTHORIZED);
  edge(State.AUTHORIZED, State.RUNNING);
  edge(State.RUNNING, State.VALIDATING);
  edge(State.VALIDATING, State.FAILED);
  assert.equal(life.chainOk(), true);
}

// Inventory every declared state and every declared edge from the source contract.
// Edges not reachable through public methods are reported as gaps, not fabricated as passes.
const declaredStates = Object.values(State);
assert.equal(new Set(declaredStates).size, declaredStates.length, "state names must be unique");
const allEdges = Object.entries(GOVERNANCE_TRANSITIONS).flatMap(([from, targets]) => targets.map((to) => `${from}->${to}`));
const untestedEdges = allEdges.filter((transition) => !coveredEdges.has(transition));
const unvisitedStates = declaredStates.filter((state) => !coveredStates.has(state));
console.log("SOLVEX GOVERNANCE LIFECYCLE VERIFICATION");
console.log(`Declared states: ${declaredStates.length}`);
console.log(`Declared transitions: ${allEdges.length}`);
console.log(`Transitions exercised through public API: ${coveredEdges.size}/${allEdges.length}`);
console.log(`States exercised through public API: ${coveredStates.size}/${declaredStates.length}`);
console.log("PASS: happy path, human authorization, rejection paths, blocked/retry, validation failure, and audit-chain integrity");
console.log("UNEXERCISED TRANSITIONS (implementation gaps, not passes):");
for (const transition of untestedEdges) console.log(` - ${transition}`);
console.log("UNVISITED STATES (implementation gaps, not passes):");
for (const state of unvisitedStates) console.log(` - ${state}`);
console.log("NOTE: this verifier exits successfully when implemented paths pass, while explicitly surfacing unimplemented transitions for remediation.");
