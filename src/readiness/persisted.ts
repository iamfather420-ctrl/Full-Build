import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { artifactDigest, forwardLast, HELD_OUT, measureLoaded, pairsFrom, TRAINING_CONFIG, type DaisyRun } from "./daisyPipeline";
import { languageSourceAdmission } from "./languageGate";
import type { ModelWeights, WeightFns } from "./types";

export interface PersistedReport {
  modelName: string;
  corpusId: string;
  optimizer: string;
  seed: number;
  hiddenSize: number;
  epochs: number;
  learningRate: number;
  initSha256: string;
  artifactSha256: string;
  trainLossBefore: number;
  trainLossAfter: number;
  trainAccuracy: number;
  heldOutAccuracy: number;
  trainPairs: number;
  heldOutPairs: number;
  trainedSteps: number;
  generatedText: string;
  weightsChanged: boolean;
  documentsAdmitted: 0;
  languageAdmission: "BLOCKED";
  productionInferenceRouter: "BLOCKED";
  proprietaryConversationalModel: "NOT_COMPLETE";
}

function artifactDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "artifacts");
}

export function readPersistedFiles(): { model: ModelWeights; report: PersistedReport } {
  const dir = artifactDir();
  const model = JSON.parse(readFileSync(join(dir, "daisy-next-token-micro.weights.json"), "utf8")) as ModelWeights;
  const report = JSON.parse(readFileSync(join(dir, "daisy-next-token-micro.report.json"), "utf8")) as PersistedReport;
  return { model, report };
}

export function verifyPersistedArtifact(fns: WeightFns): DaisyRun {
  const { model, report } = readPersistedFiles();
  const measured = measureLoaded(model, fns);
  const digest = artifactDigest(model);
  const validation = fns.validateWeights(model);
  const finite = model.tensors.every((tensor) => tensor.data.length > 0 && tensor.data.every((value) => Number.isFinite(value)));
  const digestMatches = digest === report.artifactSha256;
  const changed = report.weightsChanged && report.initSha256 !== digest && digestMatches;
  const lossMatches = Math.abs(measured.trainLoss - report.trainLossAfter) < 1e-9 && model.metadata.loss !== null && Math.abs(model.metadata.loss - measured.trainLoss) < 1e-9;
  const heldMatches = Math.abs(measured.heldOutAccuracy - report.heldOutAccuracy) < 1e-9;
  const textMatches = measured.generatedText === report.generatedText;
  const language = languageSourceAdmission();
  const heldPass = heldMatches && measured.heldOutAccuracy >= 0.5;
  const loadedVector = forwardLast(model, Array.from({ length: model.architecture.inputSize }, (_, index) => (index === 0 ? 1 : 0)));
  const inferencePass = validation.valid && digestMatches && textMatches && loadedVector.length === model.architecture.inputSize && measured.generatedText !== null;
  const detail = `Recomputed sha256 ${digest}. Recorded ${report.artifactSha256}. Init ${report.initSha256}. Recomputed loss ${measured.trainLoss}. Recomputed held-out ${measured.heldOutAccuracy}. Generation ${measured.generatedText ?? "none"}.`;
  const gate = (id: string, label: string, passed: boolean, text: string, state: DaisyRun["gates"][number]["state"] = passed ? "VERIFIED" : "VALIDATION_FAILED") => ({
    id,
    label,
    passed,
    status: passed ? "PASSED" as const : "FAILED" as const,
    state,
    detail: text,
  });
  const gates: DaisyRun["gates"] = [
    gate("training-engine", "Training engine executes", changed && lossMatches && report.trainedSteps > 0, detail),
    gate("weights", "Actual weights generated", changed && finite && model.format === "daisy-tensors-v1", detail),
    gate("integrity", "Artifact integrity", validation.valid && digestMatches && finite, detail),
    gate("evaluation", "Independent evaluation", heldPass && report.heldOutPairs === pairsFrom(HELD_OUT).length && report.documentsAdmitted === 0, `Recomputed held-out accuracy ${(measured.heldOutAccuracy * 100).toFixed(1)}% on ${report.heldOutPairs} pairs. Threshold 50%. File match ${heldMatches}.`),
    gate("load", "Inference loads those weights", inferencePass, `Loaded persisted tensors and ran forward. Vector length ${loadedVector.length}.`),
    gate("inference", "Actual inference succeeds", inferencePass, `Recomputed generation "${measured.generatedText ?? "none"}". Production InferenceRouter was not switched.`),
    gate("communication", "Communication tests", heldPass, `Held-out accuracy ${(measured.heldOutAccuracy * 100).toFixed(1)}%. This is not a conversation test.`),
    gate("temporary", "Temporary model eliminated", false, "Transitional GGUF remains the chat identity. Micro-model was not installed over it.", "BLOCKED"),
    gate("provenance", "Training data provenance", report.corpusId === TRAINING_CONFIG.corpusId && report.documentsAdmitted === 0 && language.admitted === false, language.reason),
  ];
  return {
    gates,
    completion: gates.filter((item) => item.passed).length / gates.length,
    model,
    trainLossBefore: report.trainLossBefore,
    trainLossAfter: report.trainLossAfter,
    heldOutAccuracy: measured.heldOutAccuracy,
    trainPairs: report.trainPairs,
    heldOutPairs: report.heldOutPairs,
    artifactSha256: digest,
    initSha256: report.initSha256,
    weightsChanged: changed,
    trainAccuracy: measured.trainAccuracy,
    trainedSteps: report.trainedSteps,
    durationMs: 0,
    hardware: "persisted-artifact",
    remaining: [
      language.reason,
      "Production InferenceRouter still selects the transitional GGUF or fail-closes. It was not pointed at this artifact.",
      "Held-out evaluation uses the recorded disjoint pair count. A pass requires accuracy of at least 50%.",
      "Discover-Engine was not observed ingesting the language repository.",
    ],
    eliminatedTemporary: false,
    generatedText: report.generatedText,
    inferenceSource: inferencePass ? "daisy-trained-weights" : "none",
  };
}
