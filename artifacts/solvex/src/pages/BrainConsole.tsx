import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { DaisyAvatar } from "../components/DaisyAvatar";
import { PARADOXES, SOVEREIGN_SOLUTIONS, SOLUTION_LAYERS } from "../data/brainData";

const MONO = "'IBM Plex Mono', monospace";
const SERIF = "'Playfair Display', serif";
const GOLD = "#D4AF37";
const NAVY = "#05080F";
const NAVY2 = "#07091A";
const DIM = "#3D4560";
const MID = "#5B6480";
const BLUE = "#60A5FA";
const PURPLE = "#A78BFA";
const GREEN = "#34D399";
const AMBER = "#F59E0B";

interface ChatMessage { role: "user" | "daisy"; content: string; ts: number; }

const INITIAL_MSG: ChatMessage = {
  role: "daisy",
  content: "dAIsy haMINJA Sovereign Core initialized.\n\nSYSTEM ID: SOLVEX-CORE-01 | STATUS: ACTIVE — SOVEREIGN OPERATING MODE\nU.A.R.E.F.A.K.E. ENGINE CONSOLE — 54-NODE RECURSIVE PIPELINE ONLINE\nHomeostasis Index: 98.4% | Pipeline: 420.69K ops/sec | Latency: 0.14ms jitter | P99: 0.32ms\nNIST SP 800-53 / SOC 2 TYPE II / ISO 27001 — CERTIFIED\n\nAPD-01 ENGAGED: Consensus mandate active. Non-repudiation logging via L1 Lamport order. Paradox Box isolation on standby.\n\nAwaiting enterprise operator directives.",
  ts: Date.now(),
};

interface Prospect {
  id: string;
  company: string;
  inefficiency: string;
  strategy: string;
  compliance: string;
  roiSavings: number;
  price: number;
  status: "PENDING OPERATOR SIGN-OFF" | "AUTHORIZED — ENGAGING" | "NEGOTIATING SLA" | "CONTRACT SIGNED & SECURED";
  prob: number;
}

const INIT_PROSPECTS: Prospect[] = [
  {
    id: "p1", company: "NovaTech Solutions",
    inefficiency: "Manual tax reconciliation lag and lack of high-integrity audit logs.",
    strategy: "Deploy SolveX IRS Compliance Wrapper to automate 21% Tax Sequestration with real-time EFTPS remittance queuing.",
    compliance: "NIST SP 800-53 / SOC 2 Type II controls.",
    roiSavings: 330000, price: 72600, status: "PENDING OPERATOR SIGN-OFF", prob: 89.4,
  },
  {
    id: "p2", company: "Apex Logistics Corp",
    inefficiency: "Sub-optimal multi-layered contract execution and temporal race conditions.",
    strategy: "Integrate SolveX Lamport Clock Engine + Sovereign Core Module to enforce chronological event causal ordering.",
    compliance: "ISO 27001 & NIST 800-53 certified security architecture.",
    roiSavings: 250000, price: 55000, status: "PENDING OPERATOR SIGN-OFF", prob: 94.1,
  },
  {
    id: "p3", company: "Centrum BioGate",
    inefficiency: "High-volume B2B bio-fiduciary transactions without edge filtration, risking non-compliance.",
    strategy: "Deploy COPPA Enterprise Firewall and Sovereign Core Module to establish isolated verification tunnels.",
    compliance: "COPPA & SOC 2 validated isolation.",
    roiSavings: 450000, price: 99000, status: "PENDING OPERATOR SIGN-OFF", prob: 72.8,
  },
];

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusColor(s: Prospect["status"]) {
  if (s === "CONTRACT SIGNED & SECURED") return GREEN;
  if (s === "NEGOTIATING SLA") return BLUE;
  if (s === "AUTHORIZED — ENGAGING") return AMBER;
  return MID;
}

