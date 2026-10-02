export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  description: string | null;
  html_url: string;
  default_branch?: string;
  stargazers_count?: number;
  updated_at?: string;
  language?: string;
  selected?: boolean;
  isUploadedZip?: boolean;
  uploadedFiles?: { path: string; content: string; size: number }[];
}

export interface RepoFile {
  path: string;
  type: "blob" | "tree";
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
  recommendedTool: "pnpm" | "npm" | "yarn";
  hasTurborepo: boolean;
  dependencyAnalysis: DependencyAnalysis;
  rootFiles: MonorepoFile[];
  subPackageModifications: SubPackageModification[];
  sovereignMetrics: SovereignMetrics;
  buildPlan: string[];
}
