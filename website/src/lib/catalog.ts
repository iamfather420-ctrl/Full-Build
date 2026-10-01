export type EvidenceState =
  | "VERIFIED"
  | "PARTIAL"
  | "INTENDED"
  | "CLAIM"
  | "UNKNOWN";

export type Product = {
  sku: string;
  title: string;
  short: string;
  blurb: string;
  priceCents: number;
  cadence: "once" | "seat";
  category: "intelligence" | "identity" | "execution" | "proof" | "commerce";
  evidence: EvidenceState;
  proofBundle: string;
  solutionId: string;
  reversible: boolean;
  sla: string;
  specs: { label: string; value: string }[];
};

export const products: Product[] = [
  {
    sku: "daisy-parai",
    title: "Daisy Haminja Instance",
    short: "Post-agentic recursive intelligence, governed.",
    blurb:
      "A licensed Daisy PARAI cycle bound to a human root of trust. Daisy reasons, formalizes, and proposes. Solvex authorizes and executes. The model is not the authority.",
    priceCents: 1200000,
    cadence: "once",
    category: "intelligence",
    evidence: "VERIFIED",
    proofBundle: "PB-DAISY-PARAI-01",
    solutionId: "DH-I-001",
    reversible: true,
    sla: "99.99% deterministic cycle",
    specs: [
      { label: "Cycle", value: "12-stage PARAI" },
      { label: "Model", value: "Independent cognition layer" },
      { label: "Authority", value: "Human root of trust" },
      { label: "Fail mode", value: "Closed" },
    ],
  },
  {
    sku: "dh-s-001",
    title: "Bounded Zeno Convergence",
    short: "Machine-checked geometric solver.",
    blurb:
      "Archimedean geometric convergence in bounded O(log(1/ε)) iterations. NOPOT inductive variant and DFRL operator DFRL-P-001. Unverified products cannot occupy this slot.",
    priceCents: 63281,
    cadence: "once",
    category: "proof",
    evidence: "VERIFIED",
    proofBundle: "PB-DH-S-001",
    solutionId: "DH-S-001",
    reversible: true,
    sla: "100% machine-checked",
    specs: [
      { label: "Domain", value: "Real analysis" },
      { label: "Speedup", value: "+42.5%" },
      { label: "Kernel", value: "Z3 WASM 4.12.2" },
      { label: "Status", value: "UNSAT 88/88 family" },
    ],
  },
  {
    sku: "npot-identity",
    title: "NOPOT Registration",
    short: "Validity without unnecessary PII.",
    blurb:
      "Register identity, use a validity record, burn the rest. A relying party can receive proof that you are who you claim without collecting the underlying personal file.",
    priceCents: 24000,
    cadence: "once",
    category: "identity",
    evidence: "VERIFIED",
    proofBundle: "PB-NOPOT-REG-04",
    solutionId: "NP-I-004",
    reversible: true,
    sla: "Burn-complete on request",
    specs: [
      { label: "Disclose", value: "Minimum necessary" },
      { label: "Burn", value: "Controlled destruction" },
      { label: "Guardian", value: "Human key optional" },
      { label: "Header", value: "Signed cell ~380ch" },
    ],
  },
  {
    sku: "compliance-immut",
    title: "Compliance Immutability",
    short: "Living evidence, not a PDF.",
    blurb:
      "Continuously observable compliance state: controls, exceptions, remediation, receipts. Daisy can notify, request evidence, and record outcomes. External outreach stays authorized.",
    priceCents: 480000,
    cadence: "seat",
    category: "commerce",
    evidence: "VERIFIED",
    proofBundle: "PB-CMP-IMM-09",
    solutionId: "SX-C-009",
    reversible: true,
    sla: "Crystal Clear Box export",
    specs: [
      { label: "Controls", value: "Evidence-linked" },
      { label: "Audit", value: "Merkle chain" },
      { label: "Outreach", value: "Authorized only" },
      { label: "State", value: "Live, not static" },
    ],
  },
  {
    sku: "mmtai-seat",
    title: "MMTAI Execution Seat",
    short: "Track A reasons. Track B acts.",
    blurb:
      "A governed autonomous execution seat. Cognitive operations never inherit execution permission. Checkpoints, rollback, compensating transactions. The system does nothing it cannot reverse.",
    priceCents: 180000,
    cadence: "seat",
    category: "execution",
    evidence: "VERIFIED",
    proofBundle: "PB-MMTAI-SEAT-12",
    solutionId: "MM-E-012",
    reversible: true,
    sla: "Fail-closed on missing recovery",
    specs: [
      { label: "Tracks", value: "A cognition / B execution" },
      { label: "Recovery", value: "Checkpoint + reverse" },
      { label: "Telemetry", value: "Material ops logged" },
      { label: "Boundary", value: "Capability ≠ authority" },
    ],
  },
  {
    sku: "dfrl-layer",
    title: "DFRL Formal Layer",
    short: "Turn a claim into a proof obligation.",
    blurb:
      "Daisy Formal Reasoning Layer: evidence → obligation → formalize → verifier → registry → governed execution. 88 operators, 88 UNSAT, 0 SAT, 0 errors on the recorded Z3 WASM run.",
    priceCents: 320000,
    cadence: "once",
    category: "proof",
    evidence: "VERIFIED",
    proofBundle: "PB-DFRL-88",
    solutionId: "DF-R-088",
    reversible: true,
    sla: "Replayable verification",
    specs: [
      { label: "Operators", value: "88 / 88 UNSAT" },
      { label: "Engine", value: "Z3 v4.12.2 WASM" },
      { label: "Duplicates", value: "Family-variant split" },
      { label: "Claim", value: "Never auto-promoted" },
    ],
  },
  {
    sku: "crystal-box",
    title: "Crystal Clear Box",
    short: "Inspectable trust. Not a black box.",
    blurb:
      "Every material operation produces an evidence chain: who asked, what authority, what authorization, what executed, what reversed, what receipt. Show the evidence. Do not ask for blind trust.",
    priceCents: 96000,
    cadence: "seat",
    category: "proof",
    evidence: "VERIFIED",
    proofBundle: "PB-CCB-07",
    solutionId: "SX-O-007",
    reversible: true,
    sla: "Forensic record per op",
    specs: [
      { label: "Record", value: "Identity → recovery" },
      { label: "Export", value: "Signed receipt" },
      { label: "Opacity", value: "Forbidden" },
      { label: "Failure", value: "Preserved as data" },
    ],
  },
  {
    sku: "proof-commerce",
    title: "Proof-Carrying Commerce",
    short: "Unverified goods never go live.",
    blurb:
      "Problem → evidence → solution → verification → offer → entitlement → JIT authorization → observable execution. Entitlement is not execution authority. PayPal stays fail-closed until the provider is actually connected.",
    priceCents: 240000,
    cadence: "once",
    category: "commerce",
    evidence: "VERIFIED",
    proofBundle: "PB-PCC-15",
    solutionId: "SX-M-015",
    reversible: true,
    sla: "LOCAL_VERIFIED_PAYPAL_EXTERNAL",
    specs: [
      { label: "Gate", value: "Verified marketplace only" },
      { label: "Payments", value: "Fail-closed adapter" },
      { label: "Escrow", value: "Sovereign lifecycle" },
      { label: "Price", value: "Defensible v1.4" },
    ],
  },
  {
    sku: "worker-seat",
    title: "Autonomous Worker",
    short: "Work inside a cage of proof.",
    blurb:
      "A worker is not an unrestricted agent. Defined capabilities, authorization boundaries, observability, recovery. Verified learning feeds later cycles without widening authority.",
    priceCents: 72000,
    cadence: "seat",
    category: "execution",
    evidence: "VERIFIED",
    proofBundle: "PB-WRK-21",
    solutionId: "MM-W-021",
    reversible: true,
    sla: "No silent authority growth",
    specs: [
      { label: "Scope", value: "Capability-bound" },
      { label: "Learn", value: "Verified only" },
      { label: "Deliverable", value: "Receipt-backed" },
      { label: "Payment", value: "After second verify" },
    ],
  },
  {
    sku: "root-trust",
    title: "Personal Root of Trust",
    short: "Your AI. Your keys. Not a session.",
    blurb:
      "Person → root-of-trust device → identity → Daisy instance → Solvex capabilities. Individually controlled computational entity, not a disposable chat tab owned by a platform.",
    priceCents: 48000,
    cadence: "once",
    category: "identity",
    evidence: "PARTIAL",
    proofBundle: "PB-PRT-03",
    solutionId: "NP-R-003",
    reversible: true,
    sla: "Hardware-dependent",
    specs: [
      { label: "Keys", value: "Human-held" },
      { label: "State", value: "Portable" },
      { label: "Evidence", value: "PARTIAL" },
      { label: "Claim", value: "Not universal" },
    ],
  },
  {
    sku: "zero-loss-bus",
    title: "Zero-Loss Telemetry Bus",
    short: "A guarantee, not a slogan.",
    blurb:
      "Design objective: continuous observability across Daisy and execution. Persistence, ack, retry, duplication, ordering, crash recovery, partition behavior. Until demonstrated, this listing stays INTENDED and cannot enter the verified marketplace.",
    priceCents: 0,
    cadence: "once",
    category: "execution",
    evidence: "INTENDED",
    proofBundle: "PB-ZLT-00",
    solutionId: "SX-T-000",
    reversible: false,
    sla: "Not yet demonstrated",
    specs: [
      { label: "Status", value: "INTENDED" },
      { label: "Sale", value: "Blocked fail-closed" },
      { label: "Why", value: "Guarantee undemonstrated" },
      { label: "Paper", value: "§56" },
    ],
  },
];

export function productBySku(sku: string) {
  return products.find((p) => p.sku === sku);
}

export const categories = [
  { id: "all", label: "All" },
  { id: "intelligence", label: "Intelligence" },
  { id: "identity", label: "Identity" },
  { id: "execution", label: "Execution" },
  { id: "proof", label: "Proof" },
  { id: "commerce", label: "Commerce" },
] as const;
