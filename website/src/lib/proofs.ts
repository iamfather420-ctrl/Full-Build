export type ProofStatus =
  | "VERIFIED"
  | "PARTIAL"
  | "CLAIM_ONLY"
  | "FAMILY_VARIANT"
  | "FAIL"
  | "HOLD";

export type ProofRow = {
  code: string;
  name: string;
  domain: string;
  status: ProofStatus;
  result: "UNSAT" | "SAT" | "HOLD" | "N/A";
  bundle: string;
};

export const proofs: ProofRow[] = [
  { code: "DFRL-P-001", name: "Zeno · Achilles & the Tortoise", domain: "REAL_ANALYSIS", status: "VERIFIED", result: "UNSAT", bundle: "PB-DFRL-001" },
  { code: "DFRL-P-002", name: "Russell's Antinomy", domain: "SET_THEORY", status: "VERIFIED", result: "UNSAT", bundle: "PB-DFRL-002" },
  { code: "DFRL-P-003", name: "Barber Paradox", domain: "FIRST_ORDER_LOGIC", status: "VERIFIED", result: "UNSAT", bundle: "PB-DFRL-003" },
  { code: "DFRL-P-004", name: "Tarskian Liar", domain: "SEMANTIC_LOGIC", status: "VERIFIED", result: "UNSAT", bundle: "PB-DFRL-004" },
  { code: "DFRL-P-005", name: "Curry's Paradox", domain: "PROOF_THEORY", status: "VERIFIED", result: "UNSAT", bundle: "PB-DFRL-005" },
  { code: "DFRL-P-006", name: "Unexpected Hanging", domain: "EPISTEMIC", status: "FAMILY_VARIANT", result: "UNSAT", bundle: "PB-DFRL-006" },
  { code: "DFRL-P-007", name: "Ship of Theseus", domain: "IDENTITY", status: "VERIFIED", result: "UNSAT", bundle: "PB-DFRL-007" },
  { code: "DFRL-P-008", name: "Sorites Heap", domain: "VAGUENESS", status: "VERIFIED", result: "UNSAT", bundle: "PB-DFRL-008" },
  { code: "DFRL-P-009", name: "Newcomb Predictor", domain: "DECISION", status: "PARTIAL", result: "HOLD", bundle: "PB-DFRL-009" },
  { code: "DH-B-014", name: "Capability ≠ Authority", domain: "GOVERNANCE", status: "VERIFIED", result: "UNSAT", bundle: "PB-DH-B-014" },
  { code: "DH-B-018", name: "Authorization ≠ Execution", domain: "GOVERNANCE", status: "VERIFIED", result: "UNSAT", bundle: "PB-DH-B-018" },
  { code: "DH-B-022", name: "Reversibility Obligation", domain: "EXECUTION", status: "VERIFIED", result: "UNSAT", bundle: "PB-DH-B-022" },
];

export const paraiStages = [
  { id: "INPUT", label: "Input", hint: "Ingest. Not yet evidence." },
  { id: "CONTEXT", label: "Context", hint: "Tenant, role, state, constraints." },
  { id: "REASON", label: "Reason", hint: "Probabilistic. Hypothesis only." },
  { id: "FORMALIZE", label: "Formalize", hint: "Turn belief into an obligation." },
  { id: "VERIFY", label: "Verify", hint: "Machine-check or fail closed." },
  { id: "GOVERN", label: "Govern", hint: "Policy, capability, authority." },
  { id: "AUTHORIZE", label: "Authorize", hint: "This circumstance. This op." },
  { id: "EXECUTE", label: "Execute", hint: "Deterministic state change." },
  { id: "OBSERVE", label: "Observe", hint: "Telemetry. Crystal Clear Box." },
  { id: "PROVE", label: "Prove", hint: "Receipt, audit, proof bundle." },
  { id: "RECOVER", label: "Recover", hint: "Reverse, compensate, restore." },
  { id: "LEARN", label: "Learn", hint: "Verified experience only." },
] as const;

export type ParaiId = (typeof paraiStages)[number]["id"];

export const nodes = [
  { id: "N-01", name: "Cognitive ingest", plane: "Cognitive", health: "live" as const, load: 0.22 },
  { id: "N-07", name: "Context binder", plane: "Cognitive", health: "live" as const, load: 0.18 },
  { id: "N-12", name: "Hypothesis mill", plane: "Cognitive", health: "live" as const, load: 0.41 },
  { id: "N-19", name: "DFRL formalizer", plane: "Proof", health: "live" as const, load: 0.33 },
  { id: "N-24", name: "Z3 WASM kernel", plane: "Proof", health: "live" as const, load: 0.12 },
  { id: "N-31", name: "Proof registry", plane: "Proof", health: "live" as const, load: 0.09 },
  { id: "N-36", name: "Governance gate", plane: "Control", health: "live" as const, load: 0.27 },
  { id: "N-41", name: "JIT authorizer", plane: "Control", health: "live" as const, load: 0.15 },
  { id: "N-46", name: "MMTAI track B", plane: "Execution", health: "live" as const, load: 0.38 },
  { id: "N-49", name: "Checkpoint store", plane: "Execution", health: "live" as const, load: 0.21 },
  { id: "N-52", name: "Rollback engine", plane: "Execution", health: "live" as const, load: 0.06 },
  { id: "N-54", name: "Crystal ledger", plane: "Observability", health: "live" as const, load: 0.29 },
];

export const manifest = {
  version: "1.0.0-PROD",
  claimScope: "LOCAL_VERIFIED / MODEL_VERIFIED",
  daisyNodes: { total: 54, executed: 54 },
  dfrl: { total: 88, unsat: 88, sat: 0, errors: 0, timeouts: 0, seconds: 1.28 },
  bootstrap: { verified: 20, family: 5, claim: 4, partial: 3 },
  invariants: { total: 30, passed: 30 },
  persistence: { tables: 27, tenantIsolation: true, rollback: true },
  gateways: {
    neon: "EXTERNAL_PROVIDER_REQUIRED",
    paypal: "CONFIGURATION_REQUIRED",
    stripe: "PROHIBITED_BLOCKED",
  },
  merkle:
    "066bf028b7c8644f38616895c1be892e16408f1077fb47a12343186850978e8a",
};
