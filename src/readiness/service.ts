import { authorizationMatrix, nodeEnv, type RuntimeEnv } from "./authorization";
import { runDaisyPipeline, type DaisyRun } from "./daisyPipeline";
import { createAuditLog, evidence, resetEvidenceSequence } from "./evidence";
import { liveGitHubClient, type GitHubClient } from "./github";
import { INTEGRATION_BASE, TRANSITIONAL_GGUF } from "./registry";
import { resolveTasks, taskViews } from "./remediation";
import { scanRepositories } from "./scanner";
import { completionOf, countsOf, scoreCategories } from "./scoring";
import { OBSERVED_LANGUAGE_GATE } from "./languageGate";
import { verifyPersistedArtifact } from "./persisted";
import type { AcceptanceReport, EvidenceRecord, ExecutionNote, OperationalState, ReadinessReport, SandboxRecord, WeightFns } from "./types";

const history = createAuditLog();
let weightFns: WeightFns | null = null;
let lastDaisy: DaisyRun | null = null;

export function configureWeightEngine(fns: WeightFns): void {
  weightFns = fns;
}

export function lastDaisyRun(): DaisyRun | null {
  return lastDaisy;
}

function acceptanceOf(run: DaisyRun | null): AcceptanceReport {
  const gate = (id: string) => run?.gates.find((item) => item.id === id);
  const status = (id: string): "PASS" | "FAIL" | "BLOCKED" => {
    const item = gate(id);
    if (!item) return "BLOCKED";
    if (item.state === "BLOCKED") return "BLOCKED";
    return item.passed ? "PASS" : "FAIL";
  };
  const load = status("load");
  const infer = status("inference");
  const micro = load === "PASS" && infer === "PASS" ? "PASS" : load === "BLOCKED" || infer === "BLOCKED" ? "BLOCKED" : "FAIL";
  return {
    trainingExecution: status("training-engine"),
    weightGeneration: status("weights"),
    artifactIntegrity: status("integrity"),
    heldOutEvaluation: status("evaluation"),
    microInference: micro,
    productionInferenceRouter: "BLOCKED",
    discoveryIntegration: "BLOCKED",
    languageCorpusAdmission: "BLOCKED",
    proprietaryConversationalModel: "NOT_COMPLETE",
  };
}

function resolvedDaisy(explicit: DaisyRun | null | undefined): DaisyRun | null {
  if (explicit !== undefined && explicit !== null) return explicit;
  if (explicit === null) return null;
  if (lastDaisy) return lastDaisy;
  if (!weightFns) return null;
  try {
    return verifyPersistedArtifact(weightFns);
  } catch {
    return null;
  }
}

function requireWeights(): WeightFns {
  if (!weightFns) throw new Error("The daisy weight engine is not configured.");
  return weightFns;
}

function sandboxPlan(baseCommit: string | null): SandboxRecord {
  const id = `sbx-${Date.now().toString(36)}`;
  const gitAllowed = process.env.SOLVEX_ALLOW_GIT_EXEC === "true";
  return {
    id,
    state: gitAllowed ? "AUTHORIZED" : "BLOCKED",
    baseRepository: "iamfather420-ctrl/Full-Build",
    baseBranch: "main",
    baseCommit,
    workingBranch: `readiness/sandbox/${id}`,
    cloned: false,
    note: gitAllowed
      ? "Git execution is enabled, but this plan still did not clone or push."
      : "No working tree was cloned and no branch was created. SOLVEX_ALLOW_GIT_EXEC is not true. The branch name is a plan, not a Git ref.",
  };
}

