import { artifactDigest, forwardLast, type TokenPair } from "./daisyPipeline";
import type { ModelWeights } from "./types";

export interface PairScore {
  previous: string;
  expected: string;
  predicted: string | null;
  inVocabulary: boolean;
  correct: boolean;
}

export interface ScoreSummary {
  accuracy: number;
  legacyAccuracy: number;
  correct: number;
  scored: number;
  unscored: number;
  predictions: PairScore[];
}

function argmax(values: number[]): number {
  let best = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[best]) best = index;
  }
  return best;
}

function oneHot(token: string, vocab: string[]): number[] {
  const vector = vocab.map(() => 0);
  const index = vocab.indexOf(token);
  if (index >= 0) vector[index] = 1;
  return vector;
}

/** Unknown tokens are unscored. They are not counted as wrong and cannot create a pass. */
export function summarizeScores(predictions: PairScore[]): ScoreSummary {
  const scored = predictions.filter((item) => item.inVocabulary);
  const correct = scored.filter((item) => item.correct).length;
  return {
    accuracy: scored.length === 0 ? 0 : correct / scored.length,
    legacyAccuracy: predictions.length === 0 ? 0 : correct / predictions.length,
    correct,
    scored: scored.length,
    unscored: predictions.length - scored.length,
    predictions,
  };
}

export function scorePairs(model: ModelWeights, pairs: readonly TokenPair[], vocab: readonly string[]): ScoreSummary {
  const vocabulary = [...vocab];
  const predictions = pairs.map((pair) => {
    const inVocabulary = vocabulary.includes(pair.previous) && vocabulary.includes(pair.next);
    if (!inVocabulary) {
      return { previous: pair.previous, expected: pair.next, predicted: null, inVocabulary: false, correct: false };
    }
    const predicted = vocabulary[argmax(forwardLast(model, oneHot(pair.previous, vocabulary)))] ?? null;
    return {
      previous: pair.previous,
      expected: pair.next,
      predicted,
      inVocabulary: true,
      correct: predicted === pair.next,
    };
  });
  return summarizeScores(predictions);
}

export function inferLoadedToken(model: ModelWeights, expectedSha256: string, previous: string, vocab: readonly string[]): {
  ok: boolean;
  code: "EXECUTED" | "DIGEST_MISMATCH" | "UNKNOWN_TOKEN";
  token: string | null;
  digest: string;
} {
  const digest = artifactDigest(model);
  if (digest !== expectedSha256) return { ok: false, code: "DIGEST_MISMATCH", token: null, digest };
  const vocabulary = [...vocab];
  if (!vocabulary.includes(previous)) return { ok: false, code: "UNKNOWN_TOKEN", token: null, digest };
  const token = vocabulary[argmax(forwardLast(model, oneHot(previous, vocabulary)))] ?? null;
  return { ok: token !== null, code: "EXECUTED", token, digest };
}
