/** Canonical targets. A name in this list is not evidence the repository is connected. */
export interface CanonicalTarget {
  id: string;
  role: string;
  owner: string;
  repo: string;
  subpath: string | null;
  note: string;
}

export const INTEGRATION_BASE = "38c575207408a6aecb9a6032adf5acb99d994026";

/**
 * Identity of the transitional GGUF chat artifact recorded in
 * Full-Build src/inference/verifiedDaisyModel.ts at the integration base.
 * This is not a Daisy-trained weight file produced by the readiness pipeline.
 */
export const TRANSITIONAL_GGUF = {
  release: "daisy-model-45661493760",
  sha256: "d158c64ff056f3c76fbbc6f4824c53e5ffd5de94931f71db5a418cb1df9e50fd",
  bytes: 105454176,
  quantization: "Q4_K_M",
  sourceFile: "src/inference/verifiedDaisyModel.ts",
  lineStart: 6,
  lineEnd: 14,
} as const;

export const CANONICAL_TARGETS: CanonicalTarget[] = [
  {
    id: "full-build",
    role: "control-plane",
    owner: "iamfather420-ctrl",
    repo: "Full-Build",
    subpath: null,
    note: "Central orchestration repository. Engines that have no separate repository are located here and must still be execution-tested.",
  },
  {
    id: "paradox-box",
    role: "solvex-paradox-box",
    owner: "iamfather420-ctrl",
    repo: "SOLVEX-PARADOX-BOX",
    subpath: null,
    note: "Private repository on the authenticated account. The public API returns 404 for private repositories, which is not proof of absence.",
  },
  {
    id: "loc-grammar",
    role: "language-source",
    owner: "Solvex-Paradox-Box",
    repo: "loc-english-grammar-source-collection",
    subpath: null,
    note: "Authoritative source candidate. Reachability is not a license review and is not permission to train.",
  },
  {
    id: "discover-engine",
    role: "discovery-engine",
    owner: "iamfather420-ctrl",
    repo: "Discover-Engine",
    subpath: null,
    note: "Separate Discover-Engine repository. Full-Build also has src/discovery/DiscoverEngineClient.ts, which only submits withheld assertions.",
  },
  {
    id: "daisy-ui",
    role: "daisy-ui-os",
    owner: "iamfather420-ctrl",
    repo: "Paradox-Engine-AI-UI-OS",
    subpath: null,
    note: "Private Daisy UI/OS repository. Not assumed present inside Full-Build.",
  },
  {
    id: "model-engine",
    role: "model-engine",
    owner: "iamfather420-ctrl",
    repo: "Full-Build",
    subpath: "packages/daisy-weight-engine",
    note: "No Model-Engine repository exists. The model engine is packages/daisy-weight-engine and is an MLP trainer, not a generative transformer.",
  },
  {
    id: "training-engine",
    role: "training-engine",
    owner: "iamfather420-ctrl",
    repo: "Full-Build",
    subpath: "packages/daisy-weight-engine/src/training.ts",
    note: "Training entrypoint inside the weight engine. A file path is not a training record.",
  },
  {
    id: "inference-engine",
    role: "inference-engine",
    owner: "iamfather420-ctrl",
    repo: "Full-Build",
    subpath: "src/inference",
    note: "Chat inference is the local GGUF runtime. FirstPartyInferenceRuntime still reports that no verified implementation exists.",
  },
];

export const NOTABLE_PATHS = [
  "packages/daisy-weight-engine/src/training.ts",
  "packages/daisy-weight-engine/src/kernel.ts",
  "src/discovery/DiscoverEngineClient.ts",
  "src/inference/InferenceRouter.ts",
  "src/inference/verifiedDaisyModel.ts",
  "src/inference/LocalInferenceRuntime.ts",
  "src/brain/FirstPartyInferenceRuntime.ts",
  "server.ts",
  "package.json",
] as const;
