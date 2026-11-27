import assert from "node:assert/strict";
import test from "node:test";
import { validateWeights } from "../../packages/daisy-weight-engine/src/assembler.js";
import { loadKernel } from "../../packages/daisy-weight-engine/src/kernel.js";
import { applySgd, evaluate } from "../../packages/daisy-weight-engine/src/training.js";
import {
  AUTHORED_SEED,
  HELD_OUT,
  assertNoLeakage,
  forwardLast,
  pairsFrom,
  runDaisyPipeline,
} from "./daisyPipeline";
import type { GitHubClient, GitHubResponse } from "./github";
import { completionOf } from "./scoring";
import { resolveTasks } from "./remediation";
import { configureWeightEngine, execute, resetReadinessState } from "./service";
import { evidence } from "./evidence";

configureWeightEngine({ loadKernel, applySgd, evaluate, validateWeights });

function jsonResponse(status: number, body: unknown): GitHubResponse {
  return { status, body, remaining: "50" };
}

function fixtureClient(): GitHubClient {
  return {
    async getJson(url) {
      if (url.endsWith("/repos/iamfather420-ctrl/Full-Build")) {
        return jsonResponse(200, { default_branch: "main", pushed_at: "2026-11-12T00:00:00Z", description: "fixture" });
      }
      if (url.includes("/commits/")) return jsonResponse(200, { sha: "abc123def456" });
      if (url.includes("/git/trees/")) {
        return jsonResponse(200, {
          truncated: false,
          tree: [
            { path: "src/inference/verifiedDaisyModel.ts", type: "blob" },
            { path: "src/brain/FirstPartyInferenceRuntime.ts", type: "blob" },
            { path: "packages/daisy-weight-engine/src/training.ts", type: "blob" },
            { path: "README.md", type: "blob" },
          ],
        });
      }
      if (url.includes("SOLVEX-PARADOX-BOX") || url.includes("Paradox-Engine-AI-UI-OS")) {
        return jsonResponse(404, { message: "Not Found" });
      }
      if (url.includes("Discover-Engine")) {
        return jsonResponse(200, { default_branch: "main", pushed_at: "2026-11-15T00:00:00Z", description: null });
      }
      if (url.includes("loc-english-grammar-source-collection")) {
        return jsonResponse(200, { default_branch: "main", pushed_at: "2026-11-27T00:00:00Z", description: "source candidate" });
      }
      return jsonResponse(404, { message: "Not Found" });
    },
    async getText(url) {
      if (url.includes("verifiedDaisyModel.ts")) {
        return { status: 200, body: "sha256: 'd158c64ff056f3c76fbbc6f4824c53e5ffd5de94931f71db5a418cb1df9e50fd'" };
      }
      if (url.includes("FirstPartyInferenceRuntime.ts")) {
        return { status: 200, body: "code: 'FIRST_PARTY_INFERENCE_NOT_IMPLEMENTED'" };
      }
      return { status: 404, body: "" };
    },
  };
}

test("blocked checks stay in the denominator", () => {
  const rows = [
    evidence({ category: "security", repository: "r", testExecuted: "a", expected: "pass", actual: "pass", status: "PASSED", state: "VERIFIED", weight: 1 }),
    evidence({ category: "security", repository: "r", testExecuted: "b", expected: "pass", actual: "blocked", status: "BLOCKED", state: "BLOCKED", weight: 1 }),
    evidence({ category: "security", repository: "r", testExecuted: "c", expected: "n/a", actual: "n/a", status: "NOT_APPLICABLE", state: "VERIFIED", weight: 5 }),
  ];
  const score = completionOf(rows);
  assert.equal(score.raw, 0.5);
  assert.equal(score.weighted, 0.5);
});

test("training and held-out sets do not share pairs", () => {
  assertNoLeakage(AUTHORED_SEED, HELD_OUT);
  assert.throws(() => assertNoLeakage(AUTHORED_SEED, AUTHORED_SEED));
});