function platformEvidence(): EvidenceRecord[] {
  return [
    evidence({
      category: "database",
      weight: 2,
      repository: "iamfather420-ctrl/Full-Build",
      filePath: "src/database/NeonPersistence.ts",
      testExecuted: "Policy check: generic Neon migrations and writes remain disabled",
      expected: "A reviewed migration is applied and a real query is observed before database checks pass",
      actual: "No migration was applied by the readiness subsystem. Draft SQL is not in the auto-applied migrations directory.",
      status: "BLOCKED",
      state: "AUTHORIZATION_REQUIRED",
      failure: "Database configuration or a schema file is not connection evidence.",
      remediation: "Authorize a disposable Neon branch, reconcile migration ledgers, then apply an additive audit table.",
    }),
    evidence({
      category: "deployment",
      weight: 2,
      repository: "iamfather420-ctrl/Full-Build",
      testExecuted: "Deploy authorization check",
      expected: "An authorized production deploy with a recorded deployment id",
      actual: "No production deploy was attempted.",
      status: "BLOCKED",
      state: "AUTHORIZATION_REQUIRED",
      failure: "The scanner is not allowed to deploy itself.",
      remediation: "A human root of trust must approve any production deployment.",
    }),
    evidence({
      category: "infrastructure",
      weight: 2,
      repository: "iamfather420-ctrl/Full-Build",
      testExecuted: "GPU and paid-compute inventory",
      expected: "An existing GPU worker is discovered before training strategy selection",
      actual: "No Render, Railway, or GPU inventory call succeeded in this process. Training, when approved, uses the local CPU only.",
      status: "BLOCKED",
      state: "AUTHORIZATION_REQUIRED",
      failure: "Unavailable compute was not replaced with a purchased resource.",
      remediation: "Authorize inspection of an existing GPU worker, or accept CPU limits explicitly.",
    }),
    evidence({
      category: "secrets",
      repository: "iamfather420-ctrl/Full-Build",
      testExecuted: "Secret-value exposure check",
      expected: "Secret names may be classified; secret values are never returned",
      actual: "Reports contain no env values. GitHub token presence is boolean only.",
      status: "PASSED",
      state: "VERIFIED",
      artifact: "redaction-policy",
    }),
    evidence({
      category: "security",
      weight: 2,
      repository: "iamfather420-ctrl/Full-Build",
      testExecuted: "Fail-closed temporary-model policy",
      expected: "Temporary GGUF cannot be removed or renamed into a pass",
      actual: `Transitional artifact ${TRANSITIONAL_GGUF.sha256} remains the chat identity until replacement gates pass.`,
      status: "FAILED",
      state: "BLOCKED",
      failure: "Proprietary completion is still blocked by the transitional model.",
      remediation: "Pass every Daisy gate, then remove the GGUF path in a reviewed pull request.",
    }),
    evidence({
      category: "governance",
      repository: "iamfather420-ctrl/Full-Build",
      filePath: "src/readiness",
      testExecuted: "Score denominator includes blocked and unverified checks",
      expected: "Passed weight is the only numerator",
      actual: "completionOf ignores NOT_APPLICABLE and does not treat BLOCKED or UNVERIFIED as PASSED.",
      status: "PASSED",
      state: "VERIFIED",
    }),
    evidence({
      category: "observability",
      repository: "iamfather420-ctrl/Full-Build",
      testExecuted: "Audit history durability",
      expected: "Immutable audit records survive process restart in reviewed storage",
      actual: `Process-local audit depth before this scan is ${history.depth()}. Records are not in Neon.`,
      status: "FAILED",
      state: "RECOVERY_REQUIRED",
      failure: "In-memory history is not durable evidence.",
      remediation: "Apply the draft audit schema only after ledger reconciliation and human approval.",
    }),
    evidence({
      category: "authentication",
      repository: "iamfather420-ctrl/Full-Build",
      filePath: "src/server/apiRouter.ts",
      testExecuted: "Execution route authorization boundary",
      expected: "Mutating readiness execution requires an authenticated Full-Build session",
      actual: "POST /api/readiness/execute is mounted after the existing auth boundary. GET scan is public read of public metadata only.",
      status: "UNVERIFIED",
      state: "REVIEW_REQUIRED",
      failure: "The route placement was implemented, but this process did not observe a live session rejection.",
      remediation: "Call the execute route without a session and record the HTTP 401.",
    }),
    evidence({
      category: "end-to-end",
      weight: 2,
      repository: "iamfather420-ctrl/Full-Build",
      testExecuted: "Full source-to-chat pipeline on the transitional runtime",
      expected: "Language source ingested, trained, loaded by InferenceRouter, and answered without a GGUF fallback",
      actual: "That chain is not complete. The micro-model path is separate and the chat router was not modified.",
      status: "FAILED",
      state: "VALIDATION_FAILED",
      failure: "A partial CPU training run is not the full ecosystem pipeline.",
      remediation: "Keep the chat router fail-closed until a verified replacement is wired without a silent fallback.",
    }),
    evidence({
      category: "performance",
      repository: "iamfather420-ctrl/Full-Build",
      testExecuted: "Performance budget measurement",
      expected: "Measured latency and throughput against a stated budget",
      actual: "No performance budget was measured.",
      status: "UNVERIFIED",
      state: "REVIEW_REQUIRED",
      failure: "Missing measurement is not a pass and is not marked not-applicable.",
      remediation: "Define a budget and record a timed run.",
    }),
    evidence({
      category: "build-reproducibility",
      repository: "iamfather420-ctrl/Full-Build",
      testExecuted: "Clean production build of Full-Build",
      expected: "A recorded successful build from this commit",
      actual: "This subsystem does not claim the Full-Build production build passed.",
      status: "UNVERIFIED",
      state: "REVIEW_REQUIRED",
      failure: "The readiness unit tests do not compile the whole Full-Build app.",
      remediation: "Run the repository build on the readiness branch and attach its log.",
    }),

    evidence({
      category: "integration-wiring",
      weight: 2,
      repository: "Solvex-Paradox-Box/loc-english-grammar-source-collection",
      filePath: OBSERVED_LANGUAGE_GATE.manifest,
      testExecuted: "Language-source training admission",
      expected: "Documents stay out of training unless the source manifest authorizes them",
      actual: "Live fetch on 2026-11-27: gate, register, and inventory HTTP 200. Discover-Engine HTTP 404. 22 records discovered, 1 checksum matched (GSA LICENSE.md), 0 documents admitted, 0 used in training. Manifest training authorization remains false.",
      status: "FAILED",
      state: "BLOCKED",
      failure: "Discovery-to-training is not connected. The refusal is intentional and is not a successful ingestion.",
      remediation: "Resolve PENDING_REVIEW on the LOC books, then pass extraction, license, and split checks before any admission.",
    }),

    evidence({
      category: "ai-training",
      weight: 2,
      repository: "iamfather420-ctrl/Full-Build",
      filePath: "src/readiness/artifacts/held-out-diagnosis-2026-11-27.json",
      testExecuted: "Held-out diagnosis against the preserved micro-model",
      expected: "Held-out next-token accuracy of at least 50% on pairs disjoint from training",
      actual: "Accuracy remains 0/3. Predictions: thing->a, shows->an, action->or. All tokens were in vocabulary. An additional unseen sentence also stays under 50%.",
      status: "FAILED",
      state: "VALIDATION_FAILED",
      failure: "The MLP memorized training successors. It did not generalize, and the 50% threshold was not lowered.",
      remediation: "Admit a real corpus and train a model that can be scored on a disjoint split. Do not add the held-out pairs to training.",
    }),
    evidence({
      category: "ai-training",
      weight: 2,
      repository: "iamfather420-ctrl/Full-Build",
      filePath: "src/discovery/DiscoverEngineClient.ts",
      testExecuted: "DiscoverEngineClient responsibility check",
      expected: "An executable ingestion path from the language repository into the trainer",
      actual: "DiscoverEngineClient posts withheld assertions to /v1/assertions and rejects publishable reviews. It does not read the language repository. The Discover-Engine repository API returned HTTP 404 during the audit.",
      status: "FAILED",
      state: "BLOCKED",
      failure: "No discovery ingestion was executed.",
      remediation: "Do not mark discovery complete from the client filename.",
    }),
    evidence({
      category: "documentation",
      repository: "iamfather420-ctrl/Full-Build",
      filePath: "src/readiness/README.md",
      testExecuted: "Subsystem documentation exists beside the module",
      expected: "Operators can see what is and is not claimed",
      actual: "src/readiness/README.md is part of the subsystem change.",
      status: "PASSED",
      state: "VERIFIED",
    }),
  ];
}

