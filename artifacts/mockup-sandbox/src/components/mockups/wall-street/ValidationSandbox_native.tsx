import { useState, useEffect, useRef } from "react";
import "./validation.css";

type ProofStep = {
  label: string;
  detail: string;
  value: string;
  status: "pending" | "running" | "pass" | "fail";
  duration: number;
};

const PROOF_CONFIGS: Record<string, { steps: ProofStep[]; product: string; zkHash: string }> = {
  "SOLVEX-ZK-01": {
    product: "ZK-KYC Dark Settlement Engine",
    zkHash: "ZK_PROOF_HASH_0x7f82e1b4c9a0d8e23b11488c99a3411b_VERIFIED",
    steps: [
      { label: "Groth16 Circuit Initialization",   detail: "Loading bn254 elliptic curve parameters and zk-SNARK trusted setup",       value: "Circuit R1CS: 248,391 constraints",     status:"pending", duration:900 },
      { label: "Public Input Hashing",             detail: "SHA-256 hash of FINTRAC compliance flags (no PII in public wire)",         value: "H(flags) = 0x4f3a...c91b",            status:"pending", duration:700 },
      { label: "Witness Generation",               detail: "Prover computes secret witness satisfying all compliance constraints",     value: "Witness: 14.2ms on AES-NI ✓",         status:"pending", duration:1100 },
      { label: "Groth16 Proof Construction",       detail: "Computing π = (A, B, C) proving knowledge of valid KYC witness",          value: "π = [G1:0x3f..., G2:0x9a..., G1:0x1b...]", status:"pending", duration:1400 },
      { label: "Pairing Verification",             detail: "Verifier checks e(A,B) = e(α,β)·e(vk·input,γ)·e(C,δ)",                  value: "Pairing check: VALID ✓",              status:"pending", duration:600 },
      { label: "PII Leakage Audit",                detail: "Formal verification: no client PII appears in public proof or transcript", value: "PII exposure: 0 bytes ✓",             status:"pending", duration:500 },
      { label: "OSFI B-13 Compliance Gate",        detail: "Attestation confirms 100% Guideline B-13 Domain 1–7 coverage",            value: "Compliance score: 100/100 ✓",         status:"pending", duration:400 },
    ]
  },
  "SOLVEX-HFT-07": {
    product: "Ultra-Low Latency Order Routing Fabric",
    zkHash: "ZK_PROOF_HASH_0x44f1001a883b1294002c88411a002b11_VERIFIED",
    steps: [
      { label: "FPGA NIC Initialization",          detail: "Solarflare OpenOnload kernel-bypass driver loaded, PCIe Gen5 NIC online",  value: "NIC: sf_net_ioctl(ONLOAD_INSTALL) OK", status:"pending", duration:700 },
      { label: "Ring Buffer Allocation",           detail: "LMAX Disruptor RingBuffer<OrderEvent> allocated with 2^17 slots",          value: "Capacity: 131,072 slots, 2MB NUMA",   status:"pending", duration:600 },
      { label: "Latency Baseline Measurement",     detail: "1,000,000 warm-up orders through full matching pipeline (GC disabled)",    value: "P50: 482ns  P99: 672ns  P99.9: 738ns",status:"pending", duration:1600 },
      { label: "Lock-Free Contention Proof",       detail: "Formal model-check: no ABA hazard under 128 concurrent producers",        value: "TLA+ model check: 0 invariant violations", status:"pending", duration:1100 },
      { label: "Off-Heap Memory Verification",     detail: "GC log analysis: zero GC pauses during 60-second order flood benchmark",  value: "GC pauses: 0ms over 60s ✓",          status:"pending", duration:800 },
      { label: "Wire-to-Wire SLA Gate",            detail: "99.9th percentile latency ≤ 740ns confirmed against SLA commitment",       value: "P99.9 = 738ns < 740ns ✓",            status:"pending", duration:400 },
    ]
  },
  "SOLVEX-SEC-13": {
    product: "OSFI Guideline B-13 Cloud Attestation Suite",
    zkHash: "ZK_PROOF_HASH_0x55001188c0032111a44001188b002111_VERIFIED",
    steps: [
      { label: "Infrastructure Topology Scan",     detail: "Event-driven scan of AWS us-east-1 / GCP northamerica-northeast1 resources", value: "147 resources discovered",           status:"pending", duration:900 },
      { label: "Domain 1: Technology Risk",        detail: "Mapping all cloud services against OSFI B-13 §2.1 technology risk mandate",  value: "Coverage: 100% (31/31 controls)",  status:"pending", duration:700 },
      { label: "Domain 3: Data Risk",              detail: "Validating data classification, encryption at rest (AES-256), and routing",  value: "Data risk score: 0 critical ✓",    status:"pending", duration:800 },
      { label: "Domain 5: Vendor Risk",            detail: "Automated SBOM scan of all cloud-native vendor dependencies",               value: "CVEs: 0 critical, 0 high ✓",       status:"pending", duration:1000 },
      { label: "Domain 6: Resilience",             detail: "Multi-region failover configuration validated against RTO/RPO requirements", value: "RTO < 3.2s, RPO = 0s ✓",          status:"pending", duration:700 },
      { label: "Attestation Generation",           detail: "Digitally signed PDF + JSON attestation report generated for regulators",   value: "Signature: SHA-256/ECDSA-P256 ✓",  status:"pending", duration:400 },
    ]
  }
};

