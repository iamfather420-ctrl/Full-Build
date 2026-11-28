import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { validateWeights } from "../../packages/daisy-weight-engine/src/assembler.js";
import { loadKernel } from "../../packages/daisy-weight-engine/src/kernel.js";
import { applySgd, evaluate } from "../../packages/daisy-weight-engine/src/training.js";
import {
  AUTHORED_SEED,
  HELD_OUT,
  assertNoLeakage,
  artifactDigest,
  forwardLast,
  measureLoaded,
  pairsFrom,
  runDaisyPipeline,
} from "./daisyPipeline";
import { admitCorpus } from "./languageGate";
import { readPersistedFiles } from "./persisted";
import { scorePairs, summarizeScores, inferLoadedToken } from "./evaluation";
import { admitDocument, appendAdmissionEvent, canTrainAtStage, REAL_MANIFEST_GATE, selectTrainingDocuments, sha256Hex, type DocumentApproval, type SourceDocument } from "./corpusAdmission";
import { assessDiscoveryInterface } from "./discoveryLink";
import { runContextProbe } from "./contextProbe";
import { FINAL_LANGUAGE_EVALUATION } from "./evaluationSets";
import type { GitHubClient, GitHubResponse } from "./github";
import { completionOf } from "./scoring";
import { resolveTasks } from "./remediation";
import { configureWeightEngine, execute, resetReadinessState } from "./service";
import { evidence } from "./evidence";
import { hasVerifiedTenantSession, isTrainingTaskSelection } from "./authorization";

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

test("language repository documents are not admitted", () => {
  const decision = admitCorpus("loc-english-grammar-source-collection");
  assert.equal(decision.admitted, false);
  assert.equal(decision.state, "BLOCKED");
  assert.equal(decision.documentsAdmitted, 0);
});

test("a second SGD run reproduces the persisted artifact", () => {
  const first = runDaisyPipeline({ loadKernel, applySgd, evaluate, validateWeights });
  const second = runDaisyPipeline({ loadKernel, applySgd, evaluate, validateWeights });
  assert.equal(first.artifactSha256, second.artifactSha256);
  assert.notEqual(first.initSha256, first.artifactSha256);
  assert.equal(first.weightsChanged, true);
  const persisted = readPersistedFiles();
  assert.equal(artifactDigest(persisted.model), first.artifactSha256);
  assert.equal(persisted.report.artifactSha256, first.artifactSha256);
  assert.equal(persisted.report.documentsAdmitted, 0);
  assert.equal(persisted.report.proprietaryConversationalModel, "NOT_COMPLETE");
  const measured = measureLoaded(persisted.model, { loadKernel, applySgd, evaluate, validateWeights });
  assert.equal(measured.heldOutAccuracy, persisted.report.heldOutAccuracy);
  assert.equal(measured.generatedText, persisted.report.generatedText);
  assert.ok(Math.abs(measured.trainLoss - persisted.report.trainLossAfter) < 1e-9);
});

test("held-out failure is memorization, not an unknown-token bug", () => {
  const persisted = readPersistedFiles();
  const trainPairs = pairsFrom(AUTHORED_SEED);
  const vocab = [...new Set(trainPairs.flatMap((pair) => [pair.previous, pair.next]))].sort();
  const scored = scorePairs(persisted.model, pairsFrom(HELD_OUT), vocab);
  assert.equal(scored.scored, 3);
  assert.equal(scored.unscored, 0);
  assert.equal(scored.accuracy, 0);
  assert.equal(scored.legacyAccuracy, 0);
  assert.deepEqual(
    scored.predictions.map((item) => [item.previous, item.expected, item.predicted]),
    [
      ["thing", "shows", "a"],
      ["shows", "action", "an"],
      ["action", "state", "or"],
    ],
  );
  const extra = ["subject needs verb state"];
  assertNoLeakage(AUTHORED_SEED, extra);
  const extraScore = scorePairs(persisted.model, pairsFrom(extra), vocab);
  assert.equal(extraScore.accuracy < 0.5, true);
});

test("unknown tokens are unscored and cannot manufacture a pass", () => {
  const summary = summarizeScores([
    { previous: "shows", expected: "an", predicted: "an", inVocabulary: true, correct: true },
    { previous: "missing", expected: "token", predicted: null, inVocabulary: false, correct: false },
  ]);
  assert.equal(summary.accuracy, 1);
  assert.equal(summary.legacyAccuracy, 0.5);
  assert.equal(summary.unscored, 1);
  const empty = summarizeScores([
    { previous: "missing", expected: "token", predicted: null, inVocabulary: false, correct: false },
  ]);
  assert.equal(empty.accuracy, 0);
  assert.equal(empty.scored, 0);
});

