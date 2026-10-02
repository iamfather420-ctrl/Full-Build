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
  description: string;
  url: string;
  stars: number;
  language: string;
  updatedAt: string;
}

export interface UnificationResult {
  unifiedId: string;
  timestamp: string;
  username: string;
  clonedCount: number;
  config: {
    dockerfile: string;
    cloudbuild: string;
    entrypoints: Array<{
      service: string;
      route: string;
      environment: string[];
    }>;
  };
  status: string;
  message: string;
}