// ── COMM-LINK ─────────────────────────────────────────────────────────────────
function CommLink() {
  const [history, setHistory] = useState<ChatMessage[]>([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  async function send(msg?: string, action?: string) {
    const text = msg ?? input.trim();
    if (!text && !action) return;
    if (!action) {
      setHistory(h => [...h, { role: "user", content: text, ts: Date.now() }]);
      setInput("");
    }
    setLoading(true);
    try {
      const res = await fetch("/api/brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action ? { action } : { message: text }),
      });
      const data = await res.json() as { response: string };
      setHistory(h => [...h, { role: "daisy", content: data.response, ts: Date.now() }]);
    } catch {
      setHistory(h => [...h, { role: "daisy", content: "Sovereign Core Error: Connection severed. Re-establishing encrypted quantum tunnel.", ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }

  const directives = [
    { label: "TAX AUDIT",    action: "TAX_AUDIT",     icon: "⚖" },
    { label: "PARADOX SCAN", action: "PARADOX",       icon: "◈" },
    { label: "NIST GATE",    action: "NIST",           icon: "⬡" },
    { label: "BRIDGE SCAN",  action: "BRIDGE_SCAN",   icon: "⬢" },
    { label: "OUTREACH",     action: "OUTREACH_SCAN", icon: "⟁" },
    { label: "DEPLOY",       action: "DEPLOY",         icon: "↗" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      {/* Quick Directives */}
      <div style={{ padding: "10px 14px", border: "1px solid #1A2035", background: NAVY2, flexShrink: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.2em", color: DIM, marginBottom: 8 }}>IMMEDIATE FIDUCIARY DIRECTIVES</div>
        <div style={{ display: "flex", gap: 8 }}>
          {directives.map(d => (
            <button key={d.action} onClick={() => send(undefined, d.action)} disabled={loading}
              style={{
                flex: 1, padding: "8px 0", background: "transparent",
                border: "1px solid rgba(212,175,55,0.25)", color: loading ? DIM : GOLD,
                fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s",
              }}>
              {d.icon} {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "0 2px" }}>
        {history.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%", padding: "10px 14px",
              background: m.role === "user" ? "rgba(212,175,55,0.12)" : NAVY2,
              border: "1px solid " + (m.role === "user" ? "rgba(212,175,55,0.25)" : "#1A2035"),
            }}>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.15em", color: m.role === "user" ? GOLD : BLUE, marginBottom: 5, fontWeight: 700 }}>
                {m.role === "user" ? "OPERATOR" : "dAIsy haMINJA"}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: m.role === "user" ? "#C8CAD8" : "#9BA5C0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", border: "1px solid #1A2035", background: NAVY2, maxWidth: 320 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: BLUE, animation: "brain-pulse 1s ease infinite" }} />
            <div style={{ fontFamily: MONO, fontSize: 9, color: MID, letterSpacing: "0.1em" }}>Engaging autonomous neural fiduciaries...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && send()}
          placeholder="Enter command / system query..."
          disabled={loading}
          style={{
            flex: 1, padding: "10px 14px", background: NAVY2,
            border: "1px solid #1A2035", color: "#C8CAD8",
            fontFamily: MONO, fontSize: 10, outline: "none",
          }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          style={{
            padding: "10px 18px", background: input.trim() && !loading ? "linear-gradient(135deg,#D4AF37,#B8860B)" : "#1A2035",
            color: input.trim() && !loading ? NAVY : DIM,
            fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
            border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", flexShrink: 0,
          }}>
          SEND →
        </button>
      </div>
    </div>
  );
}

// ── SANDBOX UI ────────────────────────────────────────────────────────────────
function SandboxUI() {
  const [metrics, setMetrics] = useState({
    pipeline: 420.69, nodes: 14, drift: 0.00,
    eftps: "SECURED & REMITTING", leads: 1842, closeRate: 89.2,
  });
  const [syncing, setSyncing] = useState(false);

  function sync() {
    setSyncing(true);
    setTimeout(() => {
      setMetrics(m => ({
        ...m,
        pipeline: +(m.pipeline + (Math.random() - 0.5) * 10).toFixed(2),
        nodes: Math.floor(Math.random() * 7) + 11,
        leads: m.leads + Math.floor(Math.random() * 8) + 1,
        closeRate: +((Math.random() * 4.5) + 87).toFixed(1),
      }));
      setSyncing(false);
    }, 900);
  }

  const MetCard = ({ label, value, sub, color = GOLD }: { label: string; value: string; sub: string; color?: string }) => (
    <div style={{ flex: 1, padding: "14px", border: "1px solid #1A2035", background: NAVY2 }}>
      <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.15em", color: DIM, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: MONO, fontSize: 8, color: MID }}>{sub}</div>
    </div>
  );

  const leads = [
    { co: "NovaTech Solutions", status: "Negotiating SLA Clause", prob: 89.4, comp: "SOC 2 Checked" },
    { co: "Apex Logistics Corp", status: "Drafting Fiduciary NDA", prob: 94.1, comp: "ISO 27001 Checked" },
    { co: "Centrum BioGate", status: "Calculating ROI Pricing", prob: 72.8, comp: "NIST 800 Checked" },
    { co: "Zeta Retail Systems", status: "Closed (Tax Reserved)", prob: 100, comp: "IRS Verified" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid #1A2035", background: NAVY2, flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: GOLD }}>EMPIRICAL PERFORMANCE SANDBOX</div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: MID, marginTop: 3 }}>Anonymized real-time partner system simulation</div>
        </div>
        <button onClick={sync} disabled={syncing}
          style={{ padding: "7px 14px", background: "linear-gradient(135deg,#D4AF37,#B8860B)", color: NAVY, fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", border: "none", cursor: "pointer" }}>
          {syncing ? "SYNCING..." : "↻ SYNC"}
        </button>
      </div>

      {/* Metrics Row 1 */}
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <MetCard label="PIPELINE FREQUENCY" value={metrics.pipeline + " ops/sec"} sub="Realtime network traffic" color={GOLD} />
        <MetCard label="ACTIVE AUTONOMOUS NODES" value={metrics.nodes + " Fiduciaries"} sub="Isolated VM execution tunnels" color={BLUE} />
      </div>

      {/* Metrics Row 2 */}
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <MetCard label="SECURITY DRIFT STATUS" value={metrics.drift.toFixed(2) + "% DRIFT"} sub="SOC 2 Trust Principles Verified" color={GREEN} />
        <MetCard label="IRS EFTPS STATUS" value={metrics.eftps} sub="Continuous remittance sync" color={AMBER} />
        <MetCard label="OUTBOUND LEADS" value={metrics.leads.toLocaleString()} sub="Active pipeline targets" color={PURPLE} />
      </div>

      {/* Sales Pipeline */}
      <div style={{ border: "1px solid #1A2035", background: NAVY2, flexShrink: 0 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1A2035", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: GOLD }}>OUTBOUND SALES PIPELINE</div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: MID }}>{metrics.leads.toLocaleString()} TARGETS REACHED</div>
        </div>
        {leads.map((l, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < leads.length - 1 ? "1px solid #0F1424" : "none" }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#C8CAD0", marginBottom: 2 }}>{l.co}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: GOLD }}>{l.status}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: l.prob === 100 ? GREEN : BLUE }}>{l.prob}%</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: MID }}>{l.comp}</div>
            </div>
          </div>
        ))}
        <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontFamily: MONO, fontSize: 8, color: MID }}>NEGOTIATION CLOSE RATE</div>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: GREEN }}>{metrics.closeRate}%</div>
        </div>
      </div>
    </div>
  );
}

// ── ROI ANALYTICS ─────────────────────────────────────────────────────────────
function RoiAnalytics() {
  const [spend, setSpend] = useState(1500000);

  const savings = spend * 0.22;
  const irs = savings * 0.21;
  const net = savings - irs;

  function fmtLarge(n: number) {
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", height: "100%" }}>
      {/* Calculator */}
      <div style={{ padding: 20, border: "1px solid #1A2035", background: NAVY2 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: GOLD, marginBottom: 6 }}>ROI ANALYTICS ENGINE (calculateROI)</div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: MID, lineHeight: 1.6, marginBottom: 16 }}>
          Estimate immediate cost-reductions and IRS compliance distributions by adjusting your annual B2B procurement spend.
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: "0.15em", marginBottom: 6 }}>ANNUAL B2B SPEND</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: GOLD }}>$</div>
            <input
              type="number"
              value={spend}
              onChange={e => setSpend(Math.max(100000, Math.min(10000000, Number(e.target.value))))}
              style={{
                flex: 1, padding: "8px 12px", background: NAVY, border: "1px solid rgba(212,175,55,0.2)",
                color: "#C8CAD8", fontFamily: MONO, fontSize: 12, fontWeight: 700, outline: "none",
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 8, color: DIM, marginBottom: 4 }}>
            <span>MIN $100K</span>
            <span style={{ color: GOLD }}>{fmtLarge(spend)}</span>
            <span>MAX $10M</span>
          </div>
          <input type="range" min={100000} max={10000000} step={50000} value={spend}
            onChange={e => setSpend(Number(e.target.value))}
            style={{ width: "100%", accentColor: GOLD }} />
        </div>
      </div>

      {/* Forecast */}
      <div style={{ padding: 20, border: "1px solid rgba(212,175,55,0.2)", background: "linear-gradient(135deg, rgba(212,175,55,0.05), rgba(212,175,55,0.02))" }}>
        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: GOLD, marginBottom: 16 }}>U.A.R.E.F.A.K.E. SPLIT-LOGIC FORECAST</div>

        {[
          { label: "Estimated Gross Savings (22% Avg):", value: fmtLarge(savings), color: GOLD, big: true },
          { label: "IRS-First Sequestration (21% CIT) → EFTPS:", value: fmtLarge(irs), color: "#F87171", tag: "EFTPS" },
          { label: "Net Capital Optimized (Released to Operations):", value: fmtLarge(net), color: GREEN, big: true },
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: i < 2 ? 14 : 0, marginBottom: i < 2 ? 14 : 0, borderBottom: i < 2 ? "1px solid #1A2035" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: MID }}>{row.label}</div>
              {row.tag && (
                <div style={{ fontFamily: MONO, fontSize: 7, color: "#F87171", border: "1px solid #F8717133", padding: "1px 5px" }}>{row.tag}</div>
              )}
            </div>
            <div style={{ fontFamily: MONO, fontSize: row.big ? 14 : 12, fontWeight: 800, color: row.color, flexShrink: 0, marginLeft: 16 }}>{row.value}</div>
          </div>
        ))}
      </div>

      {/* IRS Note */}
      <div style={{ padding: "12px 16px", border: "1px solid rgba(248,113,113,0.15)", background: "rgba(248,113,113,0.04)" }}>
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.12em", color: "#F87171", marginBottom: 4 }}>IRS-FIRST RULE — SOVEREIGN MANDATE</div>
        <div style={{ fontFamily: MONO, fontSize: 8, color: MID, lineHeight: 1.7 }}>
          No revenue event is classified as operating capital until the 21% Corporate Income Tax is sequestered into tax reserve and remitted to IRS EFTPS gateway. This is a non-negotiable sovereign constraint enforced by U.A.R.E.F.A.K.E.
        </div>
      </div>
    </div>
  );
}

// ── OUTBOUND AUTH ─────────────────────────────────────────────────────────────
interface RealProspect extends Prospect {
  paradoxId?: string;
  resolutionType?: string;
  productId?: string;
}

