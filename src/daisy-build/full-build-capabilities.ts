import type { FullBuildCapability } from './contracts';

/**
 * Source-level inventory based on the existing Daisy subsystem executor
 * imports in src/nodes/DaisySubsystemExecutors.ts. Presence in this manifest
 * is not a claim that every subsystem has passed live/runtime verification.
 */
export const FULL_BUILD_CAPABILITIES: FullBuildCapability[] = [
  {
    id: 'mmtai-authority',
    name: 'MMTAI authorization and execution gate',
    sourcePath: 'src/mmtai/MMTAIProtocol.ts',
    mode: 'runtime-tool',
    description: 'Authorization and permission checks around protected execution.',
    verification: 'source-present-runtime-unverified',
  },
  {
    id: 'formal-proof',
    name: 'Z3 formal proof engine',
    sourcePath: 'src/proofs/Z3FormalProofEngine.ts',
    mode: 'runtime-tool',
    description: 'Formal theorem proving and proof-certificate generation.',
    verification: 'source-present-runtime-unverified',
  },
  {
    id: 'bounded-termination',
    name: 'NOPOT bounded termination verifier',
    sourcePath: 'src/proofs/NOPOTProof.ts',
    mode: 'runtime-tool',
    description: 'Bounded algorithm-termination verification.',
    verification: 'source-present-runtime-unverified',
  },
  {
    id: 'evidence-audit',
    name: 'Crystal Clear Box evidence projection',
    sourcePath: 'src/audit/CrystalClearBox.ts',
    mode: 'both',
    description: 'Auditable evidence projection; only approved, redacted examples may enter training.',
    verification: 'source-present-runtime-unverified',
  },
  {
    id: 'solution-pipeline',
    name: 'Solution pipeline',
    sourcePath: 'src/solutions/SolutionPipeline.ts',
    mode: 'both',
    description: 'Multi-stage problem-solving workflow; successful, reviewed traces may become training examples.',
    verification: 'source-present-runtime-unverified',
  },
  {
    id: 'marketplace',
    name: 'Marketplace engine',
    sourcePath: 'src/marketplace/MarketplaceEngine.ts',
    mode: 'runtime-tool',
    description: 'Marketplace operations remain executable services, not model parameters.',
    verification: 'source-present-runtime-unverified',
  },
  {
    id: 'order-lifecycle',
    name: 'Order lifecycle manager',
    sourcePath: 'src/marketplace/OrderLifecycle.ts',
    mode: 'runtime-tool',
    description: 'Authorized order-state transitions remain controlled application logic.',
    verification: 'source-present-runtime-unverified',
  },
  {
    id: 'identity',
    name: 'Authentication and tenant authorization',
    sourcePath: 'src/auth/AuthService.ts',
    mode: 'runtime-tool',
    description: 'Identity, permissions, and tenant boundaries must remain external enforcement.',
    verification: 'source-present-runtime-unverified',
  },
  {
    id: 'paradox-registry',
    name: 'Paradox registry',
    sourcePath: 'src/paradoxes/ParadoxRegistry.ts',
    mode: 'both',
    description: 'Approved paradox definitions and verified resolutions may form curated training material.',
    verification: 'source-present-runtime-unverified',
  },
  {
    id: 'durable-audit',
    name: 'Durable persistence and audit trail',
    sourcePath: 'src/database/DurableStore.ts',
    mode: 'runtime-tool',
    description: 'Durable state and audit records remain application infrastructure.',
    verification: 'source-present-runtime-unverified',
  },
];

/** Return a copy so callers cannot mutate the canonical inventory. */
export function getFullBuildCapabilities(): FullBuildCapability[] {
  return FULL_BUILD_CAPABILITIES.map((item) => ({ ...item }));
}