function daisyEvidence(run: DaisyRun | null): EvidenceRecord[] {
  if (!run) {
    return [
      evidence({
        category: "proprietary-ai",
        weight: 3,
        repository: "iamfather420-ctrl/Full-Build",
        testExecuted: "Daisy acceptance gates",
        expected: "Fifteen gates evaluated from a real training run",
        actual: "No approved training run has been executed in this process.",
        status: "UNVERIFIED",
        state: "AUTHORIZATION_REQUIRED",
        failure: "Gates are not passed by default and are not marked not-applicable.",
        remediation: "Approve Generate and verify proprietary Daisy model weights.",
      }),
    ];
  }
  return run.gates.map((item) =>
    evidence({
      category: item.id === "temporary" ? "proprietary-ai" : item.id === "communication" || item.id === "evaluation" ? "ai-training" : "model-artifacts",
      weight: item.id === "temporary" || item.id === "inference" ? 3 : 1,
      repository: "iamfather420-ctrl/Full-Build",
      filePath: "packages/daisy-weight-engine/src/training.ts",
      testExecuted: `Daisy gate ${item.id}`,
      expected: item.label,
      actual: item.detail,
      status: item.status,
      state: item.state,
      artifact: run.artifactSha256,
      failure: item.passed ? null : item.detail,
      remediation: item.passed ? null : "Do not rename the transitional GGUF. Close the remaining capabilities listed on the Daisy panel.",
    }),
  );
}

