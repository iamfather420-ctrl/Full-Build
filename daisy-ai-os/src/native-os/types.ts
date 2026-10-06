/**
 * UNIFIED DAISY AI OS — Native branch shared types
 * Layer: CURRENT MAIN → AI-OS NATIVE BRANCH → UNIFIED DAISY AI OS
 */

export type PlatformTarget = 'linux' | 'arm64' | 'windows' | 'macos' | 'android';

export type ClaimScope =
  | 'MODEL_VERIFIED'
  | 'LOCAL_VERIFIED'
  | 'SANDBOX_VERIFIED'
  | 'PRODUCTION_VERIFIED'
  | 'EXTERNAL_PROVIDER_REQUIRED';

export type DaisyCapability =
  | 'daisy_brain'
  | 'nodes_54'
  | 'mmtai'
  | 'dfrl'
  | 'corpus_120'
  | 'gates_46'
  | 'solvex'
  | 'marketplace'
  | 'neon'
  | 'paypal';

export interface NativeCapabilityManifest {
  capability: DaisyCapability;
  claim_scope: ClaimScope;
  native_bound: boolean;
  notes?: string;
}

export interface ProcessHandle {
  pid: string;
  name: string;
  status: 'running' | 'stopped' | 'blocked' | 'zombie';
  started_at: string;
  platform: PlatformTarget;
}

export interface MemoryRegion {
  id: string;
  kind: 'heap' | 'stack' | 'vault' | 'ledger' | 'scratch';
  bytes: number;
  sealed: boolean;
}

export interface AuditEvent {
  id: string;
  ts: string;
  layer: 'main' | 'native' | 'unified';
  action: string;
  actor: string;
  claim_scope: ClaimScope;
  payload?: Record<string, unknown>;
}

export interface PermissionGrant {
  subject: string;
  resource: string;
  action: 'read' | 'write' | 'execute' | 'admin';
  granted: boolean;
  reason: string;
}

export interface RuntimeState {
  os_name: 'Daisy AI OS';
  version: string;
  environment: 'local' | 'sandbox' | 'production';
  platform: PlatformTarget;
  uptime_ms: number;
  activation: 'INACTIVE' | 'ACTIVE' | 'BLOCKED';
}
