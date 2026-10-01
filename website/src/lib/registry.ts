import type { EvidenceState } from "@/lib/catalog";

export type AgentKind =
  | "PARAI"
  | "WORKER"
  | "VERIFIER"
  | "REGISTRAR"
  | "SENTINEL"
  | "GATEWAY";

export type Agent = {
  id: string;
  name: string;
  kind: AgentKind;
  evidence: EvidenceState;
  owner: string;
  model: string;
  capability: string;
  authority: string;
  authorization: string;
  reversible: boolean;
  signedCell: string;
  nodes: number;
  lastProof: string;
  summary: string;
};

export const agents: Agent[] = [
  {
    id: "daisy-haminja-001",
    name: "Daisy Haminja",
    kind: "PARAI",
    evidence: "VERIFIED",
    owner: "Human Root of Trust",
    model: "Independent cognition · not the source of authority",
    capability: "Multimodal ingest, recursive reason, formalize, propose",
    authority: "Possessed by licensed instance, scoped to tenant",
    authorization: "Per-operation. Never implied by capability.",
    reversible: true,
    signedCell:
      "UAF1|cell=DH-001|kind=PARAI|ev=VERIFIED|root=HUMAN|nodes=54|dfrl=88|ts=2026-09-28T05:25:55Z|sig=066bf028b7c8644f",
    nodes: 54,
    lastProof: "PB-DAISY-PARAI-01",
    summary:
      "Post-Agentic Recursive Autonomous Intelligence. Daisy thinks. DFRL verifies. MMTAI executes. Humans retain authority.",
  },
  {
    id: "dfrl-z3-verifier",
    name: "DFRL Z3 Verifier",
    kind: "VERIFIER",
    evidence: "VERIFIED",
    owner: "Solvex Proof Plane",
    model: "Z3 v4.12.2 WebAssembly",
    capability: "SMT check 88 operators, replay, registry write",
    authority: "Write proof registry. Cannot authorize execution.",
    authorization: "Invoked by Daisy after formalization.",
    reversible: true,
    signedCell:
      "UAF1|cell=DFRL-Z3|kind=VERIFIER|ev=VERIFIED|unsat=88|sat=0|err=0|to=0|sig=c15ca689681e6c2c",
    nodes: 1,
    lastProof: "PB-DFRL-88",
    summary:
      "Recorded run: 88 UNSAT, 0 SAT, 0 errors, 0 timeouts, ~1.28s. Not a claim that every Solvex component is universally correct.",
  },
  {
    id: "mmtai-worker-07",
    name: "MMTAI Worker 07",
    kind: "WORKER",
    evidence: "VERIFIED",
    owner: "TENANT_ENTERPRISE_DEMO",
    model: "Execution track B only",
    capability: "Authorized state changes, checkpoints, rollback",
    authority: "Seat-bound. No identity or finance.",
    authorization: "JIT from entitlement + policy.",
    reversible: true,
    signedCell:
      "UAF1|cell=MM-W-07|kind=WORKER|ev=VERIFIED|track=B|rev=1|tenant=DEMO|sig=da915724d1e6f0d5",
    nodes: 7,
    lastProof: "PB-MMTAI-SEAT-12",
    summary:
      "Does not reason. Does not invent permission. Executes the specific operation against the target state with a recovery plan.",
  },
  {
    id: "npot-registrar",
    name: "NOPOT Registrar",
    kind: "REGISTRAR",
    evidence: "VERIFIED",
    owner: "Identity plane",
    model: "Validity record, not PII store",
    capability: "Register, attest, burn",
    authority: "Identity validity only",
    authorization: "Human guardian for destructive ops",
    reversible: true,
    signedCell:
      "UAF1|cell=NP-REG|kind=REGISTRAR|ev=VERIFIED|pii=MIN|burn=1|sig=8a41c0e2f19b77d3",
    nodes: 3,
    lastProof: "PB-NOPOT-REG-04",
    summary:
      "Separates identity validity from identity data. Burn removes designated PII while preserving permitted non-identifying evidence.",
  },
  {
    id: "compliance-sentinel",
    name: "Compliance Sentinel",
    kind: "SENTINEL",
    evidence: "VERIFIED",
    owner: "TENANT_ENTERPRISE_DEMO",
    model: "Control monitor + evidence requester",
    capability: "Detect gaps, open tasks, notify",
    authority: "Read compliance state. Write tasks.",
    authorization: "External comms require human authorize",
    reversible: true,
    signedCell:
      "UAF1|cell=CMP-SEN|kind=SENTINEL|ev=VERIFIED|outreach=AUTH|sig=21b4e90aa018c6fe",
    nodes: 4,
    lastProof: "PB-CMP-IMM-09",
    summary:
      "Watches missing evidence, failed controls, expired documents. Does not impersonate the organization without authorization.",
  },
  {
    id: "marketplace-gate",
    name: "Marketplace Gate",
    kind: "GATEWAY",
    evidence: "VERIFIED",
    owner: "uarefake.com",
    model: "Fail-closed publication filter",
    capability: "Admit VERIFIED offers only",
    authority: "Catalog mutation",
    authorization: "Solution + proof bundle both VERIFIED",
    reversible: true,
    signedCell:
      "UAF1|cell=MKT-GATE|kind=GATEWAY|ev=VERIFIED|rule=NO_UNVERIFIED|sig=4e77c1ab902d55aa",
    nodes: 2,
    lastProof: "PB-PCC-15",
    summary:
      "Unverified products cannot enter the verified marketplace state. Publication blocked is a success of the architecture.",
  },
  {
    id: "paypal-adapter",
    name: "PayPal DN-35 Adapter",
    kind: "GATEWAY",
    evidence: "PARTIAL",
    owner: "External provider boundary",
    model: "LOCAL_VERIFIED_PAYPAL_EXTERNAL",
    capability: "Capture when credentials exist",
    authority: "None when provider disconnected",
    authorization: "Fail closed. Never simulate success.",
    reversible: true,
    signedCell:
      "UAF1|cell=PP-DN35|kind=GATEWAY|ev=PARTIAL|ext=REQUIRED|sim=FORBIDDEN|sig=b09f33ce1188d2aa",
    nodes: 1,
    lastProof: "PB-PAYPAL-LOCAL",
    summary:
      "Code exists ≠ provider connected. Local test passes ≠ live payment verified. This listing is honest about that.",
  },
  {
    id: "ghost-script",
    name: "Ghost Script Tracker",
    kind: "SENTINEL",
    evidence: "CLAIM",
    owner: "Forensic concept",
    model: "Tracking concept, not production claim",
    capability: "Trace activity across execution boundaries",
    authority: "None established",
    authorization: "Not granted",
    reversible: false,
    signedCell:
      "UAF1|cell=GS-TRK|kind=SENTINEL|ev=CLAIM|prod=NO|sig=00000000deadbeef",
    nodes: 0,
    lastProof: "NONE",
    summary:
      "Architectural concept. Tracking is not authority and not proof. Security guarantees require implementation and test.",
  },
  {
    id: "civic-choice",
    name: "Civic Choice Clerk",
    kind: "WORKER",
    evidence: "INTENDED",
    owner: "Human decision-maker",
    model: "Notify and record. Never decide.",
    capability: "Eligibility notice, verified record",
    authority: "None over the choice",
    authorization: "Human remains the decision-maker",
    reversible: true,
    signedCell:
      "UAF1|cell=CIV-CLK|kind=WORKER|ev=INTENDED|decide=HUMAN|sig=1111aaaabbbbcccc",
    nodes: 0,
    lastProof: "NONE",
    summary:
      "Daisy may inform, remind, and record. The individual decides. Machine decision-making is out of scope for this clerk.",
  },
];

export function agentById(id: string) {
  return agents.find((a) => a.id === id);
}

export const kindLabel: Record<AgentKind, string> = {
  PARAI: "PARAI intelligence",
  WORKER: "Autonomous worker",
  VERIFIER: "Formal verifier",
  REGISTRAR: "Identity registrar",
  SENTINEL: "Sentinel",
  GATEWAY: "External gateway",
};
