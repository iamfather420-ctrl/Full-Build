export type GateBand = 'pipeline' | 'invariant' | 'closure';

export interface GateSeed {
  number: number;
  id: string;
  name: string;
  band: GateBand;
}

const PIPELINE: Array<[string, string]> = [
  ['GATE-00', 'Repository Integrity & Baseline Provenance'],
  ['GATE-01', 'Dependency Preflight Layer'],
  ['GATE-02', 'Secret & Configuration Preflight'],
  ['GATE-03', 'Execution Environment Selection'],
  ['GATE-04', 'Build & TypeScript Static Verification'],
  ['GATE-05', 'Unit & Enterprise Invariant Test Suite'],
  ['GATE-06', 'DFRL 88-Operator Z3 SMT Formal Verification'],
  ['GATE-07', 'Cleanroom Deterministic Replay Verification'],
  ['GATE-08', 'SMT Mutation, SHA-256 Tamper & Fail-Closed Tests'],
  ['GATE-09', 'Daisy 54-Node Architecture CUJ Execution Coverage'],
  ['GATE-10', 'Multi-Tenant Relational & Merkle Chain Persistence'],
  ['GATE-11', 'External Provider Gateways (Neon, PayPal)'],
  ['GATE-12', 'End-to-End Lifecycle Execution'],
  ['GATE-13', 'Evidence Generation & Artifact Packaging'],
  ['GATE-14', 'Final Truth-Boundary Audit & Production Gate'],
];

const INVARIANTS = [
  'Authentication & RBAC Evaluation',
  'MMTAI Single-Use Token Replay Prevention',
  'Multi-Tenant Cryptographic Partition Isolation',
  'Audit Chain Cryptographic Hash Continuity',
  'Anti-Tamper Sentinel Active Tamper Detection',
  'Atomic State Checkpoint & Reversibility Engine',
  'Irreversible Action Rollback Rejection Guard',
  'Paradox Registry Integrity (Exact 32 Bootstrap Set)',
  'Paradox Duplicate & Family Variant Taxonomy',
  'NOPOT Bounded Termination Formal Proof Verification',
  'Preserved Solution DH-S-001 Verification Integrity',
  'Proof Bundle Builder Seal & Independent Oracle Attestation',
  'Cleanroom Replay Bitrot & Divergence Detection',
  '21-Stage Problem Resolution Pipeline Full Traversal',
  'Pipeline Fail-Closed Gate Halts and Quarantines on Error',
  'Defensible Pricing Formula v1.4 Deterministic Execution',
  'Marketplace Blocks Publication of Unverified Solutions',
  'PayPal DN-35 Server-Authoritative Fail-Closed Enforcement',
  'External Adapter Inventory Transparency (Neon, PayPal)',
  'Crystal Clear Box Redaction Uses Persisted Evidence Only',
  'Daisy Node Registry (54 Distinct Nodes)',
  'System Status Projection Computes Real State',
  'SqliteStore Multi-Tenant Persistence & 27 Tables Integrity',
  'Fail-Closed: CLAIM_ONLY / UNVERIFIED Offer Publication Blocked',
  'Fail-Closed: UNKNOWN / UNVERIFIED Order Creation Blocked',
  'Fail-Closed: Local Authentication Cannot Mint Sessions',
  'Fail-Closed: Unverified Identity Cannot Access Tenant Data',
  'Fail-Closed: Missing PayPal Credentials Evaluated',
  'Order Lifecycle Blocks Unverified or Missing Orders',
  'Central Failure Diversion Preserves Evidence & Executes Rollback',
];

export const GATE_CATALOG: GateSeed[] = [
  ...PIPELINE.map(([id, name], index) => ({
    number: index + 1,
    id,
    name,
    band: 'pipeline' as const,
  })),
  ...INVARIANTS.map((name, index) => ({
    number: 16 + index,
    id: `INV-${String(index + 1).padStart(2, '0')}`,
    name,
    band: 'invariant' as const,
  })),
  {
    number: 46,
    id: 'GATE-46',
    name: 'Master Truth-Boundary & Proof Closure Gate',
    band: 'closure',
  },
];
