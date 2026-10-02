// src/lib/buildRecoveryHandler.ts

export interface BuildNode {
  id: string;
  fingerprintSHA256?: string;
  [key: string]: any;
}

export function sanitizeNodeFingerprint(node: BuildNode | null | undefined): string {
  if (!node) {
    return '';
  }
  // Safely extract fingerprintSHA256 with fallback to prevent undefined property reads
  return node?.fingerprintSHA256 ?? '';
}

export function handleBuildRecovery(nodes: BuildNode[]): { success: boolean; activeNodes: number } {
  let validCount = 0;
  
  for (const node of nodes) {
    const fingerprint = sanitizeNodeFingerprint(node);
    if (fingerprint !== '') {
      validCount++;
    }
  }

  return {
    success: validCount > 0,
    activeNodes: validCount
  };
}
