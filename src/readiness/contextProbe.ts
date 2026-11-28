import { readPersistedFiles } from "./persisted";
import { AUTHORED_SEED, HELD_OUT, pairsFrom, TRAINING_CONFIG } from "./daisyPipeline";
import { scorePairs } from "./evaluation";
import type { ModelWeights, Sample, WeightFns } from "./types";

/** Authored context fixture. It is not the Library of Congress collection and not the original four-sentence seed. */
export const CONTEXT_TRAIN = ["verb shows action now", "chart shows result now"] as const;
export const CONTEXT_FINAL = ["chart shows action later", "verb shows result later", "noun shows state later"] as const;

export interface ContextProbe {
  originalHeldOutAccuracy: number;
  oneTokenFinalAccuracy: number;
  twoTokenFinalAccuracy: number;
  finalUnseenAccuracy: number;
  locDocumentsUsed: 0;
  finalSetUsedForTuning: false;
  twoTokenDigest: string;
  interpretation: string;
}

function tokens(sentence: string): string[] {
  return sentence.toLowerCase().split(/\s+/).filter(Boolean);
}

function contexts(sentences: readonly string[], width: number): { context: string[]; next: string }[] {
  const rows: { context: string[]; next: string }[] = [];
  for (const sentence of sentences) {
    const parts = tokens(sentence);
    for (let index = width; index < parts.length; index += 1) {
      rows.push({ context: parts.slice(index - width, index), next: parts[index] });
    }
  }
  return rows;
}

function vocabulary(sentences: readonly string[]): string[] {
  return [...new Set(sentences.flatMap(tokens))].sort();
}

function oneHot(token: string, vocab: string[]): number[] {
  const vector = vocab.map(() => 0);
  const index = vocab.indexOf(token);
  if (index >= 0) vector[index] = 1;
  return vector;
}

function toSamples(rows: { context: string[]; next: string }[], vocab: string[]): Sample[] {
  return rows
    .filter((row) => row.context.every((token) => vocab.includes(token)) && vocab.includes(row.next))
    .map((row) => ({
      input: row.context.flatMap((token) => oneHot(token, vocab)),
      target: oneHot(row.next, vocab),
    }));
}

function accuracyOf(model: ModelWeights, rows: { context: string[]; next: string }[], vocab: string[]): number {
  const scored = rows.filter((row) => row.context.every((token) => vocab.includes(token)) && vocab.includes(row.next));
  if (scored.length === 0) return 0;
  let correct = 0;
  for (const row of scored) {
    const input = row.context.flatMap((token) => oneHot(token, vocab));
    let activation = input;
    const layers = model.tensors.length / 2;
    for (let layer = 0; layer < layers; layer += 1) {
      const weights = model.tensors.find((tensor) => tensor.name === `layers.${layer}.weights`);
      const bias = model.tensors.find((tensor) => tensor.name === `layers.${layer}.bias`);
      if (!weights || !bias) return 0;
      activation = bias.data.map((value, rowIndex) => {
        let sum = value;
        for (let column = 0; column < activation.length; column += 1) sum += weights.data[rowIndex * activation.length + column] * activation[column];
        return layer === layers - 1 ? sum : Math.tanh(sum);
      });
    }
    let best = 0;
    for (let index = 1; index < activation.length; index += 1) if (activation[index] > activation[best]) best = index;
    if (vocab[best] === row.next) correct += 1;
  }
  return correct / scored.length;
}

export function runContextProbe(fns: WeightFns): ContextProbe {
  const persisted = readPersistedFiles();
  const originalVocab = [...new Set(pairsFrom(AUTHORED_SEED).flatMap((pair) => [pair.previous, pair.next]))].sort();
  const original = scorePairs(persisted.model, pairsFrom(HELD_OUT), originalVocab);
  const vocab = vocabulary(CONTEXT_TRAIN);
  const train = (width: 1 | 2) => {
    const rows = contexts(CONTEXT_TRAIN, width);
    const samples = toSamples(rows, vocab);
    const model = fns.loadKernel({
      name: "context-probe-not-a-language-model",
      family: "mlp-classifier",
      inputSize: vocab.length * width,
      hiddenSizes: [TRAINING_CONFIG.hiddenSize],
      outputSize: vocab.length,
      seed: TRAINING_CONFIG.seed + width,
    });
    return fns.applySgd(model, samples, TRAINING_CONFIG.learningRate, TRAINING_CONFIG.epochs);
  };
  const one = train(1);
  const two = train(2);
  const finalRowsOne = contexts(CONTEXT_FINAL, 1);
  const finalRowsTwo = contexts(CONTEXT_FINAL, 2);
  const twoTokenFinalAccuracy = accuracyOf(two, finalRowsTwo, vocab);
  return {
    originalHeldOutAccuracy: original.accuracy,
    oneTokenFinalAccuracy: accuracyOf(one, finalRowsOne, vocab),
    twoTokenFinalAccuracy,
    finalUnseenAccuracy: twoTokenFinalAccuracy,
    locDocumentsUsed: 0,
    finalSetUsedForTuning: false,
    twoTokenDigest: fns.validateWeights(two).valid ? String(two.metadata.trainedSteps) : "invalid",
    interpretation: "The one-token final score reuses training successors such as chart->shows and shows->action. It is not an independent pass. The two-token final contexts were not trained and scored separately. The original four-sentence held-out set was not used to tune either probe.",
  };
}
