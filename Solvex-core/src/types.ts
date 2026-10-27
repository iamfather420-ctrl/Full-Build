/**
 * Native UI types — recovered archive contracts merged with App_native requirements.
 * Source: full-build-recovered archive (v0.1.0-daisy-ai-os) + types needed by App_native.
 */
export interface GridNode {
  id: number;
  label: string;
  role: string;
  status: 'active' | 'synced' | 'isolated' | 'critical';
  activity: string;
  uptime: string;
  temperature: number;
  load: number;
}

export interface ParadoxOperator {
  id: number;
  name: string;
  type: 'shared' | 'proprietary';
  solutionId: number;
  solutionName: string;
  proofOfEfficacy: string;
  description: string;
}

export interface PaymentProvider {
  id: string;
  name: string;
  type: 'card' | 'wallet' | 'crypto' | 'bank';
  status: 'active' | 'configured' | 'inactive';
  connectedAt?: string;
  icon: string;
  connectionId?: string;
}

export interface BuildLog {
  id: string;
  timestamp: string;
  step: 'init' | 'watermark' | 'obfuscate' | 'fingerprint' | 'seal' | 'deploy' | 'done';
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'system' | 'ai';
  text: string;
  timestamp: string;
  metadata?: {
    nodesAffected?: number[];
    solutionTriggered?: number;
    paymentAuthorized?: boolean;
    paymentDetails?: {
      amount: number;
      provider: string;
      checkoutUrl: string;
      item: string;
    };
  };
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name?: string;
  owner?: { login: string; avatar_url?: string };
  description: string | null;
  html_url?: string;
  url?: string;
  default_branch?: string;
  stargazers_count?: number;
  stars?: number;
  language?: string | null;
  updated_at?: string;
  updatedAt?: string;
  selected?: boolean;
  isUploadedZip?: boolean;
  uploadedFiles?: { path: string; content: string; size: number }[];
}

export interface RepoFile {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
}

export interface MonorepoFile {
  name: string;
  content: string;
  description: string;
}

export interface DependencyConflict {
  name: string;
  versions: string[];
  recommendation: string;
}

export interface DependencyAnalysis {
  sharedDependencies: string[];
  conflicts: DependencyConflict[];
  deduplicationImpact: string;
}

export interface SubPackageModification {
  repoName: string;
  targetDir: string;
  packageJsonChanges: {
    name: string;
    modifiedContent: string;
    explanation: string;
  };
}

export interface SovereignMetrics {
  nodesSynced: number;
  paradoxesResolved: string[];
  fingerprintSHA256: string;
  complianceValidation: string;
}

export interface AnalysisResult {
  recommendedTool: 'pnpm' | 'npm' | 'yarn';
  hasTurborepo: boolean;
  dependencyAnalysis: DependencyAnalysis;
  rootFiles: MonorepoFile[];
  subPackageModifications: SubPackageModification[];
  sovereignMetrics: SovereignMetrics;
  buildPlan: string[];
}

export interface UnificationResult {
  unifiedId: string;
  timestamp: string;
  username: string;
  clonedCount: number;
  config: {
    dockerfile: string;
    cloudbuild: string;
    entrypoints: Array<{ service: string; route: string; environment: string[] }>;
  };
  status: string;
  message: string;
}