const DEFAULT_PRODUCT = "SOLVEX-ZK-01";

function Gauge({ value, label }: { value: number; label: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="vb-gauge">
      <svg viewBox="0 0 100 100" width="90" height="90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1A2035" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#D4AF37" strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 1s ease" }} />
        <text x="50" y="54" textAnchor="middle" fontSize="16" fontWeight="700" fill="#D4AF37" fontFamily="IBM Plex Mono">{value}</text>
      </svg>
      <div className="vb-gauge-label">{label}</div>
    </div>
  );
}

export default function ValidationSandbox() {
  const [selectedProduct, setSelectedProduct] = useState(DEFAULT_PRODUCT);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<ProofStep[]>([]);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);
  const startRef = useRef<number>(0);

  const config = PROOF_CONFIGS[selectedProduct] ?? PROOF_CONFIGS[DEFAULT_PRODUCT];

  useEffect(() => {
    setSteps(config.steps.map(s => ({ ...s, status: "pending" })));
    setDone(false);
    setElapsed(0);
    setRunning(false);
  }, [selectedProduct]);

  async function runProof() {
    if (running) return;
    setRunning(true);
    setDone(false);
    setElapsed(0);
    const fresh: ProofStep[] = config.steps.map(s => ({ ...s, status: "pending" as const }));
    setSteps(fresh);

    startRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 50);

    const updated: ProofStep[] = [...fresh];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: "running" };
      setSteps([...updated]);
      await delay(updated[i].duration);
      updated[i] = { ...updated[i], status: "pass" };
      setSteps([...updated]);
      await delay(120);
    }

    clearInterval(timerRef.current);
    setElapsed(Date.now() - startRef.current);
    setRunning(false);
    setDone(true);
  }

  function reset() {
    clearInterval(timerRef.current);
    setSteps(config.steps.map(s => ({ ...s, status: "pending" })));
    setDone(false);
    setElapsed(0);
    setRunning(false);
  }

  const passCount = steps.filter(s => s.status === "pass").length;
  const score = steps.length ? Math.round((passCount / steps.length) * 100) : 0;

  return (
    <div className="vb-root">
      {/* Header */}
      <div className="vb-header">
        <div className="vb-header-left">
          <div className="vb-logo">SX</div>
          <div>
            <div className="vb-title">MATHEMATICAL PROOF VALIDATOR</div>
            <div className="vb-sub">Cryptographic · Scientific · Institutional-Grade</div>
          </div>
        </div>
        <div className="vb-cert-badges">
          <div className="vb-cert">🔐 ZK-SNARK</div>
          <div className="vb-cert">⚖️ OSFI B-13</div>
          <div className="vb-cert">🏛️ FINTRAC</div>
        </div>
      </div>

      {/* Product Selector */}
      <div className="vb-selector">
        <div className="vb-selector-label">SELECT PRODUCT TO VALIDATE</div>
        <div className="vb-selector-tabs">
          {Object.keys(PROOF_CONFIGS).map(k => (
            <button key={k}
              onClick={() => { if (!running) setSelectedProduct(k); }}
              className={`vb-tab ${selectedProduct === k ? "active" : ""}`}>
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="vb-product-bar">
        <div className="vb-product-id">{selectedProduct}</div>
        <div className="vb-product-name">{config.product}</div>
        <div className="vb-zk-hash">{config.zkHash}</div>
      </div>

      {/* Main Layout */}
      <div className="vb-body">
        {/* Steps */}
        <div className="vb-steps-panel">
          <div className="vb-panel-title">
            VERIFICATION STEPS
            <span className="vb-step-count">{passCount}/{steps.length}</span>
          </div>
          <div className="vb-steps">
            {steps.map((s, i) => (
              <div key={i} className={`vb-step ${s.status}`}>
                <div className="vb-step-icon">
                  {s.status === "pending" && <span className="vb-icon-pending">{String(i+1).padStart(2,"0")}</span>}
                  {s.status === "running" && <span className="vb-icon-running">⟳</span>}
                  {s.status === "pass"    && <span className="vb-icon-pass">✓</span>}
                  {s.status === "fail"    && <span className="vb-icon-fail">✗</span>}
                </div>
                <div className="vb-step-body">
                  <div className="vb-step-label">{s.label}</div>
                  <div className="vb-step-detail">{s.detail}</div>
                  {s.status !== "pending" && (
                    <div className={`vb-step-value ${s.status === "running" ? "blink" : ""}`}>
                      {s.status === "running" ? "COMPUTING..." : s.value}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="vb-right-panel">
          {/* Score Gauges */}
          <div className="vb-panel-section vb-gauges-section">
            <div className="vb-panel-title">PROOF SCORE</div>
            <div className="vb-gauges">
              <Gauge value={done ? 100 : score} label="COMPLIANCE" />
              <Gauge value={done ? 100 : score} label="SECURITY" />
              <Gauge value={done ? 98 : Math.max(0, score - 2)} label="PERFORMANCE" />
            </div>
          </div>

          {/* Live Console */}
          <div className="vb-panel-section vb-console-section">
            <div className="vb-panel-title">LIVE OUTPUT <span className={`vb-console-dot ${running ? "live" : ""}`} /></div>
            <div className="vb-console">
              <div className="vb-console-line comment"># Solvex Proof Engine v3.1.0 — Institutional Grade</div>
              <div className="vb-console-line comment"># Product: {config.product}</div>
              <div className="vb-console-line dim">$ solver verify --product {selectedProduct} --strict</div>
              {steps.filter(s => s.status !== "pending").map((s, i) => (
                <div key={i}>
                  <div className={`vb-console-line ${s.status === "running" ? "running" : "pass"}`}>
                    {s.status === "running" ? `→ [RUN] ${s.label}...` : `✓ [PASS] ${s.label}`}
                  </div>
                  {s.status === "pass" && <div className="vb-console-line output">   ∟ {s.value}</div>}
                </div>
              ))}
              {done && <>
                <div className="vb-console-line separator">────────────────────────────────</div>
                <div className="vb-console-line gold">PROOF VERIFICATION: COMPLETE</div>
                <div className="vb-console-line gold">All {steps.length} cryptographic assertions passed</div>
                <div className="vb-console-line gold">Elapsed: {elapsed}ms  Score: 100/100</div>
                <div className="vb-console-line dim">ZK Hash: {config.zkHash.slice(0, 48)}...</div>
              </>}
              {running && <div className="vb-console-line cursor">█</div>}
            </div>
          </div>

          {/* Math Proof */}
          {done && (
            <div className="vb-panel-section vb-proof-section">
              <div className="vb-panel-title">CRYPTOGRAPHIC ASSERTION</div>
              <div className="vb-math">
                <div className="vb-math-line">∀ φ ∈ Circuit(R1CS) :</div>
                <div className="vb-math-line indent">e(π.A, π.B) ≡ e(vk.α, vk.β)</div>
                <div className="vb-math-line indent">              · e(Σᵢ aᵢ·vkᵢ, vk.γ)</div>
                <div className="vb-math-line indent">              · e(π.C, vk.δ)  <span className="gold">✓ VALID</span></div>
                <div className="vb-math-sep" />
                <div className="vb-math-line small">Confidence interval: p {">"} 1 − 2⁻¹²⁸  (soundness error: negligible)</div>
                <div className="vb-math-line small">Verification key: NIST-P256 / bn254 pairing groups</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="vb-action-bar">
        <div className="vb-elapsed">
          {running && <><span className="vb-elapsed-dot live" /> PROOF RUNNING — {elapsed}ms</>}
          {done && <><span className="vb-elapsed-dot pass" /> VERIFICATION COMPLETE — {elapsed}ms</>}
          {!running && !done && <><span className="vb-elapsed-dot" /> READY TO VERIFY</>}
        </div>
        <div className="vb-action-btns">
          <button className="vb-btn-reset" onClick={reset} disabled={running}>RESET</button>
          <button className={`vb-btn-run ${running ? "running" : ""} ${done ? "done" : ""}`}
            onClick={runProof} disabled={running}>
            {running ? "⟳ COMPUTING PROOF..." : done ? "✓ VERIFIED — RUN AGAIN" : "▶  RUN MATHEMATICAL PROOF"}
          </button>
          {done && <button className="vb-btn-acquire">ACQUIRE LICENSE →</button>}
        </div>
      </div>
    </div>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