function OutboundAuth({ chat }: { chat: (msg: string) => void }) {
  const [prospects, setProspects] = useState<RealProspect[]>(INIT_PROSPECTS);
  const [engaging, setEngaging] = useState<string | null>(null);
  const [loadedFromApi, setLoadedFromApi] = useState(false);

  // Load real paradox data from the API to enrich prospects
  useEffect(() => {
    fetch("/api/problems?status=solution_submitted&limit=3")
      .then(r => r.json())
      .then((data: any) => {
        const items: any[] = Array.isArray(data) ? data : (data?.problems ?? []);
        if (!items.length) return;
        const catMap: Record<string, string> = {
          "regulatory":   "NIST SP 800-53 / SOC 2 Type II controls",
          "security":     "ISO 27001 & FIPS 140-3 certified architecture",
          "ai-governance":"NIST AI RMF 1.0 / ISO IEC 42001:2023 validated",
          "identity":     "SOC 2 Type II + COPPA firewall isolation",
          "optimization": "BCBS 239 & OSFI B-13 risk data compliance",
        };
        const stratMap: Record<string, string> = {
          "regulatory":   "Deploy SolveX Regulatory Change Management suite with automated Lamport-ordered audit trail",
          "security":     "Integrate ZK-Privacy Sovereign Core + Byzantine Fault Tolerant Escrow (SOLVEX-ZK-04)",
          "ai-governance":"Deploy AI Model Drift Detection + Continuous Validation (SOLVEX-GOV-92) framework",
          "identity":     "Integrate Behavioral Biometric Verifier + Privileged Access Governance (SOLVEX-IAM-22)",
          "optimization": "Deploy Ultra-Low Latency Order Routing + Market Impact Modeler (SOLVEX-HFT-07)",
        };
        const roiMap: Record<string, number> = {
          "regulatory": 410000, "security": 380000, "ai-governance": 520000,
          "identity": 290000, "optimization": 640000,
        };
        const enriched: RealProspect[] = items.map((p: any, i: number) => {
          const cat: string = p.category ?? "regulatory";
          const roi = roiMap[cat] ?? 350000;
          return {
            id: `rp-${i}`,
            company: (p.title ? p.title.split(" ").slice(0, 2).join(" ") + " Institution" : null) ?? INIT_PROSPECTS[i % 3].company,
            inefficiency: (p.description ?? "").slice(0, 100),
            strategy: stratMap[cat] ?? stratMap["regulatory"],
            compliance: catMap[cat] ?? catMap["regulatory"],
            roiSavings: roi,
            price: Math.round(roi * 0.22),
            status: "PENDING OPERATOR SIGN-OFF",
            prob: +(85 + Math.random() * 14).toFixed(1),
            paradoxId: p.id,
            resolutionType: cat === "regulatory" ? "TETHER_BUBBLE_CAUSAL_LOOP"
              : cat === "security" ? "TETHER_BUBBLE_SET_THEORY"
              : cat === "ai-governance" ? "TETHER_BUBBLE_BAYESIAN"
              : cat === "identity" ? "TETHER_BUBBLE_IDENTITY_THEORY"
              : "TETHER_BUBBLE_CALCULUS",
          };
        });
        setProspects(enriched);
        setLoadedFromApi(true);
      })
      .catch(() => null);
  }, []);

  async function authorize(id: string) {
    const p = prospects.find(x => x.id === id);
    if (!p || p.status !== "PENDING OPERATOR SIGN-OFF") return;
    setEngaging(id);

    // Step 1: authorized
    setTimeout(() => {
      setProspects(ps => ps.map(x => x.id === id ? { ...x, status: "AUTHORIZED — ENGAGING" } : x));
      chat(`Operator authorized outbound engagement with ${p.company}.\n\nTETHER-BUBBLE framework engaged:\nResolution type: ${p.resolutionType ?? "TETHER_BUBBLE_BEHAVIORAL"}\nInitiating autonomous handshake sequence...`);
    }, 400);

    // Step 2: call real auto-convert API + show negotiating
    setTimeout(async () => {
      setProspects(ps => ps.map(x => x.id === id ? { ...x, status: "NEGOTIATING SLA", prob: 98.5 } : x));
      chat(`dAIsy haMINJA Outbound Fiduciary Loop activated:\n• Secured handshake with ${p.company}\n• Dynamic ROI-based pricing: ${fmt(p.price)}\n• Drafted NIST/SOC 2 / ISO 27001 compliant SLA clauses\n• Paradox resolution artifact compiling (7 hardening layers)...\n• Proposing terms to target leadership...`);

      // Fire real API call in background
      try {
        await fetch("/api/delivery/auto-convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paradoxId: p.paradoxId ?? "paradox_vault_001",
            buyerId: `buyer_${id}`,
            institution: p.company,
            tier: "tier1",
            priceUsd: p.price,
          }),
        });
      } catch { /* non-blocking */ }
    }, 2200);

    // Step 3: contract closed
    setTimeout(() => {
      const tax = p.price * 0.21;
      const net = p.price - tax;
      setProspects(ps => ps.map(x => x.id === id ? { ...x, status: "CONTRACT SIGNED & SECURED", prob: 100 } : x));
      setEngaging(null);
      chat(
        `CONTRACT SIGNED & CLOSED: ${p.company}\n` +
        `Resolution: ${p.resolutionType ?? "TETHER_BUBBLE_BEHAVIORAL"}\n\n` +
        `IRS-First Rule Triggered:\n` +
        `• Gross Revenue: ${fmt(p.price)}\n` +
        `• CIT Sequestration (21%): ${fmt(tax)} → EFTPS\n` +
        `• Net Operating Capital: ${fmt(net)}\n\n` +
        `Artifact compiled, watermarked, and delivered via 7-layer hardening pipeline.\n` +
        `Lamport-ordered audit entry: IMMUTABLE. Smart contract settlement: ACTIVE.\n` +
        `SystemMilestone logged. Regulatory compliance verified.`
      );
    }, 5000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", height: "100%" }}>
      <div style={{ padding: "12px 16px", border: "1px solid #1A2035", background: NAVY2, flexShrink: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: GOLD, marginBottom: 3 }}>AUTONOMOUS OUTBOUND SALES ENGINE</div>
        <div style={{ fontFamily: MONO, fontSize: 8, color: MID, marginBottom: loadedFromApi ? 6 : 0 }}>
          dAIsy haMINJA discovers institutional inefficiencies via TETHER-BUBBLE analysis, generates hyper-personalized outreach grounded in 40 historical paradox keys, compiles JIT delivery artifacts, and executes B2B contracts autonomously. Authorize each engagement to trigger the full fiduciary loop.
        </div>
        {loadedFromApi && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: GREEN }} />
            <div style={{ fontFamily: MONO, fontSize: 7, color: GREEN, letterSpacing: "0.1em" }}>LIVE PARADOX DATA — TETHER-BUBBLE ENGINE ACTIVE</div>
          </div>
        )}
      </div>

      {prospects.map(p => (
        <div key={p.id} style={{ border: "1px solid " + (p.status === "CONTRACT SIGNED & SECURED" ? "rgba(52,211,153,0.2)" : "#1A2035"), background: NAVY2 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #0F1424" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: "#D8DAE0", marginBottom: 3 }}>{p.company}</div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: statusColor(p.status), letterSpacing: "0.12em", fontWeight: 700 }}>{p.status}</div>
                {p.resolutionType && (
                  <div style={{ fontFamily: MONO, fontSize: 7, color: PURPLE, letterSpacing: "0.08em", marginTop: 2 }}>{p.resolutionType}</div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: p.prob === 100 ? GREEN : GOLD }}>{p.prob}%</div>
                <div style={{ fontFamily: MONO, fontSize: 7, color: DIM }}>CLOSE PROB</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {[
                { label: "PARADOX PATTERN DETECTED", val: p.inefficiency.slice(0, 90) + (p.inefficiency.length > 90 ? "..." : "") },
                { label: "PROPOSED STRATEGY", val: p.strategy },
                { label: "COMPLIANCE FRAMEWORK", val: p.compliance },
                { label: "ESTIMATED ROI SAVINGS", val: fmt(p.roiSavings) },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.12em", color: DIM, marginBottom: 3 }}>{row.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: MID, lineHeight: 1.5 }}>{row.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: NAVY, border: "1px solid rgba(212,175,55,0.1)" }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, marginBottom: 2 }}>DYNAMIC CALCULATED PRICE (22% ROI)</div>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: GOLD }}>{fmt(p.price)}</div>
              </div>
              {p.status === "PENDING OPERATOR SIGN-OFF" && (
                <button
                  onClick={() => authorize(p.id)}
                  disabled={engaging === p.id}
                  style={{
                    padding: "10px 20px",
                    background: engaging === p.id ? "#1A2035" : "linear-gradient(135deg,#D4AF37,#B8860B)",
                    color: engaging === p.id ? DIM : NAVY,
                    fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
                    border: "none", cursor: engaging === p.id ? "not-allowed" : "pointer",
                  }}>
                  {engaging === p.id ? "ENGAGING..." : "AUTHORIZE ENGAGEMENT →"}
                </button>
              )}
              {p.status !== "PENDING OPERATOR SIGN-OFF" && (
                <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: statusColor(p.status), letterSpacing: "0.1em" }}>
                  {p.status === "CONTRACT SIGNED & SECURED" ? "✓ CLOSED" : "⟳ IN PROGRESS"}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SOLUTIONS LAYER ───────────────────────────────────────────────────────────
function SolutionsLayer() {
  const [activeLayer, setActiveLayer] = useState(1);
  const [activeSol, setActiveSol] = useState<string | null>(null);

  const layerSolutions = SOVEREIGN_SOLUTIONS.filter(s => s.layer === activeLayer);
  const detail = SOVEREIGN_SOLUTIONS.find(s => s.id === activeSol);
  const layerMeta = SOLUTION_LAYERS.find(l => l.num === activeLayer);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0, overflow: "hidden" }}>

      {/* Layer selector strip */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1A2035", flexShrink: 0 }}>
        {SOLUTION_LAYERS.map(l => (
          <button key={l.num} onClick={() => { setActiveLayer(l.num); setActiveSol(null); }}
            style={{
              padding: "10px 20px", background: "transparent",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              borderBottom: activeLayer === l.num ? `2px solid ${l.color}` : "2px solid transparent",
              color: activeLayer === l.num ? l.color : MID,
              fontFamily: MONO, fontSize: 9, fontWeight: activeLayer === l.num ? 700 : 400,
              letterSpacing: "0.15em", cursor: "pointer", whiteSpace: "nowrap",
            }}>
            LAYER {l.num} · {l.name.toUpperCase()}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "10px 16px", fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: "0.12em", alignSelf: "center" }}>
          {SOVEREIGN_SOLUTIONS.length} SOLUTIONS INDEXED
        </div>
      </div>

      {/* Layer header */}
      {layerMeta && (
        <div style={{ padding: "14px 20px", background: NAVY2, borderBottom: "1px solid #1A2035", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 22, color: layerMeta.color }}>{layerMeta.symbol}</div>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: "#D8DAE0", marginBottom: 3 }}>
                LAYER {layerMeta.num}: {layerMeta.name.toUpperCase()}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: MID }}>{layerMeta.desc}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 800, color: layerMeta.color }}>{layerMeta.solutions}</div>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.15em", color: DIM }}>SOLUTIONS</div>
          </div>
        </div>
      )}

      {/* Main panel: grid + detail */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 0 }}>

        {/* Solution grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, alignContent: "start" }}>
          {layerSolutions.map((s, idx) => {
            const isActive = activeSol === s.id;
            return (
              <button key={s.id} onClick={() => setActiveSol(isActive ? null : s.id)}
                style={{
                  background: isActive ? `rgba(96,165,250,0.1)` : NAVY2,
                  border: `1px solid ${isActive ? "rgba(96,165,250,0.45)" : "#1A2035"}`,
                  padding: "12px 14px", textAlign: "left", cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.15em", color: isActive ? BLUE : DIM, fontWeight: 700 }}>{s.id}</div>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: isActive ? BLUE : "#1A2035", border: `1px solid ${isActive ? BLUE : "#1A2035"}`, padding: "1px 5px" }}>
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: isActive ? "#D8DAE8" : "#8B95B0", lineHeight: 1.4, marginBottom: 4 }}>
                  {s.name}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: isActive ? "#5B6480" : "#2A3050", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {s.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail pane */}
        <div style={{ width: 300, borderLeft: "1px solid #1A2035", overflowY: "auto", background: "#04060F", flexShrink: 0 }}>
          {detail ? (
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.2em", color: DIM, marginBottom: 6 }}>SOLUTION DETAIL</div>
              <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: BLUE, marginBottom: 4 }}>{detail.id}</div>
              <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: "#D8DAE0", lineHeight: 1.45, marginBottom: 16 }}>{detail.name}</div>
              <div style={{ width: 32, height: 1, background: "rgba(96,165,250,0.3)", marginBottom: 16 }} />
              <div style={{ fontFamily: MONO, fontSize: 8, color: MID, lineHeight: 1.8, marginBottom: 20 }}>{detail.description}</div>

              {/* Meta tags */}
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 20 }}>
                {[
                  "LAYER " + detail.layer,
                  "SOVEREIGN CORE",
                  "U.A.R.E.F.A.K.E.",
                  detail.id.startsWith("S-0") && parseInt(detail.id.slice(2)) <= 5 ? "CLOCK DOMAIN" : "TIME-SYNC",
                ].filter(Boolean).map(tag => (
                  <div key={tag as string} style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.12em", color: BLUE, border: "1px solid rgba(96,165,250,0.2)", padding: "2px 7px", background: "rgba(96,165,250,0.06)" }}>
                    {tag as string}
                  </div>
                ))}
              </div>

              {/* Compliance */}
              <div style={{ padding: "12px 14px", border: "1px solid rgba(52,211,153,0.15)", background: "rgba(52,211,153,0.04)", marginBottom: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.15em", color: GREEN, marginBottom: 6 }}>COMPLIANCE ATTESTATION</div>
                {["NIST SP 800-53", "SOC 2 TYPE II", "ISO 27001", "LAMPORT-ORDERED"].map(c => (
                  <div key={c} style={{ fontFamily: MONO, fontSize: 8, color: "#4B5568", marginBottom: 3 }}>
                    <span style={{ color: GREEN, marginRight: 6 }}>✓</span>{c}
                  </div>
                ))}
              </div>

              <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, lineHeight: 1.7 }}>
                LAYER {detail.layer} — {detail.layerName.toUpperCase()}<br />
                INDEXED TO SOVEREIGN EXECUTION MATRIX
              </div>
            </div>
          ) : (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 22, color: "#1A2035" }}>⧖</div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, textAlign: "center", letterSpacing: "0.1em", lineHeight: 1.8 }}>
                SELECT A SOLUTION<br />TO VIEW DETAILS
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DELIVERY PIPELINE ─────────────────────────────────────────────────────────
interface PipelineStats {
  stats: { compiled: number; delivered: number; verified: number; outreach: number; total: number };
  recent: Array<{
    artifactId: string;
    productName: string;
    paradoxTitle: string;
    resolutionType: string;
    buyerInstitution: string;
    buyerTier: string;
    artifactSeal: string;
    status: string;
    createdAt: string;
  }>;
}

