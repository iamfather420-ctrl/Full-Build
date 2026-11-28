import { createHash } from "node:crypto";
import { admitCorpus, AUTHORED_CORPUS_ID } from "./languageGate";
import type { DaisyGate, ModelWeights, Sample, WeightFns } from "./types";

/** Instructional seed authored for this pipeline. It is not the Library of Congress collection. */
export const AUTHORED_SEED = [
  "a noun names a person place or thing",
  "a verb shows an action or a state",
  "an adjective describes a noun",
  "a sentence needs a subject and a verb",
] as const;

/** Held out of training. Must stay disjoint from AUTHORED_SEED pair generation. */
export const HELD_OUT = ["thing shows action state"] as const;

export const MODEL_NAME = "daisy-next-token-micro";
export const TRAINING_CONFIG = {
  corpusId: AUTHORED_CORPUS_ID,
  optimizer: "sgd",
  seed: 20261127,
  hiddenSize: 24,
  epochs: 30,
  learningRate: 0.2,
  checkpointEpochs: 8,
  architectureFamily: "mlp-classifier",
  format: "daisy-tensors-v1",
} as const;

export interface TokenPair {
  previous: string;
  next: string;
}

export interface DaisyRun {
  gates: DaisyGate[];
  completion: number;
  model: ModelWeights | null;
  trainLossBefore: number | null;
  trainLossAfter: number | null;
  heldOutAccuracy: number | null;
  trainPairs: number;
  heldOutPairs: number;
  artifactSha256: string | null;
  initSha256: string | null;
  weightsChanged: boolean;
  trainAccuracy: number | null;
  trainedSteps: number;
  durationMs: number;
  hardware: string;
  remaining: string[];
  eliminatedTemporary: false;
  generatedText: string | null;
  inferenceSource: "daisy-trained-weights" | "none";
}

function tokenize(sentence: string): string[] {
  return sentence.toLowerCase().split(/\s+/).filter(Boolean);
}

export function pairsFrom(sentences: readonly string[]): TokenPair[] {
  const pairs: TokenPair[] = [];
  for (const sentence of sentences) {
    const tokens = tokenize(sentence);
    for (let index = 0; index < tokens.length - 1; index += 1) {
      pairs.push({ previous: tokens[index], next: tokens[index + 1] });
    }
  }
  return pairs;
}

export function assertNoLeakage(train: readonly string[], test: readonly string[]): void {
  const trainPairs = new Set(pairsFrom(train).map((pair) => `${pair.previous}\t${pair.next}`));
  for (const pair of pairsFrom(test)) {
    if (trainPairs.has(`${pair.previous}\t${pair.next}`)) {
      throw new Error(`Test leakage: ${pair.previous} -> ${pair.next}`);
    }
  }
}

function vocabOf(pairs: TokenPair[]): string[] {
  return [...new Set(pairs.flatMap((pair) => [pair.previous, pair.next]))].sort();
}

function oneHot(token: string, vocab: string[]): number[] {
  const vector = vocab.map(() => 0);
  const index = vocab.indexOf(token);
  if (index >= 0) vector[index] = 1;
  return vector;
}

function argmax(values: number[]): number {
  let best = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[best]) best = index;
  }
  return best;
}

/** Mirrors packages/daisy-weight-engine/src/training.ts forward. A parity test guards drift. */
export function forwardLast(model: ModelWeights, input: number[]): number[] {
  let activation = input;
  const layers = model.tensors.length / 2;
  for (let layer = 0; layer < layers; layer += 1) {
    const weights = model.tensors.find((tensor) => tensor.name === `layers.${layer}.weights`);
    const bias = model.tensors.find((tensor) => tensor.name === `layers.${layer}.bias`);
    if (!weights || !bias) throw new Error(`Missing tensors for layer ${layer}`);
    activation = bias.data.map((value, row) => {
      let sum = value;
      for (let column = 0; column < activation.length; column += 1) {
        sum += weights.data[row * activation.length + column] * activation[column];
      }
      return layer === layers - 1 ? sum : Math.tanh(sum);
    });
  }
  return activation;
}

function toSamples(pairs: TokenPair[], vocab: string[]): Sample[] {
  return pairs
    .filter((pair) => vocab.includes(pair.previous) && vocab.includes(pair.next))
    .map((pair) => ({ input: oneHot(pair.previous, vocab), target: oneHot(pair.next, vocab) }));
}

function accuracy(model: ModelWeights, pairs: TokenPair[], vocab: string[]): number {
  if (pairs.length === 0) return 0;
  let correct = 0;
  for (const pair of pairs) {
    if (!vocab.includes(pair.previous) || !vocab.includes(pair.next)) continue;
    const scores = forwardLast(model, oneHot(pair.previous, vocab));
    if (vocab[argmax(scores)] === pair.next) correct += 1;
  }
  return correct / pairs.length;
}

