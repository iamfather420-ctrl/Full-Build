export type CheckStatus = "PASSED" | "FAILED" | "BLOCKED" | "UNVERIFIED" | "NOT_APPLICABLE";

export type OperationalState =
  | "BLOCKED"
  | "AUTHORIZATION_REQUIRED"
  | "RECOVERY_REQUIRED"
  | "VALIDATION_FAILED"
  | "REVIEW_REQUIRED"
  | "AUTHORIZED"
  | "EXECUTING"
  | "VERIFIED"
  | "COMPLETED";

export interface EvidenceRecord {
  id: string;
  category: string;
  weight: number;
  repository: string;
  branch: string | null;
  commitSha: string | null;
  filePath: string | null;
  lineStart: number | null;
  lineEnd: number | null;
  testExecuted: string;
  expected: string;
  actual: string;
  timestamp: string;
  status: CheckStatus;
  state: OperationalState;
  artifact: string | null;
  failure: string | null;
  remediation: string | null;
}

export interface CategoryScore {
  id: string;
  label: string;
  weight: number;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  unverified: number;
  notApplicable: number;
  weightedCompletion: number;
  rawCompletion: number;
}

export interface DaisyGate {
  id: string;
  label: string;
  passed: boolean;
  status: CheckStatus;
  state: OperationalState;
  detail: string;
}

export interface RepoProbe {
  id: string;
  role: string;
  owner: string;
  repo: string;
  httpStatus: number | null;
  privateOrMissing: boolean;
  defaultBranch: string | null;
  commitSha: string | null;
  pushedAt: string | null;
  description: string | null;
  fileCount: number | null;
  treeTruncated: boolean | null;
  state: OperationalState;
  note: string;
}

export interface AuthCell {
  resource: string;
  read: OperationalState;
  write: OperationalState;
  execute: OperationalState;
  deploy: OperationalState;
  administer: OperationalState;
  note: string;
}

export interface TaskView {
  id: string;
  label: string;
  group: string;
  mutates: boolean;
  destructive: boolean;
  requiresApproval: boolean;
  dependsOn: string[];
  state: OperationalState;
  detail: string;
}

export interface SandboxRecord {
  id: string;
  state: OperationalState;
  baseRepository: string;
  baseBranch: string;
  baseCommit: string | null;
  workingBranch: string;
  cloned: boolean;
  note: string;
}

export interface ExecutionNote {
  submittedTaskIds: string[];
  resolvedTaskIds: string[];
  startedAt: string;
  finishedAt: string;
  results: Array<{ taskId: string; state: OperationalState; detail: string }>;
}

export interface ReadinessReport {
  generatedAt: string;
  integrationBase: string;
  weightedCompletion: number;
  rawCompletion: number;
  scannerCompletion: number;
  ecosystemCompletion: number;
  counts: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    unverified: number;
    notApplicable: number;
  };
  categories: CategoryScore[];
  daisyGates: DaisyGate[];
  daisyCompletion: number;
  temporaryModel: {
    present: boolean;
    eliminated: boolean;
    identity: string;
    remaining: string[];
  };
  repositories: RepoProbe[];
  authorization: AuthCell[];
  tasks: TaskView[];
  evidence: EvidenceRecord[];
  sandbox: SandboxRecord | null;
  execution: ExecutionNote | null;
  limitations: string[];
  historyDepth: number;
}

export interface ArchitectureSpec {
  name: string;
  family: "mlp-classifier";
  inputSize: number;
  hiddenSizes: number[];
  outputSize: number;
  seed?: number;
}

export interface Tensor {
  name: string;
  shape: number[];
  data: number[];
}

export interface ModelWeights {
  format: "daisy-tensors-v1";
  architecture: ArchitectureSpec;
  tensors: Tensor[];
  metadata: { createdAt: string; trainedSteps: number; loss: number | null };
}

export interface Sample {
  input: number[];
  target: number[];
}

export interface WeightFns {
  loadKernel: (architecture: ArchitectureSpec) => ModelWeights;
  applySgd: (model: ModelWeights, data: Sample[], learningRate: number, epochs: number) => ModelWeights;
  evaluate: (model: ModelWeights, data: Sample[]) => number;
  validateWeights: (model: ModelWeights) => { valid: boolean; errors: string[] };
}
