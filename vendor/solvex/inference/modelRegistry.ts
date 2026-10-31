/**
 * Public model registry.
 *
 * Compared 2026-10-30:
 * - GitHub iamfather420-ctrl/Full-Build @ beee681 has src/inference
 *   (LocalInferenceRuntime). It loads weights only from DAISY_MODEL_PATH.
 * - The 2026-10-16 full-build archive has no inference package and no
 *   GGUF, ONNX, or safetensors file.
 *
 * This registry does not invent weight bytes. A PRESENT row requires a
 * measured size and sha256 supplied by a probe. The preview probe finds none.
 */

export type WeightStatus = 'ABSENT' | 'PRESENT' | 'NOT_APPLICABLE';
export type InferenceState = 'BLOCKED' | 'READY' | 'NOT_GENERATIVE';

export interface ModelRecord {
  id: string;
  role: string;
  format: string;
  weightStatus: WeightStatus;
  weightBytes: number | null;
  weightSha256: string | null;
  inference: InferenceState;
  note: string;
}

export interface WeightProbe {
  bytes: number;
  sha256: string;
}

const DAISY_MODEL_ID = 'daisy-local-generative';

const BASE: ModelRecord[] = [
  {
    id: DAISY_MODEL_ID,
    role: 'First-party chat',
    format: 'GGUF',
    weightStatus: 'ABSENT',
    weightBytes: null,
    weightSha256: null,
    inference: 'BLOCKED',
    note: 'No weight file in the GitHub tree or the full-build archive. Chat stays blocked.',
  },
  {
    id: 'z3-smt-wasm',
    role: '120-case formal solver',
    format: 'WASM',
    weightStatus: 'NOT_APPLICABLE',
    weightBytes: null,
    weightSha256: null,
    inference: 'NOT_GENERATIVE',
    note: 'A solver, not a generative weight file. It is not installed in this preview.',
  },
];

export function publicModelRegistry(daisyWeights?: WeightProbe | null): ModelRecord[] {
  return BASE.map((record) => {
    if (record.id !== DAISY_MODEL_ID || !daisyWeights) return { ...record };
    if (!Number.isFinite(daisyWeights.bytes) || daisyWeights.bytes <= 0) return { ...record };
    if (!/^[a-f0-9]{64}$/i.test(daisyWeights.sha256)) return { ...record };
    return {
      ...record,
      weightStatus: 'PRESENT',
      weightBytes: daisyWeights.bytes,
      weightSha256: daisyWeights.sha256.toLowerCase(),
      inference: 'BLOCKED',
      note: 'Weights are recorded by hash only. The engine is still not configured, so inference stays blocked.',
    };
  });
}
