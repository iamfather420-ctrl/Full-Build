import { useState } from "react";
import "./storefront.css";

const DOMAIN_BADGES: Record<string, { label: string; color: string }> = {
  "Cryptography & ZK Privacy": { label: "ZK-CRYPTO", color: "#00D4FF" },
  "High-Frequency Financial":  { label: "HFT-CORE",  color: "#FFD700" },
  "Security & Compliance":     { label: "SEC-GRADE", color: "#FF6B35" },
  "Identity & Access (IAM)":   { label: "IAM-ZERO",  color: "#A78BFA" },
  "AI Governance & SLAs":      { label: "AI-GOV",    color: "#34D399" },
};

const PRODUCTS = [
  { id:"SOLVEX-ZK-01", name:"ZK-KYC Dark Settlement Engine", domain:"Cryptography & ZK Privacy", subtitle:"Zero-Knowledge Institutional AML Verification", priceUsdc:"$150 USDC", priceEth:"0.05 ETH", tag:"ZERO-KNOWLEDGE", verified:true, tier:"TIER-1", sales:247 },
  { id:"SOLVEX-ZK-02", name:"Quantum Key Distribution Mesh Bridge", domain:"Cryptography & ZK Privacy", subtitle:"Post-Quantum Cryptography Wrapper for SWIFT", priceUsdc:"$240 USDC", priceEth:"0.08 ETH", tag:"POST-QUANTUM", verified:true, tier:"TIER-1", sales:189 },
  { id:"SOLVEX-ZK-03", name:"Homomorphic Fraud Scoring Vault", domain:"Cryptography & ZK Privacy", subtitle:"Encrypted Cross-Bank Inference Engine", priceUsdc:"$360 USDC", priceEth:"0.12 ETH", tag:"FHE-CORE", verified:true, tier:"TIER-1", sales:312 },
  { id:"SOLVEX-HFT-07", name:"Ultra-Low Latency Order Routing Fabric", domain:"High-Frequency Financial", subtitle:"Kernel-Bypass FPGA Matching Engine", priceUsdc:"$300 USDC", priceEth:"0.10 ETH", tag:"740ns LATENCY", verified:true, tier:"TIER-1", sales:156 },
  { id:"SOLVEX-HFT-08", name:"Deterministic Liquidity Dark Pool Gateway", domain:"High-Frequency Financial", subtitle:"Zero-Slippage Block Trade Execution Core", priceUsdc:"$270 USDC", priceEth:"0.09 ETH", tag:"DARK-POOL", verified:true, tier:"TIER-1", sales:203 },
  { id:"SOLVEX-HFT-10", name:"Real-Time Gross Settlement Optimizer", domain:"High-Frequency Financial", subtitle:"Graph Netting Liquidity Optimizer", priceUsdc:"$390 USDC", priceEth:"0.13 ETH", tag:"42% COLLATERAL↓", verified:true, tier:"TIER-1", sales:178 },
  { id:"SOLVEX-SEC-13", name:"OSFI Guideline B-13 Cloud Attestation Suite", domain:"Security & Compliance", subtitle:"Continuous Regulatory Governance Engine", priceUsdc:"$180 USDC", priceEth:"0.06 ETH", tag:"OSFI-CERTIFIED", verified:true, tier:"TIER-1", sales:421 },
  { id:"SOLVEX-SEC-15", name:"Real-Time Threat Anomaly Sentinel", domain:"Security & Compliance", subtitle:"Graph Biometric Trading Floor Guard", priceUsdc:"$270 USDC", priceEth:"0.09 ETH", tag:"GCN-DETECT", verified:true, tier:"TIER-1", sales:298 },
  { id:"SOLVEX-IAM-20", name:"Zero-Trust Dynamic RBAC Policy Engine", domain:"Identity & Access (IAM)", subtitle:"Context-Aware Privilege Escalation Governor", priceUsdc:"$210 USDC", priceEth:"0.07 ETH", tag:"ZERO-TRUST", verified:true, tier:"TIER-1", sales:334 },
  { id:"SOLVEX-GOV-24", name:"Gemini Hallucination Firewall", domain:"AI Governance & SLAs", subtitle:"Deterministic JSON Schema Constraint Engine", priceUsdc:"$390 USDC", priceEth:"0.13 ETH", tag:"0.0000% HALLUC", verified:true, tier:"TIER-1", sales:267 },
  { id:"SOLVEX-GOV-27", name:"Model Explainability (XAI) Auditor", domain:"AI Governance & SLAs", subtitle:"Shapley Value Attribution for Credit Risk", priceUsdc:"$300 USDC", priceEth:"0.10 ETH", tag:"SHAPLEY-XAI", verified:true, tier:"TIER-1", sales:189 },
  { id:"SOLVEX-MASTER-29", name:"Solvex Master Apex Bundle", domain:"AI Governance & SLAs", subtitle:"All 28 Tier-1 Enterprise Paradox Engines", priceUsdc:"$540 USDC", priceEth:"0.18 ETH", tag:"APEX-BUNDLE", verified:true, tier:"PLATINUM", sales:89 },
];