test("weight-engine forward matches evaluate", () => {
  const model = loadKernel({ name: "parity", family: "mlp-classifier", inputSize: 2, hiddenSizes: [2], outputSize: 1, seed: 1 });
  const data = [{ input: [0.2, -0.4], target: [0.1] }];
  const mse = evaluate(model, data);
  const output = forwardLast(model, data[0].input);
  const manual = (output[0] - data[0].target[0]) ** 2;
  assert.ok(Math.abs(mse - manual) < 1e-12);
});

test("daisy training is real and does not retire the transitional model", () => {
  const run = runDaisyPipeline({ loadKernel, applySgd, evaluate, validateWeights });
  assert.ok(run.trainLossAfter !== null && run.trainLossBefore !== null);
  assert.ok(run.trainLossAfter < run.trainLossBefore);
  assert.equal(run.eliminatedTemporary, false);
  assert.equal(run.gates.find((gate) => gate.id === "temporary")?.passed, false);
  assert.equal(run.gates.find((gate) => gate.id === "weights")?.passed, true);
  assert.equal(run.gates.find((gate) => gate.id === "inference")?.passed, true);
  assert.equal(run.inferenceSource, "daisy-trained-weights");
  assert.ok(run.generatedText && run.generatedText.length > 2);
  assert.ok(run.completion < 1);
  const communication = run.gates.find((gate) => gate.id === "communication");
  assert.equal(communication?.passed, (run.heldOutAccuracy ?? 0) >= 0.5);
  assert.ok(!run.artifactSha256?.includes("d158c64ff056f3c76fbbc6f4824c53e5ffd5de94931f71db5a418cb1df9e50fd"));
});

test("path presence is not a passed engine and private repos stay unauthorized", async () => {
  resetReadinessState();
  const report = await execute(["scan-only"], true, fixtureClient());
  const located = report.evidence.find((row) => row.artifact === "located-not-executed");
  assert.ok(located);
  assert.equal(located.status, "UNVERIFIED");
  const paradox = report.repositories.find((repo) => repo.id === "paradox-box");
  assert.equal(paradox?.state, "AUTHORIZATION_REQUIRED");
  assert.equal(report.temporaryModel.eliminated, false);
  assert.ok(report.weightedCompletion < 1);
  assert.equal(report.evidence.some((row) => row.status === "PASSED" && row.state === "BLOCKED"), false);
});

test("replacement and migrations are refused", async () => {
  resetReadinessState();
  const report = await execute(["replace-temporary", "database", "generate-weights"], true, fixtureClient());
  const replace = report.execution?.results.find((result) => result.taskId === "replace-temporary");
  const database = report.execution?.results.find((result) => result.taskId === "database");
  const weights = report.execution?.results.find((result) => result.taskId === "generate-weights");
  assert.equal(replace?.state, "BLOCKED");
  assert.equal(database?.state, "BLOCKED");
  assert.equal(weights?.state, "COMPLETED");
  assert.equal(report.sandbox?.cloned, false);
  assert.ok(report.daisyCompletion < 1);
});

test("unapproved training does not run", async () => {
  resetReadinessState();
  const report = await execute(["generate-weights"], false, fixtureClient());
  const weights = report.execution?.results.find((result) => result.taskId === "generate-weights");
  assert.equal(weights?.state, "AUTHORIZATION_REQUIRED");
  assert.equal(report.daisyCompletion, 0);
});

test("complete-outstanding expands dependencies without destructive tasks", () => {
  const tasks = resolveTasks(["complete-outstanding"]);
  assert.ok(tasks.some((task) => task.id === "generate-weights"));
  assert.equal(tasks.some((task) => task.id === "database"), false);
  assert.equal(tasks.some((task) => task.id === "replace-temporary"), false);
});

test("held-out pairs are not an empty fabricated success", () => {
  assert.ok(pairsFrom(HELD_OUT).length >= 3);
});
