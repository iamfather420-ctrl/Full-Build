// src/lib/workspaceInitGuard.ts

export interface WorkspaceConfig {
  nodes?: Array<{
    id: string;
    fingerprintSHA256?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export function initializeWorkspaceState(config: WorkspaceConfig | null | undefined): WorkspaceConfig {
  if (!config) {
    return { nodes: [] };
  }

  // Ensure nodes array and individual node properties are fully initialized to avoid runtime crashes
  return {
    ...config,
    nodes: (config.nodes ?? []).map(node => ({
      ...node,
      fingerprintSHA256: node?.fingerprintSHA256 ?? 'uninitialized-fingerprint'
    }))
  };
}