export function artifactDigest(model: ModelWeights): string {
  const payload = {
    format: model.format,
    architecture: model.architecture,
    trainedSteps: model.metadata.trainedSteps,
    loss: model.metadata.loss,
    tensors: model.tensors.map((tensor) => ({ name: tensor.name, shape: tensor.shape, data: tensor.data })),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function gate(id: string, label: string, passed: boolean, detail: string, failedState: DaisyGate["state"] = "VALIDATION_FAILED"): DaisyGate {
  return {
    id,
    label,
    passed,
    status: passed ? "PASSED" : "FAILED",
    state: passed ? "VERIFIED" : failedState,
    detail,
  };
}

export function runDaisyPipeline(fns: WeightFns): DaisyRun {
  const started = Date.now();
  const admission = admitCorpus(TRAINING_CONFIG.corpusId);
  if (!admission.admitted) throw new Error(admission.reason);
  assertNoLeakage(AUTHORED_SEED, HELD_OUT);
  const trainPairs = pairsFrom(AUTHORED_SEED);
  const heldPairs = pairsFrom(HELD_OUT);
  const vocab = vocabOf(trainPairs);
  const trainSamples = toSamples(trainPairs, vocab);
  const architecture = {
    name: MODEL_NAME,
    family: TRAINING_CONFIG.architectureFamily,
    inputSize: vocab.length,
    hiddenSizes: [TRAINING_CONFIG.hiddenSize],
    outputSize: vocab.length,
    seed: TRAINING_CONFIG.seed,
  };
  const initial = fns.loadKernel(architecture);
  const initSha256 = artifactDigest(initial);
  const validation = fns.validateWeights(initial);
  const lossBefore = fns.evaluate(initial, trainSamples);
  const checkpoint = fns.applySgd(structuredClone(initial), trainSamples, TRAINING_CONFIG.learningRate, TRAINING_CONFIG.checkpointEpochs);
  const model = fns.applySgd(structuredClone(checkpoint), trainSamples, TRAINING_CONFIG.learningRate, TRAINING_CONFIG.epochs - TRAINING_CONFIG.checkpointEpochs);
  const lossAfter = model.metadata.loss;
  const finalValidation = fns.validateWeights(model);
  const digest = artifactDigest(model);
  const weightsChanged = digest !== initSha256;
  const reloaded = JSON.parse(JSON.stringify(model)) as ModelWeights;
  const reloadDigest = artifactDigest(reloaded);
  const heldAccuracy = accuracy(reloaded, heldPairs, vocab);
  const trainAccuracy = accuracy(reloaded, trainPairs, vocab);
  const samplePrevious = trainPairs[0]?.previous ?? "a";
  const generated = vocab[argmax(forwardLast(reloaded, oneHot(samplePrevious, vocab)))] ?? "";
  const generatedText = generated.length > 0 ? `${samplePrevious} ${generated}` : null;
  const lossImproved = lossAfter !== null && lossAfter < lossBefore;
  const stepsOk = model.metadata.trainedSteps === TRAINING_CONFIG.epochs * trainSamples.length;
  const recoveryOk = checkpoint.metadata.trainedSteps === TRAINING_CONFIG.checkpointEpochs * trainSamples.length && model.metadata.trainedSteps > checkpoint.metadata.trainedSteps;
  const tensorsFinite = model.tensors.every((tensor) => tensor.data.length > 0 && tensor.data.every((value) => Number.isFinite(value)));
  const communicationOk = heldAccuracy >= 0.5;
  const gates: DaisyGate[] = [
    gate("architecture", "Architecture documented", architecture.family === "mlp-classifier" && architecture.name === MODEL_NAME, `${architecture.name} ${architecture.family} input=${architecture.inputSize} hidden=${TRAINING_CONFIG.hiddenSize} output=${architecture.outputSize}. This is a next-token classifier, not a transformer and not the transitional GGUF.`),
    gate("provenance", "Training data provenance", admission.admitted && admission.documentsAdmitted === 0, `Corpus ${TRAINING_CONFIG.corpusId}. ${AUTHORED_SEED.length} authored sentences. Zero language-repository documents admitted.`),
    gate("tokenizer", "Tokenizer validated", vocab.length > 2 && trainSamples.length === trainPairs.length, `Whitespace tokenizer, train vocabulary ${vocab.length}, unknown held-out tokens are not added.`),
    gate("model-engine", "Model engine executes", validation.valid && initial.tensors.length > 0, validation.valid ? `loadKernel produced ${initial.tensors.length} tensors` : validation.errors.join("; ")),
    gate("training-engine", "Training engine executes", stepsOk && lossImproved && weightsChanged, `SGD lr=${TRAINING_CONFIG.learningRate} epochs=${TRAINING_CONFIG.epochs} seed=${TRAINING_CONFIG.seed} steps=${model.metadata.trainedSteps} loss ${lossBefore.toFixed(6)} -> ${lossAfter?.toFixed(6) ?? "null"}`),
    gate("records", "Training records authentic", lossAfter !== null && Number.isFinite(lossAfter) && lossImproved, `Train loss ${lossBefore} -> ${lossAfter}. Train next-token accuracy ${trainAccuracy.toFixed(3)} is not the held-out result.`),
    gate("weights", "Actual weights generated", model.metadata.trainedSteps > 0 && weightsChanged && tensorsFinite && model.format === "daisy-tensors-v1", `format=${model.format} steps=${model.metadata.trainedSteps} init ${initSha256} final ${digest}`),
    gate("integrity", "Artifact integrity", finalValidation.valid && digest === reloadDigest && tensorsFinite, `sha256 ${digest}`),
    gate("load", "Inference loads those weights", reloadDigest === digest && forwardLast(reloaded, trainSamples[0].input).length === vocab.length, "Reloaded JSON weights and executed the training-engine forward pass."),
    gate("inference", "Actual inference succeeds", Boolean(generatedText) && generated !== samplePrevious, generatedText ? `Input "${samplePrevious}" -> model token "${generated}". Source daisy-trained-weights. No template fallback.` : "Model produced no token."),
    gate("communication", "Communication tests", communicationOk, `Held-out next-token accuracy ${(heldAccuracy * 100).toFixed(1)}% on ${heldPairs.length} pairs. Threshold is 50%. Train accuracy ${(trainAccuracy * 100).toFixed(1)}% is excluded.`),
    gate("evaluation", "Independent evaluation", communicationOk, `Held-out sentences are disjoint from training pairs. Accuracy ${(heldAccuracy * 100).toFixed(1)}%.`),
    gate("persistence", "Persistence verified", digest === reloadDigest, "In-process JSON round-trip preserved the tensor digest. Neon was not written."),
    gate("recovery", "Recovery tested", recoveryOk, `Checkpoint steps ${checkpoint.metadata.trainedSteps} resumed to ${model.metadata.trainedSteps}.`),
    gate("temporary", "Temporary model eliminated", false, "The Full-Build chat path still identifies the transitional GGUF. This micro-model was not substituted into InferenceRouter.", "BLOCKED"),
  ];
  const remaining = [
    "Chat runtime still references the transitional GGUF in src/inference/verifiedDaisyModel.ts and LocalInferenceRuntime.",
    "FirstPartyInferenceRuntime still reports FIRST_PARTY_INFERENCE_NOT_IMPLEMENTED.",
    "Historical LOC grammar evidence at src/inference/daisyLocGrammarEvidence.ts records inference_status NOT_RUN and activation_authorized false. This run did not load that checkpoint.",
    "The trained artifact is an MLP next-token classifier over a 4-sentence authored seed, not a conversational model.",
    `Held-out accuracy is ${(heldAccuracy * 100).toFixed(1)}%.`,
    "Library of Congress texts remain blocked: the source manifest does not authorize training.",
    "DiscoverEngineClient only submits withheld assertions. It does not ingest the language repository.",
    "No GPU worker was used. Training ran on this CPU process.",
    "Persistence is the committed JSON artifact, not Neon.",
  ];
  return {
    gates,
    completion: gates.filter((item) => item.passed).length / gates.length,
    model,
    trainLossBefore: lossBefore,
    trainLossAfter: lossAfter,
    heldOutAccuracy: heldAccuracy,
    trainPairs: trainPairs.length,
    heldOutPairs: heldPairs.length,
    artifactSha256: digest,
    initSha256,
    weightsChanged,
    trainAccuracy,
    trainedSteps: model.metadata.trainedSteps,
    durationMs: Date.now() - started,
    hardware: "cpu-process",
    remaining,
    eliminatedTemporary: false,
    generatedText,
    inferenceSource: generatedText ? "daisy-trained-weights" : "none",
  };
}

export function measureLoaded(model: ModelWeights, fns: WeightFns): {
  trainLoss: number;
  trainAccuracy: number;
  heldOutAccuracy: number;
  generatedText: string | null;
} {
  const trainPairs = pairsFrom(AUTHORED_SEED);
  const heldPairs = pairsFrom(HELD_OUT);
  const vocab = vocabOf(trainPairs);
  const trainSamples = toSamples(trainPairs, vocab);
  const trainLoss = fns.evaluate(model, trainSamples);
  const previous = trainPairs[0]?.previous ?? "a";
  const generated = vocab[argmax(forwardLast(model, oneHot(previous, vocab)))] ?? "";
  return {
    trainLoss,
    trainAccuracy: accuracy(model, trainPairs, vocab),
    heldOutAccuracy: accuracy(model, heldPairs, vocab),
    generatedText: generated.length > 0 ? `${previous} ${generated}` : null,
  };
}

export function daisyRunToEvidenceCategory(run: DaisyRun): string {
  return `daisy ${MODEL_NAME} steps=${run.trainedSteps} loss=${run.trainLossAfter} heldOut=${run.heldOutAccuracy} sha=${run.artifactSha256}`;
}