function admittedFixture(bytes: Uint8Array): SourceDocument {
  const digest = sha256Hex(bytes);
  return {
    id: "synthetic-admitted-fixture",
    path: "fixtures/not-a-repository-document.txt",
    license: "CC0-1.0",
    reviewStatus: "APPROVED",
    trainingEligible: true,
    trainingStatus: "approved",
    sha256: digest,
    byteLength: bytes.length,
    observedSha256: digest,
    text: "A noun names a person. This fixture is not a Library of Congress document and is used only to test the open gate.",
    extractionError: null,
  };
}

test("real manifest blocks CC0 and pending documents, including a checksum match", () => {
  const bytes = new TextEncoder().encode("plain language guideline text that is long enough to pass extraction checks.");
  const digest = sha256Hex(bytes);
  const documents: SourceDocument[] = [
    {
      id: "gsa-plain-language-guidelines-markdown",
      path: "data/communication/plain-language/gsa-plainlanguage-49d50c9/LICENSE.md",
      license: "CC0-1.0",
      reviewStatus: "NOT_EVALUATED",
      trainingEligible: false,
      trainingStatus: "not_evaluated",
      sha256: digest,
      byteLength: bytes.length,
      observedSha256: digest,
      text: "License text that matches its digest but is not an approved training document.",
      extractionError: null,
    },
    {
      id: "loc-english-grammar-six-books",
      path: "data/training_sources/public_domain/english/",
      license: null,
      reviewStatus: "PENDING_REVIEW",
      trainingEligible: false,
      trainingStatus: "not_approved",
      sha256: null,
      byteLength: null,
      observedSha256: null,
      text: null,
      extractionError: "PDF extraction was not run.",
    },
  ];
  const selected = selectTrainingDocuments(documents, REAL_MANIFEST_GATE);
  assert.equal(selected.admitted.length, 0);
  assert.equal(selected.results.every((result) => result.state === "BLOCKED"), true);
});

function validApproval(documentId: string, overrides: Partial<DocumentApproval> = {}): DocumentApproval {
  return {
    documentId,
    approver: "human-reviewer-fixture",
    scope: "document",
    issuedAt: "2026-11-27T00:00:00.000Z",
    expiresAt: "2026-12-27T00:00:00.000Z",
    revokedAt: null,
    ...overrides,
  };
}

test("an approved document is admitted only when the manifest and a document approval allow it", () => {
  const document = admittedFixture(new TextEncoder().encode("fixture-bytes"));
  const now = "2026-11-27T12:00:00.000Z";
  const openManifest = { modelTrainingAuthorized: true, trainingPipelineEnabled: true, trainingCorpusGenerated: true };
  const closed = admitDocument(document, REAL_MANIFEST_GATE, null, validApproval(document.id), now);
  assert.equal(closed.state, "BLOCKED");
  const missingApproval = admitDocument(document, openManifest, null, null, now);
  assert.equal(missingApproval.state, "BLOCKED");
  const open = admitDocument(document, openManifest, null, validApproval(document.id), now);
  assert.equal(open.state, "BLOCKED");
  assert.equal(open.reasons.some((reason) => reason.includes("cryptographic")), true);
  const corrupt = { ...document, observedSha256: "0".repeat(64), text: "short" };
  const failed = admitDocument(corrupt, openManifest, null, validApproval(document.id), now);
  assert.equal(failed.state, "BLOCKED");
  assert.equal(failed.reasons.some((reason) => reason.includes("Integrity")), true);
  const repositoryScope = admitDocument(document, openManifest, null, validApproval(document.id, { scope: "repository" }), now);
  assert.equal(repositoryScope.state, "BLOCKED");
  const expired = admitDocument(document, openManifest, null, validApproval(document.id, { expiresAt: "2026-11-01T00:00:00.000Z" }), now);
  assert.equal(expired.state, "BLOCKED");
  const revoked = admitDocument(document, openManifest, null, validApproval(document.id, { revokedAt: "2026-11-27T01:00:00.000Z" }), now);
  assert.equal(revoked.state, "BLOCKED");
  const history = appendAdmissionEvent([], { documentId: document.id, at: now, action: "BLOCKED", actor: "gate", reason: "revoked" });
  assert.equal(history.length, 1);
  assert.equal(canTrainAtStage("LICENSE_VERIFIED"), false);
  assert.equal(canTrainAtStage("ADMITTED"), true);
});