export async function buildReport(options?: {
  client?: GitHubClient;
  env?: RuntimeEnv;
  execution?: ExecutionNote | null;
  sandbox?: SandboxRecord | null;
  daisy?: DaisyRun | null;
}): Promise<ReadinessReport> {
  resetEvidenceSequence();
  const client = options?.client ?? liveGitHubClient();
  const env = options?.env ?? nodeEnv();
  const daisy = resolvedDaisy(options?.daisy);
  let remote;
  try {
    remote = await scanRepositories(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : "scan failed";
    remote = {
      probes: [],
      evidence: [
        evidence({
          category: "repository-integrity",
          repository: "iamfather420-ctrl/Full-Build",
          testExecuted: "scanRepositories",
          expected: "Remote probes complete or return per-repository failures",
          actual: message,
          status: "BLOCKED",
          state: "BLOCKED",
          failure: message,
          remediation: "Restore GitHub API access and scan again.",
        }),
      ],
      pathsByRepo: new Map<string, string[]>(),
    };
  }
  const records = [...remote.evidence, ...platformEvidence(), ...daisyEvidence(daisy)];
  for (const record of records) history.append(record);
  const { weighted, raw } = completionOf(records);
  const scannerRecords = records.filter((record) =>
    ["repository-integrity", "code-completeness", "governance", "documentation"].includes(record.category),
  );
  const ecosystemRecords = records.filter((record) =>
    ["integration-wiring", "ecosystem-operation", "repository-integrity"].includes(record.category),
  );
  const githubPublic = remote.probes.some((probe) => probe.httpStatus === 200);
  const daisyGates = daisy
    ? daisy.gates
    : [
        {
          id: "not-run",
          label: "Daisy pipeline not run",
          passed: false,
          status: "UNVERIFIED" as const,
          state: "AUTHORIZATION_REQUIRED" as const,
          detail: "Approve weight generation to evaluate the fifteen acceptance gates.",
        },
      ];
  const limitations = [
    "Blocked and unverified checks remain in the score denominator.",
    "The Library of Congress repository is a source candidate only.",
    "The trained model, once run, is a CPU MLP next-token classifier on an authored four-sentence seed.",
    "The transitional GGUF chat model is not removed.",
    "No production deploy, secret read, or Neon migration is performed.",
    "Private repositories return 404 to the public API and stay unauthorized rather than verified-missing.",
    ...(daisy?.remaining ?? ["Daisy acceptance gates have not been executed in this process."]),
  ];
  return {
    generatedAt: new Date().toISOString(),
    integrationBase: INTEGRATION_BASE,
    weightedCompletion: weighted,
    rawCompletion: raw,
    scannerCompletion: completionOf(scannerRecords).weighted,
    ecosystemCompletion: completionOf(ecosystemRecords).weighted,
    counts: countsOf(records),
    categories: scoreCategories(records),
    daisyGates,
    daisyCompletion: daisy ? daisy.completion : 0,
    temporaryModel: {
      present: true,
      eliminated: false,
      identity: `${TRANSITIONAL_GGUF.release} ${TRANSITIONAL_GGUF.sha256}`,
      remaining: daisy?.remaining ?? ["Replacement training has not been approved."],
    },
    repositories: remote.probes,
    authorization: authorizationMatrix(env, githubPublic),
    tasks: taskViews(new Map()),
    evidence: records,
    sandbox: options?.sandbox ?? null,
    execution: options?.execution ?? null,
    acceptance: acceptanceOf(daisy),
    limitations,
    historyDepth: history.depth(),
  };
}

export async function scan(client?: GitHubClient): Promise<ReadinessReport> {
  return buildReport(lastDaisy ? { client, daisy: lastDaisy } : { client });
}

export async function execute(taskIds: readonly string[], approved: boolean, client?: GitHubClient): Promise<ReadinessReport> {
  const resolved = resolveTasks(taskIds);
  const startedAt = new Date().toISOString();
  const results: ExecutionNote["results"] = [];
  let daisy = lastDaisy;
  let trainingError: string | null = null;
  const needsTraining = resolved.some((task) =>
    ["generate-weights", "model-engine", "training-engine", "inference-engine", "daisy-language"].includes(task.id),
  );
  if (needsTraining && approved) {
    try {
      daisy = runDaisyPipeline(requireWeights());
      lastDaisy = daisy;
    } catch (error) {
      daisy = null;
      trainingError = error instanceof Error ? error.message : "Training failed.";
    }
  }
  for (const task of resolved) {
    results.push({ taskId: task.id, state: taskState(task.id, approved, daisy, trainingError), detail: taskDetail(task.id, approved, daisy, trainingError) });
  }
  const finishedAt = new Date().toISOString();
  const execution: ExecutionNote = {
    submittedTaskIds: [...taskIds],
    resolvedTaskIds: resolved.map((task) => task.id),
    startedAt,
    finishedAt,
    results,
  };
  const report = await buildReport({
    client,
    daisy,
    execution,
    sandbox: sandboxPlan(null),
  });
  const stateByTask = new Map(results.map((result) => [result.taskId, { state: result.state, detail: result.detail }]));
  report.tasks = taskViews(stateByTask);
  return report;
}

function taskState(id: string, approved: boolean, daisy: DaisyRun | null, trainingError: string | null): OperationalState {
  if (id === "scan-only" || id === "production-verification" || id === "cross-repo") return "COMPLETED";
  if (!approved) return "AUTHORIZATION_REQUIRED";
  if (trainingError && ["generate-weights", "model-engine", "training-engine", "inference-engine", "daisy-language"].includes(id)) {
    return "VALIDATION_FAILED";
  }
  if (id === "replace-temporary" || id === "database" || id === "infrastructure" || id === "repository-repairs" || id === "security" || id === "workflows") {
    return "BLOCKED";
  }
  if (id === "critical-blockers" || id === "complete-outstanding" || id === "integration-wiring") return "BLOCKED";
  if (id === "discover-engine") return "REVIEW_REQUIRED";
  if (!daisy) return "BLOCKED";
  const gate = (gateId: string) => daisy.gates.find((item) => item.id === gateId);
  if (id === "generate-weights") return gate("weights")?.passed && gate("integrity")?.passed ? "COMPLETED" : "VALIDATION_FAILED";
  if (id === "model-engine") return gate("model-engine")?.passed ? "COMPLETED" : "VALIDATION_FAILED";
  if (id === "training-engine") return gate("training-engine")?.passed ? "COMPLETED" : "VALIDATION_FAILED";
  if (id === "inference-engine") return gate("inference")?.passed ? "COMPLETED" : "VALIDATION_FAILED";
  if (id === "daisy-language") return gate("communication")?.passed ? "COMPLETED" : "VALIDATION_FAILED";
  return "BLOCKED";
}

function taskDetail(id: string, approved: boolean, daisy: DaisyRun | null, trainingError: string | null): string {
  if (!approved && id !== "scan-only" && id !== "production-verification" && id !== "cross-repo") {
    return "Approval was not granted. Nothing was changed.";
  }
  if (trainingError && ["generate-weights", "model-engine", "training-engine", "inference-engine", "daisy-language"].includes(id)) {
    return trainingError;
  }
  if (id === "replace-temporary") {
    return "Refused. The transitional GGUF is still the chat identity and the micro-model is not an accepted replacement.";
  }
  if (id === "database") return "Refused. No Neon migration was applied.";
  if (id === "infrastructure") return "Refused. No paid compute or hosting resource was created.";
  if (id === "repository-repairs") return "Refused. No branch was pushed from this execution.";
  if (id === "security") return "No secret rotation or production security change was performed.";
  if (id === "workflows") return "No GitHub Actions run was observed, so workflow failures were not marked fixed.";
  if (id === "discover-engine") return "Language-source repository discovery does not admit documents into training.";
  if (id === "critical-blockers") return "Critical blockers that require authorization remain blocked.";
  if (id === "complete-outstanding") return "Expanded tasks that are still blocked or failed prevent this plan from being complete.";
  if (id === "integration-wiring") return "Cross-repository wiring is recorded as incomplete wherever execution was not observed.";
  if (daisy && (id === "generate-weights" || id === "training-engine" || id === "inference-engine" || id === "daisy-language" || id === "model-engine")) {
    return `Run ${daisy.durationMs}ms on ${daisy.hardware}. Steps ${daisy.trainedSteps}. Loss ${daisy.trainLossBefore} -> ${daisy.trainLossAfter}. Held-out accuracy ${daisy.heldOutAccuracy}. Output: ${daisy.generatedText ?? "none"}. Source ${daisy.inferenceSource}.`;
  }
  if (id === "scan-only" || id === "production-verification" || id === "cross-repo") {
    return "Read-only scan finished. Scores include failures and blocks.";
  }
  return "No completion was recorded.";
}

export function resetReadinessState(): void {
  lastDaisy = null;
}