const DOMAINS = ["ALL", "Cryptography & ZK Privacy", "High-Frequency Financial", "Security & Compliance", "Identity & Access (IAM)", "AI Governance & SLAs"];

const TICKER_ITEMS = [
  "ZK-KYC ▲ +12.4%", "KYBER-QKD ▲ +8.1%", "HOMOMORPHIC-FHE ▼ -2.3%",
  "HFT-FABRIC ▲ +19.7%", "DARK-POOL ▲ +5.6%", "RTGS-OPT ▲ +11.2%",
  "OSFI-B13 ▲ +3.9%", "SOC2-VAULT ▼ -1.1%", "ANOMALY-GCN ▲ +22.8%",
  "CDRE ▲ +6.4%", "PAM-BROKER ▲ +9.3%", "XAI-SHAPLEY ▲ +14.5%",
  "APEX-MASTER ▲ +31.2%", "SOLVEX INDEX ▲ +8.74%",
];

export default function Storefront() {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = activeFilter === "ALL" ? PRODUCTS : PRODUCTS.filter(p => p.domain === activeFilter);

  return (
    <div className="ws-root">
      {/* Top Ticker Bar */}
      <div className="ws-ticker">
        <div className="ws-ticker-label">LIVE MARKET</div>
        <div className="ws-ticker-track">
          <div className="ws-ticker-inner">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className={`ws-ticker-item ${item.includes("▼") ? "down" : "up"}`}>
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="ws-ticker-time">NYSE {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      </div>

      {/* Header */}
      <header className="ws-header">
        <div className="ws-header-inner">
          <div className="ws-logo-block">
            <div className="ws-logo-mark">SX</div>
            <div className="ws-logo-text">
              <div className="ws-logo-title">SOLVEX</div>
              <div className="ws-logo-sub">INSTITUTIONAL MARKETPLACE</div>
            </div>
          </div>
          <div className="ws-header-stats">
            <div className="ws-stat">
              <div className="ws-stat-val">29</div>
              <div className="ws-stat-lbl">PRODUCTS</div>
            </div>
            <div className="ws-stat-divider" />
            <div className="ws-stat">
              <div className="ws-stat-val">$4.2B</div>
              <div className="ws-stat-lbl">CLEARED DAILY</div>
            </div>
            <div className="ws-stat-divider" />
            <div className="ws-stat">
              <div className="ws-stat-val">99.999%</div>
              <div className="ws-stat-lbl">UPTIME SLA</div>
            </div>
            <div className="ws-stat-divider" />
            <div className="ws-stat">
              <div className="ws-stat-val">OSFI</div>
              <div className="ws-stat-lbl">CERTIFIED</div>
            </div>
          </div>
          <button className="ws-cta-btn">OPEN ACCOUNT →</button>
        </div>
      </header>

      {/* Hero Strip */}
      <div className="ws-hero">
        <div className="ws-hero-inner">
          <div className="ws-hero-badge">TIER-1 CANADIAN BANK CERTIFIED</div>
          <h1 className="ws-hero-title">29 PARADOX SOLUTIONS.<br/>ZERO COMPROMISE.</h1>
          <p className="ws-hero-sub">
            Cryptographic proof. Mathematical certainty. Institutional-grade engineering for the world's most demanding financial infrastructure.
          </p>
          <div className="ws-hero-seals">
            <div className="ws-seal">🔐 ZK-PROOF VERIFIED</div>
            <div className="ws-seal">⚖️ OSFI B-13 COMPLIANT</div>
            <div className="ws-seal">🏦 FINTRAC APPROVED</div>
            <div className="ws-seal">🛡️ PIPEDA SOVEREIGN</div>
          </div>
        </div>
        <div className="ws-hero-graph">
          <svg viewBox="0 0 300 120" className="ws-sparkline">
            <polyline points="0,100 30,80 60,90 90,60 120,70 150,40 180,50 210,20 240,30 270,10 300,15"
              fill="none" stroke="#D4AF37" strokeWidth="2.5" />
            <polyline points="0,100 30,80 60,90 90,60 120,70 150,40 180,50 210,20 240,30 270,10 300,15 300,120 0,120"
              fill="url(#gold-grad)" opacity="0.15" />
            <defs>
              <linearGradient id="gold-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
          <div className="ws-graph-label">SOLVEX INDEX  <span className="up">▲ +31.2%</span></div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="ws-filter-bar">
        <div className="ws-filter-inner">
          <div className="ws-filter-label">DOMAIN ›</div>
          {DOMAINS.map(d => (
            <button key={d} onClick={() => setActiveFilter(d)}
              className={`ws-filter-btn ${activeFilter === d ? "active" : ""}`}>
              {d === "ALL" ? "ALL PRODUCTS" : d.toUpperCase()}
            </button>
          ))}
          <div className="ws-filter-count">{filtered.length} PRODUCTS</div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="ws-grid">
        {filtered.map(p => {
          const badge = DOMAIN_BADGES[p.domain];
          const isHovered = hoveredId === p.id;
          return (
            <div key={p.id}
              className={`ws-card ${isHovered ? "hovered" : ""} ${p.tier === "PLATINUM" ? "platinum" : ""}`}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}>

              <div className="ws-card-header">
                <div className="ws-card-id">{p.id}</div>
                <div className="ws-card-tier" style={{ color: p.tier === "PLATINUM" ? "#E5C97E" : "#60A5FA" }}>
                  {p.tier}
                </div>
              </div>

              <div className="ws-card-domain-badge" style={{ borderColor: badge.color, color: badge.color }}>
                {badge.label}
              </div>

              <h3 className="ws-card-name">{p.name}</h3>
              <p className="ws-card-sub">{p.subtitle}</p>

              <div className="ws-card-tag">
                <span className="ws-tag-dot" style={{ background: badge.color }} />
                {p.tag}
              </div>

              <div className="ws-card-metrics">
                <div className="ws-metric">
                  <div className="ws-metric-val">{p.sales}</div>
                  <div className="ws-metric-lbl">DEPLOYMENTS</div>
                </div>
                <div className="ws-metric">
                  <div className="ws-metric-val">99.999%</div>
                  <div className="ws-metric-lbl">SLA</div>
                </div>
                <div className="ws-metric">
                  <div className="ws-metric-val up">✓</div>
                  <div className="ws-metric-lbl">ZK PROVEN</div>
                </div>
              </div>

              <div className="ws-card-price-row">
                <div className="ws-price-eth">{p.priceEth}</div>
                <div className="ws-price-usdc">{p.priceUsdc}</div>
              </div>

              <div className="ws-card-actions">
                <button className="ws-btn-validate">RUN PROOF →</button>
                <button className="ws-btn-buy">ACQUIRE</button>
              </div>

              {p.tier === "PLATINUM" && (
                <div className="ws-platinum-ribbon">APEX BUNDLE</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Strip */}
      <div className="ws-footer-strip">
        <span>SOLVEX INSTITUTIONAL MARKETPLACE</span>
        <span>•</span>
        <span>29 TIER-1 PARADOX SOLUTIONS</span>
        <span>•</span>
        <span>OSFI B-13 CERTIFIED</span>
        <span>•</span>
        <span>IRON MOUNTAIN IP ESCROW</span>
        <span>•</span>
        <span>24/7 PLATINUM SUPPORT</span>
      </div>
    </div>
  );
}
