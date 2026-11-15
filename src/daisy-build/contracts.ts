/**
 * Daisy model-build contracts.
 *
 * This layer deliberately separates learned model parameters from executable
 * Full Build capabilities. Software modules are connected as tools/services;
 * suitable examples and outcomes may also become training data.
 */

export type CapabilityMode = 'runtime-tool' | 'training-source' | 'both';
export type BuildStage =
  | 'inventory'
  | 'plan'
  | 'initialize'
  | 'train'
  | 'validate'
  | 'export'
  | 'release';

export interface FullBuildCapability {
  id: string;
  name: string;
  sourcePath: string;
  mode: CapabilityMode;
  description: string;
  verification: 'source-present-runtime-unverified';
}

export interface DaisyArchitectureSpec {
  modelId: 'daisy-haminja';
  version: string;
  architectureFamily: string;
  /** Explicit dimensions are required before tensor allocation. */
  dimensions: Record<string, number>;
  tokenizerId: string;
  contextLength: number;
  targetFormat: 'safetensors' | 'gguf' | 'onnx';
  trainingObjectives: string[];
  requiredCapabilities: string[];
}

export interface TrainingCorpusRef {
  id: string;
  version: string;
  uri: string;
  sha256: string;
  purpose: string;
  approved: boolean;
}

export interface DaisyBuildRequest {
  architecture: DaisyArchitectureSpec;
  corpora: TrainingCorpusRef[];
  maxSteps: number;
  checkpointEvery: number;
  approval: {
    planApproved: boolean;
    resourceApproved: boolean;
    releaseApproved: boolean;
  };
}

export interface BuildPlan {
  planId: string;
  architectureHash: string;
  tensorCount: number;
  parameterCount: number;
  estimatedMemoryBytes: number;
  workerShards: number;
  notes: string[];
}

export interface WeightArtifact {
  artifactId: string;
  modelId: string;
  version: string;
  format: string;
  architectureHash: string;
  tensorCount: number;
  parameterCount: number;
  checksum: string;
  checkpoint: boolean;
  provenance: {
    engine: string;
    sourceRevision: string;
    corpusIds: string[];
    trainingSteps: number;
  };
}

export interface ValidationReport {
  passed: boolean;
  checks: Array<{ id: string; passed: boolean; detail: string }>;
}

export interface ExportedModel {
  artifact: WeightArtifact;
  location: string;
  format: string;
  checksum: string;
}

export interface DaisyBuildResult {
  status: 'blocked' | 'validated' | 'exported';
  completedStages: BuildStage[];
  plan?: BuildPlan;
  artifact?: WeightArtifact;
  validation?: ValidationReport;
  exported?: ExportedModel;
  blockers: string[];
}

/**
 * Adapter contract for the Weight Engine. The adapter implementation must
 * bind to the existing engine exports rather than reimplementing them:
 * loadKernel, planBuild, assembleTensors, validateWeights, verifyShard,
 * generateDataset, buildBatchPayload, splitParts, reduceGradients,
 * applySgd, and evaluate.
 */
export interface DaisyWeightEnginePort {
  inspect(): Promise<{ ready: boolean; engineVersion: string; sourceRevision: string; missing: string[] }>;
  plan(architecture: DaisyArchitectureSpec): Promise<BuildPlan>;
  initialize(plan: BuildPlan, architecture: DaisyArchitectureSpec): Promise<WeightArtifact>;
  train(input: {
    initial: WeightArtifact;
    corpora: TrainingCorpusRef[];
    maxSteps: number;
    checkpointEvery: number;
  }): Promise<WeightArtifact>;
  validate(artifact: WeightArtifact, architecture: DaisyArchitectureSpec): Promise<ValidationReport>;
  export(artifact: WeightArtifact, format: DaisyArchitectureSpec['targetFormat']): Promise<ExportedModel>;
}

export interface FullBuildCapabilityPort {
  inventory(): Promise<FullBuildCapability[]>;
  prepareTrainingCorpus(capabilities: FullBuildCapability[]): Promise<TrainingCorpusRef[]>;
}