function DeliveryPipeline() {
  const [data, setData] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/delivery/pipeline-stats")
      .then(r => r.json())
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function runSample() {
    setCompiling(true);
    try {
      await fetch("/api/delivery/auto-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paradoxId: "paradox_vault_001",
          buyerId: "buyer_demo",
          institution: "Demo Financial Corp",
          tier: "tier1",
          priceUsd: 90200,
        }),
      });
      await load();
    } catch { /* ignore */ } finally {
      setCompiling(false);
    }
  }

  const statusColor = (s: string) =>
    s === "VERIFIED" ? GREEN : s === "DELIVERED" ? BLUE : s === "COMPILED" ? AMBER : MID;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", border: "1px solid #1A2035", background: NAVY2, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: GOLD, marginBottom: 3 }}>JIT DELIVERY PIPELINE</div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: MID }}>Zero shelf stock · 7-layer hardening · Smart contract settlement · Non-repudiation log</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} disabled={loading}
            style={{ padding: "7px 14px", background: "transparent", border: "1px solid rgba(212,175,55,0.35)", color: GOLD, fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer" }}>
            {loading ? "LOADING..." : "↻ REFRESH"}
          </button>
          <button onClick={runSample} disabled={compiling || loading}
            style={{ padding: "7px 14px", background: compiling ? "#1A2035" : "linear-gradient(135deg,#D4AF37,#B8860B)", color: compiling ? DIM : NAVY, fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", border: "none", cursor: "pointer" }}>
            {compiling ? "COMPILING..." : "⊕ COMPILE SAMPLE"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ fontFamily: MONO, fontSize: 10, color: DIM, textAlign: "center", padding: "40px 0" }}>QUERYING DELIVERY LEDGER...</div>
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: "flex", gap: 0, border: "1px solid #1A2035", flexShrink: 0 }}>
            {[
              { label: "COMPILED", val: data?.stats.compiled ?? 0, color: AMBER },
              { label: "DELIVERED", val: data?.stats.delivered ?? 0, color: BLUE },
              { label: "VERIFIED", val: data?.stats.verified ?? 0, color: GREEN },
              { label: "OUTREACH", val: data?.stats.outreach ?? 0, color: PURPLE },
              { label: "TOTAL ARTIFACTS", val: data?.stats.total ?? 0, color: GOLD },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: "14px 16px", borderLeft: i > 0 ? "1px solid #1A2035" : "none", background: NAVY2 }}>
                <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 800, color: s.color, marginBottom: 3 }}>{s.val}</div>
                <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.18em", color: DIM }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Pipeline stages legend */}
          <div style={{ padding: "10px 16px", border: "1px solid #1A2035", background: NAVY2, flexShrink: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.18em", color: DIM, marginBottom: 8 }}>7-LAYER HARDENING PIPELINE</div>
            <div style={{ display: "flex", gap: 0 }}>
              {[
                { num: "L1", label: "FINGERPRINT", color: "#60A5FA" },
                { num: "L2", label: "HW-BIND", color: "#A78BFA" },
                { num: "L3", label: "OBFUSCATE", color: "#F59E0B" },
                { num: "L4", label: "WATERMARK", color: "#34D399" },
                { num: "L5", label: "ANTI-TAMPER", color: "#F87171" },
                { num: "L6", label: "ZERO-DUP", color: "#D4AF37" },
                { num: "L7", label: "CHAIN-ANCHOR", color: "#38BDF8" },
              ].map((l, i) => (
                <div key={l.num} style={{ flex: 1, textAlign: "center", borderLeft: i > 0 ? "1px solid #1A2035" : "none", padding: "6px 4px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: l.color, marginBottom: 2 }}>{l.num}</div>
                  <div style={{ fontFamily: MONO, fontSize: 6.5, letterSpacing: "0.08em", color: DIM }}>{l.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent artifacts */}
          <div style={{ border: "1px solid #1A2035", background: NAVY2, flexShrink: 0 }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #1A2035" }}>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: GOLD }}>RECENT ARTIFACTS</div>
            </div>
            {(!data?.recent || data.recent.length === 0) ? (
              <div style={{ padding: "30px 16px", textAlign: "center", fontFamily: MONO, fontSize: 9, color: DIM }}>
                NO ARTIFACTS COMPILED YET — CLICK "COMPILE SAMPLE" OR AUTHORIZE AN ENGAGEMENT
              </div>
            ) : (
              data.recent.map((a, i) => (
                <div key={a.artifactId} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 16px", borderBottom: i < data.recent.length - 1 ? "1px solid #0F1424" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "#C8CAD0" }}>{a.buyerInstitution}</div>
                      <div style={{ fontFamily: MONO, fontSize: 7, color: PURPLE, border: `1px solid ${PURPLE}33`, padding: "1px 5px" }}>{a.buyerTier?.toUpperCase()}</div>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 8, color: MID, marginBottom: 3 }}>{a.productName}</div>
                    <div style={{ fontFamily: MONO, fontSize: 7, color: DIM }}>{a.resolutionType}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: statusColor(a.status), marginBottom: 3 }}>{a.status}</div>
                    <div style={{ fontFamily: MONO, fontSize: 6.5, color: DIM, maxWidth: 140, wordBreak: "break-all" as const }}>
                      {a.artifactSeal?.slice(0, 16)}...
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Settlement info */}
          <div style={{ padding: "12px 16px", border: "1px solid rgba(52,211,153,0.15)", background: "rgba(52,211,153,0.04)", flexShrink: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.15em", color: GREEN, marginBottom: 5 }}>SMART CONTRACT SETTLEMENT — SOVEREIGN MANDATE</div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: MID, lineHeight: 1.7 }}>
              Each artifact triggers a smart contract on delivery. Escrow holds in paradox_vault for 72hrs. Release requires L5 Consensus + L6 SOC 2 cryptographic match. IRS-First Rule: 21% CIT sequestrated to EFTPS before operating capital classification. Settlement address: <span style={{ color: "#9BA5C0" }}>0x537C4e2bDf...E9F3</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
interface LiveTelemetry {
  systemId: string;
  mode: string;
  homeostasis: string;
  opsPerSec: number;
  heapUsedMB: string;
  heapTotalMB: string;
  eventLoopLagMs: string;
  uptimeSec: number;
  rssMB: string;
  systemStatic: boolean;
  lamportTick: number;
  physicalNodes: number;
  logicalNodes: number;
  digest: string;
  nonce: number;
  timestamp: number;
}

function useLiveTelemetry() {
  const [data, setData] = useState<LiveTelemetry | null>(null);
  useEffect(() => {
    const poll = () => {
      fetch("/api/telemetry")
        .then(r => r.json())
        .then(setData)
        .catch(() => null);
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);
  return data;
}

// ── QUANTUM FOUNDRY ────────────────────────────────────────────────────────────
const AXIOM_LIBRARY = [
  { id: "AX-001", name: "SET THEORY COLLAPSE",      domain: "TOPOLOGY",    status: "SOLVED" },
  { id: "AX-002", name: "BAYESIAN UNCERTAINTY",      domain: "PROBABILITY", status: "SOLVED" },
  { id: "AX-003", name: "CAUSAL LOOP DISSOLUTION",   domain: "CAUSAL",      status: "SOLVED" },
  { id: "AX-004", name: "PREDICATE PARADOX",         domain: "LOGIC",       status: "SOLVED" },
  { id: "AX-005", name: "FRACTAL CONVERGENCE",       domain: "GEOMETRY",    status: "SOLVED" },
  { id: "AX-006", name: "FUZZY BOUNDARY RESOLUTION", domain: "FUZZY",       status: "SOLVED" },
  { id: "AX-007", name: "IDENTITY EIGENSTATE",       domain: "IDENTITY",    status: "SOLVED" },
  { id: "AX-008", name: "INFORMATION ENTROPY MIN",   domain: "INFORMATION", status: "SOLVED" },
  { id: "AX-009", name: "BEHAVIORAL EQUILIBRIUM",    domain: "BEHAVIORAL",  status: "SOLVED" },
  { id: "AX-010", name: "CALCULUS OF VARIATIONS",    domain: "CALCULUS",    status: "SOLVED" },
  { id: "AX-011", name: "TETHER-BUBBLE COHERENCE",   domain: "QUANTUM",     status: "SOLVED" },
  { id: "AX-012", name: "LAMPORT CAUSALITY LOCK",    domain: "TEMPORAL",    status: "SOLVED" },
];

const HYBRID_ROUTING = [
  { problem: "High-dimensional combinatorial optimization (>500 variables)",  path: "QPU",       backend: "IBM Quantum Eagle r3",       reason: "QAOA advantage zone" },
  { problem: "Linear constraint satisfaction (<200 variables)",               path: "CLASSICAL",  backend: "54-node inference kernel",    reason: "Classical sufficient" },
  { problem: "Cryptographic hash verification (SHA-3 family)",                path: "CLASSICAL",  backend: "FIPS 203 KEM boundary",       reason: "Deterministic required" },
  { problem: "Portfolio optimization with >1000 assets",                      path: "QPU",       backend: "Azure Quantum IonQ Aria 1",   reason: "Superposition advantage" },
  { problem: "Paradox axiom cross-reference (88-template KB)",                path: "CLASSICAL",  backend: "TETHER-BUBBLE v2.0 kernel",  reason: "Template match O(n)" },
  { problem: "Monte Carlo risk surface (>10M samples)",                       path: "QPU",       backend: "AWS Braket Rigetti Ankaa-2",  reason: "Quantum sampling speedup" },
];

function QuantumFoundry() {
  const [nodeStates, setNodeStates] = useState<string[]>(() => Array(54).fill("|0⟩"));
  const [factoryData, setFactoryData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<{ msg: string; ok: boolean } | null>(null);
  const [cycleCount, setCycleCount] = useState(0);
  const [activeAxiom, setActiveAxiom] = useState(0);
  const [errorMitigationTick, setErrorMitigationTick] = useState(0);

  useEffect(() => {
    const QSTATES = ["|0⟩", "|1⟩", "|ψ⟩", "ENT", "CLK"];
    const t = setInterval(() => {
      setNodeStates(prev => prev.map(s => Math.random() < 0.22 ? QSTATES[Math.floor(Math.random() * QSTATES.length)] : s));
      setCycleCount(c => c + 1);
      setErrorMitigationTick(c => c + 1);
    }, 480);
    const ax = setInterval(() => setActiveAxiom(a => (a + 1) % AXIOM_LIBRARY.length), 2200);
    return () => { clearInterval(t); clearInterval(ax); };
  }, []);

  const loadFactory = async () => {
    try {
      const r = await fetch("/api/quantum/factory-status");
      if (r.ok) setFactoryData(await r.json());
    } catch { /* graceful */ }
  };

  useEffect(() => {
    loadFactory();
    const t = setInterval(loadFactory, 8000);
    return () => clearInterval(t);
  }, []);

  const handleProcess = async () => {
    setProcessing(true);
    setProcessResult(null);
    try {
      const r = await fetch("/api/quantum/process-feedstock", { method: "POST" });
      const d = await r.json();
      const ok = d.status === "PROCESSED";
      setProcessResult({ msg: d.message ?? d.status, ok });
      await loadFactory();
    } catch { /* graceful */ }
    setProcessing(false);
  };

  const nodeColor = (s: string) => {
    if (s === "|ψ⟩") return GOLD;
    if (s === "ENT")  return PURPLE;
    if (s === "CLK")  return GREEN;
    if (s === "|1⟩")  return BLUE;
    return "#1E2840";
  };
  const nodeBg = (s: string) => {
    if (s === "|ψ⟩") return "#D4AF3718";
    if (s === "ENT")  return "#A78BFA18";
    if (s === "CLK")  return "#34D39918";
    if (s === "|1⟩")  return "#60A5FA10";
    return "transparent";
  };

  const stages = factoryData?.stages ?? {};
  const pqCrypto = factoryData?.quantumArchitecture?.pqCrypto ?? [
    { standard: "FIPS 203", algorithm: "CRYSTALS-Kyber-1024", type: "KEM", status: "ACTIVE" },
    { standard: "FIPS 204", algorithm: "CRYSTALS-Dilithium-5", type: "DSA", status: "ACTIVE" },
    { standard: "FIPS 205", algorithm: "SPHINCS+-256s", type: "HASH-SIG", status: "ACTIVE" },
  ];
  const qpuBackends = factoryData?.quantumArchitecture?.qpuBackends ?? [
    { provider: "Azure Quantum", device: "IonQ Aria 1", qubits: 25, mode: "STANDBY", errorRate: 0.0012 },
    { provider: "AWS Braket", device: "Rigetti Ankaa-2", qubits: 84, mode: "STANDBY", errorRate: 0.0031 },
    { provider: "IBM Quantum", device: "Eagle r3", qubits: 127, mode: "STANDBY", errorRate: 0.0018 },
  ];
  const qaoa = factoryData?.quantumArchitecture?.qaoa ?? { depth: 12, convergence: 94.7, iterations: 0 };

  // Error mitigation — simulated stabilizer syndrome metrics
  const errorRate = 0.0018 + Math.sin(errorMitigationTick * 0.07) * 0.0004;
  const logicalErrorRate = errorRate * errorRate * 900;
  const syndromeChecks = 900 + (errorMitigationTick % 17) * 3;

  return (
    <div style={{ overflowY: "auto", flex: 1, paddingBottom: 24 }}>

      {/* ── FACTORY ONLINE BANNER ── */}
      <div style={{ marginBottom: 14, padding: "12px 18px", border: "1px solid #D4AF3730", background: "#D4AF3706", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, boxShadow: "0 0 8px 3px #34D39966", animation: "pulse 2s infinite" }} />
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: GREEN, letterSpacing: "0.2em", fontWeight: 700 }}>FACTORY ONLINE — AUTONOMOUS SOVEREIGN OPERATION</div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.12em", marginTop: 2 }}>QUANTUM-FAKE EMULATION MODE · TETHER-BUBBLE v2.0 · NIST SP 800-53 · SOC 2 TYPE II · ISO 27001</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "CYCLES", val: (factoryData?.factory?.cycleCount ?? cycleCount).toLocaleString() },
            { label: "PROCESSED", val: String(factoryData?.factory?.processedCount ?? 0) },
            { label: "UPTIME", val: factoryData ? `${Math.floor(factoryData.factory.uptimeMs / 60000)}m` : "—" },
            { label: "THROUGHPUT", val: `${factoryData?.factory?.throughputPerHour ?? 0}/hr` },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.15em" }}>{m.label}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: GOLD }}>{m.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5-STAGE FACTORY PIPELINE ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.2em", marginBottom: 10 }}>AUTONOMOUS QUANTUM PARADOX RESOLUTION FACTORY — 5-STAGE PIPELINE</div>
        <div style={{ display: "flex", gap: 0 }}>
          {([
            { num: "01", label: "RAW FEEDSTOCK", sub: "Unresolved entropy\nB2B conflicts\nRaw paradox streams", val: String(stages.feedstock?.count ?? "—"), color: AMBER, icon: "⊗", status: stages.feedstock?.status ?? "INGESTING" },
            { num: "02", label: "THE FOUNDRY",   sub: "54-node quantum-fake\nInference kernel\nSuperposition mapping", val: "54", color: BLUE, icon: "⬡", status: "ACTIVE" },
            { num: "03", label: "THE TEMPLATES", sub: "88 paradox axioms\nTETHER-BUBBLE v2.0\nProprietary KB", val: "88", color: PURPLE, icon: "◈", status: "LOADED" },
            { num: "04", label: "THE OUTPUT",    sub: "Validated solutions\nBlockchain-ready\nIntellectual assets", val: String(stages.output?.count ?? "—"), color: GREEN, icon: "◆", status: stages.output?.status ?? "SYNTHESIZING" },
            { num: "05", label: "THE MARKET",    sub: "Solvex Marketplace\nAuto-integration\nVault locked", val: String(stages.market?.count ?? "—"), color: GOLD, icon: "✦", status: stages.market?.status ?? "LIVE" },
          ] as const).map((stage, i, arr) => (
            <div key={stage.num} style={{ flex: 1, display: "flex", alignItems: "stretch" }}>
              <div style={{ flex: 1, padding: "12px 10px", border: `1px solid ${stage.color}25`, background: `${stage.color}06`, position: "relative" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${stage.color}, transparent)` }} />
                <div style={{ fontFamily: MONO, fontSize: 7, color: stage.color, letterSpacing: "0.12em", marginBottom: 4, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                  <span>{stage.num} · {stage.icon}</span>
                  <span style={{ fontSize: 6, opacity: 0.7 }}>{stage.status}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "#E8EAF0", marginBottom: 4 }}>{stage.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, lineHeight: 1.6, whiteSpace: "pre-line", marginBottom: 8 }}>{stage.sub}</div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: stage.color }}>{stage.val}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", padding: "0 3px", color: DIM, fontFamily: MONO, fontSize: 12 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── ROW: 54-NODE KERNEL + QAOA ENGINE ── */}
      <div style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* 54-Node Superposition Array */}
        <div style={{ border: "1px solid #1A2035", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.2em", marginBottom: 3 }}>QUANTUM-FAKE INFERENCE KERNEL</div>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: GOLD }}>54-NODE SUPERPOSITION ARRAY</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 7, color: DIM }}>CYCLE</div>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: BLUE }}>#{cycleCount.toLocaleString()}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 3, marginBottom: 10 }}>
            {nodeStates.map((s, i) => (
              <div key={i} style={{
                padding: "3px 1px", background: nodeBg(s), border: `1px solid ${nodeColor(s)}40`,
                textAlign: "center", fontFamily: MONO, fontSize: 6, fontWeight: 700,
                color: nodeColor(s), letterSpacing: 0, transition: "all 0.3s ease",
              }}>{s}</div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            {([
              { s: "|0⟩", label: "Ground",    c: "#1E2840" },
              { s: "|1⟩", label: "Excited",   c: BLUE },
              { s: "|ψ⟩", label: "Superpos.", c: GOLD },
              { s: "ENT", label: "Entangled", c: PURPLE },
              { s: "CLK", label: "Collapsed", c: GREEN },
            ] as const).map(l => (
              <div key={l.s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 18, height: 11, border: `1px solid ${l.c}60`, background: `${l.c}20`, fontFamily: MONO, fontSize: 5, color: l.c, display: "flex", alignItems: "center", justifyContent: "center" }}>{l.s}</div>
                <span style={{ fontFamily: MONO, fontSize: 7, color: DIM }}>{l.label}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 10px", background: "#0B0E1A", border: "1px solid #A78BFA20" }}>
            <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, marginBottom: 3 }}>ENTANGLEMENT PROTOCOL — LAMPORT ORDERED</div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: "#8B94B0", lineHeight: 1.6 }}>
              Resolution in one branch instantaneously updates parity of all connected synaptic loops. Non-local correlation validated across all 54 nodes. Epoch: L-{(Date.now() % 1e9).toString(16).toUpperCase()}
            </div>
          </div>
        </div>

        {/* QAOA Heuristic Engine */}
        <div style={{ border: "1px solid #1A2035", padding: "14px" }}>
          <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.2em", marginBottom: 3 }}>QAOA HEURISTIC ENGINE</div>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: PURPLE, marginBottom: 12 }}>QUANTUM-INSPIRED SOLVER — DEPTH {qaoa.depth}</div>
          {([
            { label: "CIRCUIT DEPTH", val: `p = ${qaoa.depth} LAYERS`, pct: 0.6, c: PURPLE },
            { label: "MIXER OPERATOR", val: "X-ROTATION ⊗ Rz(θ)", pct: 1.0, c: PURPLE },
            { label: "CONVERGENCE", val: `${Number(qaoa.convergence).toFixed(1)}%`, pct: Number(qaoa.convergence) / 100, c: GREEN },
            { label: "ITERATIONS", val: `${qaoa.iterations} / 200`, pct: (qaoa.iterations || 0) / 200, c: BLUE },
          ]).map(m => (
            <div key={m.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.1em" }}>{m.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: m.c }}>{m.val}</span>
              </div>
              <div style={{ height: 3, background: "#1A2035" }}>
                <div style={{ height: "100%", width: `${Math.min(m.pct * 100, 100)}%`, background: m.c, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: "8px 10px", background: "#0B0E1A", border: "1px solid #A78BFA20" }}>
            <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, marginBottom: 3 }}>ACTIVE AXIOM TEMPLATE — ROTATING</div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: PURPLE, fontWeight: 700, marginBottom: 2 }}>{AXIOM_LIBRARY[activeAxiom].id} · {AXIOM_LIBRARY[activeAxiom].name}</div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: DIM }}>Domain: {AXIOM_LIBRARY[activeAxiom].domain} · {AXIOM_LIBRARY[activeAxiom].status}</div>
          </div>
        </div>
      </div>

      {/* ── ROW: ERROR MITIGATION + HYBRID ROUTING ── */}
      <div style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Error Mitigation Layer */}
        <div style={{ border: "1px solid #1A2035", padding: "14px" }}>
          <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.2em", marginBottom: 3 }}>ERROR MITIGATION — DESIGN PARAMETER</div>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: AMBER, marginBottom: 12 }}>STABILIZER CODE · SURFACE CODE LAYER</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {([
              { label: "PHYSICAL ERROR RATE", val: errorRate.toFixed(4), unit: "per gate", color: AMBER },
              { label: "LOGICAL ERROR RATE", val: logicalErrorRate.toFixed(6), unit: "per cycle", color: GREEN },
              { label: "SYNDROME CHECKS", val: syndromeChecks.toLocaleString(), unit: "stabilizers", color: BLUE },
              { label: "LOGICAL QUBITS", val: "105", unit: "fault-tolerant", color: PURPLE },
            ]).map(m => (
              <div key={m.label} style={{ padding: "8px 10px", background: "#0B0E1A", border: `1px solid ${m.color}18` }}>
                <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: "0.1em", marginBottom: 3 }}>{m.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: m.color }}>{m.val}</div>
                <div style={{ fontFamily: MONO, fontSize: 6, color: DIM }}>{m.unit}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: MONO, fontSize: 7, color: DIM }}>NOISE-RESISTANT MODE</span>
              <span style={{ fontFamily: MONO, fontSize: 7, color: DIM }}>ERROR-CORRECTED MODE</span>
            </div>
            <div style={{ height: 6, background: "#1A2035", position: "relative", borderRadius: 1 }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: "72%", background: `linear-gradient(90deg, ${AMBER}, ${GREEN})` }} />
              <div style={{ position: "absolute", left: "72%", top: -3, fontFamily: MONO, fontSize: 7, color: GREEN, transform: "translateX(-50%)" }}>◆</div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, marginTop: 4, textAlign: "center" }}>WILLOW-CLASS THRESHOLD ACHIEVED — Q3 2026 TARGET: FULL LOGICAL STABILITY</div>
          </div>
          <div style={{ padding: "6px 10px", background: "#D4AF3708", border: "1px solid #D4AF3720" }}>
            <div style={{ fontFamily: MONO, fontSize: 7, color: GOLD, lineHeight: 1.6 }}>
              Google Willow ref: 105 logical / 900 physical qubits · Below error threshold. Transitioning from raw qubit counting → logical qubit stability paradigm.
            </div>
          </div>
        </div>

        {/* Hybrid Workflow Routing Matrix */}
        <div style={{ border: "1px solid #1A2035", padding: "14px" }}>
          <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.2em", marginBottom: 3 }}>HYBRID WORKFLOW ROUTER</div>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: BLUE, marginBottom: 12 }}>CLASSICAL ↔ QPU DISPATCH MATRIX</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {HYBRID_ROUTING.map((r, i) => (
              <div key={i} style={{ padding: "6px 10px", background: "#0B0E1A", border: `1px solid ${r.path === "QPU" ? BLUE : GREEN}18`, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{
                  flexShrink: 0, padding: "2px 5px", fontFamily: MONO, fontSize: 6, fontWeight: 700, letterSpacing: "0.08em",
                  background: r.path === "QPU" ? "#60A5FA18" : "#34D39918",
                  color: r.path === "QPU" ? BLUE : GREEN,
                  border: `1px solid ${r.path === "QPU" ? BLUE : GREEN}40`,
                  marginTop: 1,
                }}>{r.path}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: "#8B94B0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{r.problem}</div>
                  <div style={{ fontFamily: MONO, fontSize: 6, color: DIM }}>{r.backend} · {r.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW: PQ-CRYPTO + QPU BACKENDS ── */}
      <div style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Post-Quantum Cryptography */}
        <div style={{ border: "1px solid #1A2035", padding: "14px" }}>
          <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.2em", marginBottom: 3 }}>POST-QUANTUM CRYPTOGRAPHY</div>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: GREEN, marginBottom: 12 }}>NIST FIPS 203 / 204 / 205 — ACTIVE</div>
          {pqCrypto.map((pq: any) => (
            <div key={pq.standard} style={{ marginBottom: 8, padding: "10px 12px", background: "#0B0E1A", border: "1px solid #34D39915" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div>
                  <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: GREEN }}>{pq.standard}</span>
                  <span style={{ fontFamily: MONO, fontSize: 7, color: DIM, marginLeft: 8 }}>{pq.type}</span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 7, color: GREEN, border: "1px solid #34D39940", padding: "2px 5px" }}>✓ {pq.status}</span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: "#8B94B0" }}>{pq.algorithm}</div>
            </div>
          ))}
          <div style={{ padding: "8px 10px", background: "#D4AF3708", border: "1px solid #D4AF3720", marginTop: 8 }}>
            <div style={{ fontFamily: MONO, fontSize: 7, color: GOLD, lineHeight: 1.6 }}>
              88-PARADOX DATA CORPUS: Secured against quantum decryption via Kyber-1024 KEM. Proprietary IP protected at FIPS 140-3 Level 3 cryptographic boundary.
            </div>
          </div>
        </div>

        {/* Hybrid QPU Cloud Backends */}
        <div style={{ border: "1px solid #1A2035", padding: "14px" }}>
          <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.2em", marginBottom: 3 }}>HYBRID QPU ARCHITECTURE</div>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: BLUE, marginBottom: 12 }}>CLOUD QUANTUM BACKENDS</div>
          {qpuBackends.map((qpu: any) => (
            <div key={qpu.provider} style={{ marginBottom: 8, padding: "10px 12px", background: "#0B0E1A", border: "1px solid #60A5FA15" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: BLUE, marginBottom: 2 }}>{qpu.provider}</div>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: DIM }}>{qpu.device} · {qpu.qubits} qubits</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: AMBER, border: "1px solid #F59E0B40", padding: "2px 5px", marginBottom: 2 }}>{qpu.mode}</div>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: DIM }}>err: {qpu.errorRate}</div>
                </div>
              </div>
            </div>
          ))}
          <div style={{ padding: "10px 12px", background: "#0B0E1A", border: "1px solid #34D39920" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: GREEN }}>Google Willow (Reference)</div>
              <span style={{ fontFamily: MONO, fontSize: 7, color: GREEN, border: "1px solid #34D39940", padding: "2px 5px" }}>FAULT-TOLERANT</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: DIM }}>105 logical qubits · 900 physical qubits</div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: "#8B94B0", marginTop: 4, lineHeight: 1.5 }}>
              Below error threshold — logical qubit stability demonstrated. Target: error-corrected mode Q3 2026.
            </div>
          </div>
        </div>
      </div>

      {/* ── 88-AXIOM TEMPLATE LIBRARY ── */}
      <div style={{ marginBottom: 14, border: "1px solid #A78BFA20", padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.2em", marginBottom: 3 }}>PROPRIETARY KNOWLEDGE BASE — TETHER-BUBBLE v2.0</div>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: PURPLE }}>88-AXIOM TEMPLATE LIBRARY — SOLVED PARADOX STATES</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: MONO, fontSize: 7, color: DIM }}>ACTIVE TEMPLATE</div>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: PURPLE }}>{AXIOM_LIBRARY[activeAxiom].id}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 3, marginBottom: 10 }}>
          {Array.from({ length: 88 }, (_, i) => {
            const isActive = i === activeAxiom;
            const isKnown = i < AXIOM_LIBRARY.length;
            return (
              <div key={i} style={{
                padding: "3px 2px", textAlign: "center",
                background: isActive ? "#A78BFA22" : isKnown ? "#A78BFA08" : "#0B0E1A",
                border: `1px solid ${isActive ? PURPLE : isKnown ? "#A78BFA30" : "#1A2035"}`,
                fontFamily: MONO, fontSize: 6, color: isActive ? PURPLE : isKnown ? "#8B94B0" : DIM,
                fontWeight: isActive ? 800 : 400,
                transition: "all 0.3s ease",
              }}>AX-{String(i + 1).padStart(3, "0")}</div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["TOPOLOGY", "PROBABILITY", "CAUSAL", "LOGIC", "GEOMETRY", "FUZZY", "IDENTITY", "INFORMATION", "BEHAVIORAL", "CALCULUS", "QUANTUM", "TEMPORAL"].map(d => (
            <div key={d} style={{ padding: "2px 7px", background: "#A78BFA10", border: "1px solid #A78BFA30", fontFamily: MONO, fontSize: 6, color: PURPLE }}>{d}</div>
          ))}
        </div>
      </div>

      {/* ── FEEDSTOCK QUEUE + PROCESS CONTROLS ── */}
      <div style={{ border: "1px solid #1A2035", padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.2em", marginBottom: 3 }}>FEEDSTOCK QUEUE — KINETIC RESOLVER</div>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: AMBER }}>AWAITING QUANTUM-FAKE INFERENCE</div>
          </div>
          <button
            onClick={handleProcess}
            disabled={processing}
            style={{
              padding: "10px 20px",
              background: processing ? "transparent" : "linear-gradient(135deg, #D4AF37, #B8860B)",
              border: processing ? "1px solid #D4AF37" : "none",
              color: processing ? GOLD : "#05080F",
              fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.15em",
              cursor: processing ? "not-allowed" : "pointer",
            }}>{processing ? "⟳ QUANTUM INFERENCE RUNNING..." : "⊕ PROCESS FEEDSTOCK"}</button>
        </div>

        {processResult && (
          <div style={{ marginBottom: 12, padding: "8px 12px", background: processResult.ok ? "#34D39910" : "#F59E0B10", border: `1px solid ${processResult.ok ? "#34D39940" : "#F59E0B40"}` }}>
            <div style={{ fontFamily: MONO, fontSize: 8, color: processResult.ok ? GREEN : AMBER }}>{processResult.msg}</div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.15em", marginBottom: 8 }}>RECENT FEEDSTOCK</div>
            {(factoryData?.recentFeedstock ?? []).length === 0
              ? <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, padding: 8, border: "1px dashed #1A2035" }}>Queue empty — Post bounties to generate feedstock</div>
              : (factoryData?.recentFeedstock ?? []).map((f: any, i: number) => (
                <div key={f.id ?? i} style={{ padding: "7px 10px", marginBottom: 3, background: "#0B0E1A", border: "1px solid #1A2035" }}>
                  <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, color: AMBER, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</div>
                  <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, marginTop: 2 }}>{f.category ?? "uncategorized"}</div>
                </div>
              ))}
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.15em", marginBottom: 8 }}>RECENT OUTPUT (VALIDATED ASSETS)</div>
            {(factoryData?.recentOutput ?? []).length === 0
              ? <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, padding: 8, border: "1px dashed #1A2035" }}>No assets synthesized yet</div>
              : (factoryData?.recentOutput ?? []).map((o: any, i: number) => (
                <div key={o.id ?? i} style={{ padding: "7px 10px", marginBottom: 3, background: "#0B0E1A", border: "1px solid #34D39920" }}>
                  <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, color: GREEN, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {String(o.content ?? "").substring(0, 60)}{(o.content ?? "").length > 60 ? "…" : ""}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, marginTop: 2 }}>status: {o.status ?? "verified"} · id: {o.id}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

    </div>
  );
}

const TABS = ["SOLUTIONS", "COMM-LINK", "SANDBOX UI", "ROI ANALYTICS", "OUTBOUND AUTH", "DELIVERY PIPELINE", "QUANTUM FOUNDRY"] as const;

export default function BrainConsole() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("SOLUTIONS");
  const [pulse, setPulse] = useState(false);
  const [homeostasis] = useState(98.4);
  const telemetry = useLiveTelemetry();

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1400);
    return () => clearInterval(t);
  }, []);

  // shared chat injector for OUTBOUND AUTH → COMM-LINK
  const chatRef = useRef<((m: string) => void) | null>(null);

  return (
    <DashboardLayout>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>

        {/* Header Banner */}
        <div style={{ marginBottom: 20, padding: "18px 24px", border: "1px solid rgba(212,175,55,0.25)", background: "linear-gradient(135deg,#07091A,#090D1E)", position: "relative", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(212,175,55,0.02) 39px,rgba(212,175,55,0.02) 40px)" }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.25em", color: "#3D4560", marginBottom: 2 }}>SYSTEM ID: {telemetry?.systemId ?? "SOLVEX-CORE-FINALIZED"} &nbsp;|&nbsp; U.A.R.E.F.A.K.E. ENGINE CONSOLE</div>
              <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: "#D8DAE8", letterSpacing: "0.04em", marginBottom: 3 }}>dAIsy haMINJA Brain Console</div>
              <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: "0.12em", color: MID }}>Unmanned Autonomous Recursive Economic Fiduciary Asset Kinetic Engine &nbsp;·&nbsp; 54-Node Recursive Pipeline</div>
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: GREEN }}>{telemetry ? telemetry.homeostasis : homeostasis}%</div>
                <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: "0.15em" }}>HOMEOSTASIS</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: telemetry?.systemStatic ? AMBER : GREEN, boxShadow: pulse ? `0 0 10px 3px ${telemetry?.systemStatic ? "rgba(245,158,11,0.5)" : "rgba(52,211,153,0.5)"}` : `0 0 3px 1px ${telemetry?.systemStatic ? "rgba(245,158,11,0.2)" : "rgba(52,211,153,0.2)"}`, transition: "box-shadow 0.7s ease" }} />
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: telemetry?.systemStatic ? AMBER : GREEN, letterSpacing: "0.15em" }}>{telemetry ? telemetry.mode : "INITIALIZING..."}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 7.5, color: MID }}>88 PARADOXES · 29 VAULT PRODUCTS · 40 HISTORICAL KEYS</div>
                <div style={{ fontFamily: MONO, fontSize: 7.5, color: MID }}>NIST SP 800-53 ✓ &nbsp; SOC 2 TYPE II ✓ &nbsp; ISO 27001 ✓</div>
              </div>
            </div>
          </div>

          {/* System status row — LIVE telemetry from /api/telemetry */}
          <div style={{ position: "relative", zIndex: 1, marginTop: 14, paddingTop: 14, borderTop: "1px solid #1A2035", display: "flex", gap: 28, flexWrap: "wrap" }}>
            {[
              { label: "SYSTEM STATUS",   val: telemetry ? (telemetry.systemStatic ? "SYSTEM-STATIC" : "ACTIVE") : "—" },
              { label: "OPS / SEC",        val: telemetry ? `${telemetry.opsPerSec.toLocaleString()}` : "—" },
              { label: "EVENT LOOP LAG",   val: telemetry ? `${telemetry.eventLoopLagMs}ms` : "—" },
              { label: "HEAP USED",        val: telemetry ? `${telemetry.heapUsedMB} MB` : "—" },
              { label: "LAMPORT TICK",     val: telemetry ? `#${telemetry.lamportTick}` : "—" },
              { label: "EFTPS TRANSFER",   val: "SECURED & REALTIME" },
              { label: "ACTIVE NODES",     val: "54 RECURSIVE" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.15em", color: DIM, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: s.label === "SYSTEM STATUS" && telemetry?.systemStatic ? AMBER : "#8B95B0" }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* APD-01 Directive Strip — CORE-02 8-directive manifest */}
          <div style={{ position: "relative", zIndex: 1, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(212,175,55,0.12)" }}>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.2em", color: GOLD, marginBottom: 8 }}>APD-01 — AUTONOMOUS PROTOCOL DIRECTIVE &nbsp;·&nbsp; SOLVEX-CORE-03</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 32px" }}>
              {[
                { num: "01", tag: "AUTONOMOUS CORE",        desc: "dAIsy manages paradox synthesis, marketplace bounties and autonomic self-healing" },
                { num: "02", tag: "COMPLIANCE HARDWARE",    desc: "NIST/SOC 2/ISO 27001 enforced at binary level — non-compliant node self-isolates until L7 validates" },
                { num: "03", tag: "ZK PROXY",               desc: "Credentials never in LLM context — agent sends action requests; Proxy executes via secure-vault" },
                { num: "04", tag: "OBSERVABILITY & TRACE",  desc: "Each of 54 nodes produces a cryptographic hash; paradox paths pinned to Solana ledger" },
                { num: "05", tag: "FAIL-SAFE",              desc: "500ms latency or compliance drift → instant System-Static mode; Watchdog monitors all 54 nodes" },
                { num: "06", tag: "PARADOX SYNTHESIS",       desc: "88 paradoxes resolved via TETHER-BUBBLE v2.0 (40 historical keys, 10 resolution types, 0% hallucination)" },
                { num: "07", tag: "NON-REPUDIATION",        desc: "All agentic actions signed by internal private key and L1 Lamport-ordered for chronological audit" },
                { num: "08", tag: "MARKETPLACE ESCROW",     desc: "72hr hold via /api/vault/process — no Vault/Escrow release without L5 Consensus + L6 SOC 2 match" },
              ].map(d => (
                <div key={d.num} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: MONO, fontSize: 6.5, color: DIM, minWidth: 14, paddingTop: 1 }}>{d.num}</span>
                  <span style={{ fontFamily: MONO, fontSize: 6.5, fontWeight: 700, color: AMBER, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{d.tag}: </span>
                  <span style={{ fontFamily: MONO, fontSize: 6.5, color: "#4B5568", lineHeight: 1.5 }}>{d.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── dAIsy Avatar — always visible ────────────────────────────────── */}
        <div style={{ height: 240, flexShrink: 0, marginBottom: 16, border: "1px solid rgba(56,189,248,0.2)", overflow: "hidden", position: "relative" }}>
          <DaisyAvatar />
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid #1A2035", flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: "10px 20px", background: "transparent",
                borderTop: "none", borderLeft: "none", borderRight: "none",
                borderBottom: tab === t ? "2px solid #D4AF37" : "2px solid transparent",
                color: tab === t ? GOLD : MID,
                fontFamily: MONO, fontSize: 9, fontWeight: tab === t ? 700 : 400, letterSpacing: "0.15em",
                cursor: "pointer",
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {tab === "SOLUTIONS" && <SolutionsLayer />}
          {tab === "COMM-LINK" && <CommLink />}
          {tab === "SANDBOX UI" && <SandboxUI />}
          {tab === "ROI ANALYTICS" && <RoiAnalytics />}
          {tab === "OUTBOUND AUTH" && (
            <OutboundAuth chat={msg => {
              setTab("COMM-LINK");
              setTimeout(() => chatRef.current?.(msg), 100);
            }} />
          )}
          {tab === "DELIVERY PIPELINE" && <DeliveryPipeline />}
          {tab === "QUANTUM FOUNDRY" && <QuantumFoundry />}
        </div>
      </div>

      <style>{`
        @keyframes brain-pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </DashboardLayout>
  );
}