test("duplicate digests are not both admitted", () => {
  const document = admittedFixture(new TextEncoder().encode("same-bytes"));
  const copy = { ...document, id: "synthetic-duplicate", path: "fixtures/copy.txt" };
  const selected = selectTrainingDocuments(
    [document, copy],
    { modelTrainingAuthorized: true, trainingPipelineEnabled: true, trainingCorpusGenerated: true },
    [validApproval(document.id), validApproval(copy.id)],
  );
  assert.equal(selected.admitted.length, 0);
  assert.equal(selected.results.every((result) => result.state === "BLOCKED"), true);
});

test("micro-model inference fail-closes when the digest changes", () => {
  const persisted = readPersistedFiles();
  const trainPairs = pairsFrom(AUTHORED_SEED);
  const vocab = [...new Set(trainPairs.flatMap((pair) => [pair.previous, pair.next]))].sort();
  const loaded = inferLoadedToken(persisted.model, persisted.report.artifactSha256, "a", vocab);
  assert.equal(loaded.ok, true);
  assert.equal(loaded.token, "verb");
  const tampered = structuredClone(persisted.model);
  tampered.tensors[0].data[0] += 1;
  const rejected = inferLoadedToken(tampered, persisted.report.artifactSha256, "a", vocab);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.code, "DIGEST_MISMATCH");
  assert.equal(rejected.token, null);
});

test("discovery fails closed when the interface cannot read the language repository", () => {
  const missing = assessDiscoveryInterface({
    repository: "Solvex-Paradox-Box/Discover-Engine",
    httpStatus: 404,
    routes: [],
    readsLanguageRepository: false,
  });
  assert.equal(missing.state, "BLOCKED");
  const academic = assessDiscoveryInterface({
    repository: "iamfather420-ctrl/Discover-Engine",
    httpStatus: 200,
    routes: ["/v1/assertions", "/projects"],
    readsLanguageRepository: false,
  });
  assert.equal(academic.state, "BLOCKED");
  assert.match(academic.reason, /language repository/i);
});

test("the context probe does not retune the original held-out set", () => {
  const probe = runContextProbe({ loadKernel, applySgd, evaluate, validateWeights });
  assert.equal(probe.originalHeldOutAccuracy, 0);
  assert.equal(probe.locDocumentsUsed, 0);
  assert.equal(probe.finalSetUsedForTuning, false);
  assert.equal(probe.finalUnseenAccuracy < 0.5, true);
  assert.equal(probe.oneTokenFinalAccuracy === probe.finalUnseenAccuracy, false);
  assertNoLeakage(AUTHORED_SEED, [...FINAL_LANGUAGE_EVALUATION]);
  const review = JSON.parse(readFileSync(new URL("./artifacts/source-review-2026-11-27.json", import.meta.url), "utf8")) as { recordsAdmitted: number; recordsDiscovered: number };
  assert.equal(review.recordsDiscovered, 22);
  assert.equal(review.recordsAdmitted, 0);
});

test("the approval queue is unsigned and admits nothing", () => {
  const queue = JSON.parse(readFileSync(new URL("./artifacts/approval-queue-2026-11-27.json", import.meta.url), "utf8")) as {
    pushDoesNotApprove: boolean;
    sourcesSigned: number;
    sourcesAdmitted: number;
    sources: { signature: string | null; admitted: boolean; recommendedDecision: string }[];
  };
  assert.equal(queue.pushDoesNotApprove, true);
  assert.equal(queue.sources.length, 22);
  assert.equal(queue.sourcesSigned, 0);
  assert.equal(queue.sourcesAdmitted, 0);
  assert.equal(queue.sources.every((source) => source.signature === null && source.admitted === false && source.recommendedDecision === "DO_NOT_ADMIT"), true);
});


test("readiness execution requires a verified tenant session and client approval cannot authorize training", () => {
  assert.equal(hasVerifiedTenantSession({ authenticated: false, userId: "u1", tenantUserId: "u1" }), false);
  assert.equal(hasVerifiedTenantSession({ authenticated: true, userId: "u1", tenantUserId: "u2" }), false);
  assert.equal(hasVerifiedTenantSession({ authenticated: true, userId: "u1", tenantUserId: "u1" }), true);
  assert.equal(isTrainingTaskSelection(["scan-only"]), false);
  assert.equal(isTrainingTaskSelection(["generate-weights"]), true);
  assert.equal(isTrainingTaskSelection(["training-engine", "scan-only"]), true);
});
