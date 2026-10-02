import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'

/* ────────────────────────────────────────────
   Design tokens — match DashboardLayout palette
   ──────────────────────────────────────────── */
const GOLD = '#D4AF37'
const BG = '#05080F'
const BG_PANEL = '#0A0F1A'
const FG = '#E0E0E0'
const MUTED = '#6B7280'
const BORDER = '#1A2235'
const ACCENT_DIM = '#162040'
const MONO = '"IBM Plex Mono", "Courier New", monospace'
const SERIF = '"Playfair Display", "Georgia", serif'

/* ────────────────────────────────────────────
   Types & Seed Data
   ──────────────────────────────────────────── */

interface Product {
  id: string
  name: string
  description: string
  category: 'fundamental' | 'operational' | 'ai'
  chamber: number
  priceEth: string
  priceUsd: number
  compliance: string[]
}

const SEED_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Chassis Controller v3.8', description: 'Bare-metal hardware orchestration layer with direct register mapping and DMA ring-buffer pipeline for zero-latency sovereign execution.', category: 'fundamental', chamber: 1, priceEth: '12.5', priceUsd: 42500, compliance: ['OSFI B-13', 'SOC 2', 'NIST 800-53'] },
  { id: 'p2', name: 'Memory Controller', description: 'Deterministic memory space management with compile-time bounds checking and zero-copy buffer allocation across sovereign compute partitions.', category: 'fundamental', chamber: 1, priceEth: '9.8', priceUsd: 33200, compliance: ['SOC 2', 'ISO 27001'] },
  { id: 'p3', name: 'ZK-Rollup Prover SDK', description: 'Recursive zero-knowledge proof generation pipeline with GPU-accelerated witness computation and on-chain verification for L2 settlement.', category: 'fundamental', chamber: 2, priceEth: '28.0', priceUsd: 95200, compliance: ['NIST 800-53', 'GDPR Art. 42'] },
  { id: 'p4', name: 'Threshold Signature Orchestrator', description: 'Distributed key generation and threshold ECDSA/EdDSA signing across enclaves with Byzantine fault tolerance for institutional custody.', category: 'fundamental', chamber: 2, priceEth: '18.4', priceUsd: 62500, compliance: ['CC EAL 5+', 'SOC 2'] },
  { id: 'p5', name: 'Post-Quantum Key Encapsulation Layer', description: 'CRYSTALS-Kyber and Dilithium hybrid KEM with hardware-backed entropy, X.509 integration, and FIPS 140-3 ready module for long-term data protection.', category: 'fundamental', chamber: 3, priceEth: '22.1', priceUsd: 75100, compliance: ['FIPS 140-3', 'NIST 800-53', 'BSI TR-02102'] },
  { id: 'p6', name: 'Homomorphic Encryption Runtime', description: 'Fully homomorphic encryption execution environment supporting TFHE and CKKS schemes with encrypted inference pipelines for privacy-preserving ML.', category: 'fundamental', chamber: 3, priceEth: '35.0', priceUsd: 119000, compliance: ['GDPR', 'HIPAA'] },
  { id: 'p7', name: 'Multi-Party Computation Fabric', description: 'Three-party replicated secret-sharing MPC protocol with active security, sub-millisecond latency for real-time data collaboration across jurisdictions.', category: 'fundamental', chamber: 4, priceEth: '41.2', priceUsd: 140000, compliance: ['OSFI B-13', 'CCPA', 'PDPA'] },
  { id: 'p8', name: 'On-Chain Identity Resolver', description: 'Decentralized identifier registry with BBS+ selective disclosure, W3C VC conformance, and cross-chain resolution across Ethereum, Solana, and Cosmos.', category: 'operational', chamber: 5, priceEth: '6.7', priceUsd: 22800, compliance: ['eIDAS 2.0', 'ISO 18013-7'] },
  { id: 'p9', name: 'Smart Contract Firewall', description: 'Runtime bytecode analysis engine that intercepts and validates EVM calls against policy rules before execution, preventing reentrancy, MEV, and oracle manipulation.', category: 'operational', chamber: 5, priceEth: '14.3', priceUsd: 48600, compliance: ['SOC 2', 'ISO 27001'] },
  { id: 'p10', name: 'Cross-Chain Message Relay', description: 'Light-client based bridge protocol with optimistic verification, 30-minute finality window, and fraud-proof challenge mechanism across 18 L1/L2 networks.', category: 'operational', chamber: 6, priceEth: '19.9', priceUsd: 67700, compliance: ['NIST 800-53', 'ISO 27001'] },
  { id: 'p11', name: 'Real-Time Sanction Screener', description: 'OFAC/SDN/UN compliance engine with sub-millisecond wallet screening, continuous list synchronization, and auditable block/allow decision logging.', category: 'operational', chamber: 6, priceEth: '11.2', priceUsd: 38100, compliance: ['OFAC', 'FATF Rec. 16', 'BSA/AML'] },
  { id: 'p12', name: 'MEV-Boost Relay Network', description: 'PBS relay infrastructure with sealed-bid auction mechanics, proposer-builder separation, and censorship-resistance guarantees for Ethereum validators.', category: 'operational', chamber: 7, priceEth: '25.6', priceUsd: 87100, compliance: ['OFAC', 'MiCA Art. 76'] },
  { id: 'p13', name: 'Regulatory Reporting Engine', description: 'Automated MiCA/FinCEN/ESMA report generation from on-chain events with XBRL taxonomy mapping, jurisdictional rule engine, and scheduled filing dispatch.', category: 'operational', chamber: 7, priceEth: '8.9', priceUsd: 30300, compliance: ['MiCA', 'FinCEN', 'ESMA'] },
  { id: 'p14', name: 'Validator Performance Analytics', description: 'Staking operations dashboard with slashing risk prediction, MEV reward attribution, client diversity scoring, and 90-day yield forecasting across consensus clients.', category: 'operational', chamber: 8, priceEth: '5.4', priceUsd: 18400, compliance: ['SOC 2'] },
  { id: 'p15', name: 'Liquidity Fragmentation Solver', description: 'Intent-based cross-venue liquidity aggregation with solvers competing for optimal execution across AMMs, CLOBs, and RFQ platforms in a single atomic transaction.', category: 'operational', chamber: 8, priceEth: '16.8', priceUsd: 57200, compliance: ['MiFID II', 'SEC Reg ATS'] },
  { id: 'p16', name: 'Algorithmic Governance Module', description: 'On-chain proposal lifecycle manager with conviction voting, delegation graphs, quadratic funding allocation, and timelock-enforced execution for DAOs and protocol upgrades.', category: 'ai', chamber: 9, priceEth: '7.3', priceUsd: 24800, compliance: ['GDPR', 'EU AI Act'] },
  { id: 'p17', name: 'LLM Inference Oracle Network', description: 'Decentralized oracle cluster running fine-tuned LLaMA-3 and Mistral models inside TEEs with consensus on inference output for smart contract consumption.', category: 'ai', chamber: 9, priceEth: '31.5', priceUsd: 107000, compliance: ['EU AI Act', 'NIST AI RMF', 'SOC 2'] },
  { id: 'p18', name: 'Autonomous Agent Sandbox', description: 'Isolated execution environment for AI agents with resource caps, permissioned wallet access, human-in-the-loop breakpoints, and deterministic replay for auditability.', category: 'ai', chamber: 10, priceEth: '13.7', priceUsd: 46600, compliance: ['EU AI Act Art. 14', 'NIST AI RMF'] },
  { id: 'p19', name: 'Model Provenance Registry', description: 'Immutable training data lineage tracker with cryptographic hashing of datasets, model weights, and hyperparameters — verifiable from ingestion to deployment.', category: 'ai', chamber: 10, priceEth: '10.2', priceUsd: 34700, compliance: ['EU AI Act', 'ISO 42001', 'NIST AI RMF'] },
  { id: 'p20', name: 'Adversarial Robustness Scanner', description: 'Continuous red-teaming pipeline generating synthetic attacks against deployed models with SHAP explainability reports and auto-generated mitigation patches.', category: 'ai', chamber: 11, priceEth: '17.9', priceUsd: 60900, compliance: ['EU AI Act', 'NIST AI RMF', 'ISO 42001'] },
  { id: 'p21', name: 'Privacy-Preserving Federated Learner', description: 'Federated learning orchestrator with differential privacy guarantees (ε < 1), secure aggregation via MPC, and Byzantine-resilient gradient filtering for multi-party model training.', category: 'ai', chamber: 11, priceEth: '26.3', priceUsd: 89400, compliance: ['GDPR', 'HIPAA', 'EU AI Act'] },
  { id: 'p22', name: 'Prompt Injection Guard', description: 'Multi-layer prompt sanitization engine with semantic boundary detection, context isolation, and real-time anomaly scoring for LLM-integrated applications.', category: 'ai', chamber: 12, priceEth: '4.8', priceUsd: 16300, compliance: ['OWASP LLM Top 10', 'SOC 2'] },
  { id: 'p23', name: 'AI Policy Compliance Auditor', description: 'Continuous monitoring agent that evaluates LLM outputs against regulatory policy documents, flagging non-conformant generations with citation-backed violation reports.', category: 'ai', chamber: 12, priceEth: '9.1', priceUsd: 31000, compliance: ['EU AI Act', 'NIST AI RMF', 'GDPR'] },
  { id: 'p24', name: 'Synthetic Data Generator', description: 'Differential-privacy-guaranteed synthetic dataset generation from sensitive production data, preserving statistical properties while eliminating re-identification risk.', category: 'ai', chamber: 13, priceEth: '15.6', priceUsd: 53100, compliance: ['GDPR Art. 29', 'HIPAA', 'ISO 27701'] },
  { id: 'p25', name: 'Decentralized Compute Marketplace', description: 'GPU/TPU spot-market protocol with verifiable compute proofs, slashing for underperformance, and dynamic pricing based on real-time cluster utilization.', category: 'operational', chamber: 13, priceEth: '20.0', priceUsd: 68000, compliance: ['SOC 2', 'ISO 27001'] },
  { id: 'p26', name: 'ZK-KYC Credential Issuer', description: 'Self-sovereign KYC attestation issuance with zero-knowledge proofs enabling selective attribute disclosure — prove age/citizenship without revealing identity.', category: 'fundamental', chamber: 14, priceEth: '11.8', priceUsd: 40100, compliance: ['eIDAS 2.0', 'GDPR', 'FATF Rec. 15'] },
  { id: 'p27', name: 'Governance Analytics Dashboard', description: 'Multi-DAO governance intelligence with voting power concentration metrics, proposal success prediction models, and delegation network visualization.', category: 'ai', chamber: 14, priceEth: '6.0', priceUsd: 20400, compliance: ['SOC 2'] },
]

/* ────────────────────────────────────────────
   Filter groups
   ──────────────────────────────────────────── */

type FilterGroup = 'ALL' | 'ZK & CRYPTOGRAPHY' | 'HFT & COMPLIANCE' | 'AI & GOVERNANCE'

const FILTER_MAP: Record<FilterGroup, Product['category'][]> = {
  'ALL': ['fundamental', 'operational', 'ai'],
  'ZK & CRYPTOGRAPHY': ['fundamental'],
  'HFT & COMPLIANCE': ['operational'],
  'AI & GOVERNANCE': ['ai'],
}

const FILTERS: FilterGroup[] = ['ALL', 'ZK & CRYPTOGRAPHY', 'HFT & COMPLIANCE', 'AI & GOVERNANCE']

/* ────────────────────────────────────────────
   Domain badge config
   ──────────────────────────────────────────── */

const DOMAIN_BADGE: Record<Product['category'], { label: string; bg: string; text: string; border: string }> = {
  fundamental: { label: 'ZK-CRYPTO', bg: 'rgba(212,175,55,0.10)', text: GOLD, border: '1px solid rgba(212,175,55,0.35)' },
  operational: { label: 'OPS-CORE', bg: 'rgba(100,180,255,0.10)', text: '#64B4FF', border: '1px solid rgba(100,180,255,0.35)' },
  ai: { label: 'AI-GOV', bg: 'rgba(168,85,247,0.10)', text: '#A855F7', border: '1px solid rgba(168,85,247,0.35)' },
}

/* ────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────── */

function FloorStatsBar() {
  const lots = SEED_PRODUCTS.length
  const avgEth = (SEED_PRODUCTS.reduce((s, p) => s + parseFloat(p.priceEth), 0) / lots).toFixed(1)
  const avgUsd = Math.round(SEED_PRODUCTS.reduce((s, p) => s + p.priceUsd, 0) / lots)
  const chambers = new Set(SEED_PRODUCTS.map((p) => p.chamber)).size
  const complianceCount = new Set(SEED_PRODUCTS.flatMap((p) => p.compliance)).size

  const stats = [
    { label: 'Total Lots', value: lots },
    { label: 'Avg Price', value: `Ξ${avgEth} / $${avgUsd.toLocaleString()}` },
    { label: 'Chamber Coverage', value: `${chambers} Chambers` },
    { label: 'Compliance Badges', value: `${complianceCount} Frameworks`, accent: '#64B4FF' },
  ]

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap',
      borderBottom: `1px solid ${BORDER}`,
      background: BG_PANEL,
    }}>
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{
            padding: '12px 20px',
            borderRight: i < stats.length - 1 ? `1px solid ${BORDER}` : 'none',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: MUTED, textTransform: 'uppercase' }}>
            {s.label}
          </span>
          <span style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: (s as any).accent ?? GOLD }}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const badge = DOMAIN_BADGE[product.category]

  return (
    <div
      style={{
        background: BG_PANEL,
        border: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column', gap: 16,
        padding: 24,
        transition: 'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
        animation: `fadeInCard 0.35s ease-out both`,
        animationDelay: `${Math.min(index * 30, 300)}ms`,
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.4)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(212,175,55,0.06)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = BORDER
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
    >
      {/* Badge row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          display: 'inline-block', fontFamily: MONO, fontSize: 8, fontWeight: 700,
          letterSpacing: '0.15em', padding: '3px 10px',
          background: badge.bg, color: badge.text, border: badge.border,
        }}>
          {badge.label}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>
          CHAMBER {String(product.chamber).padStart(2, '0')}
        </span>
      </div>

      {/* Name */}
      <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: GOLD, lineHeight: 1.35, margin: 0 }}>
        {product.name}
      </h3>

      {/* Description */}
      <p style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.7, color: 'rgba(200,210,225,0.65)', margin: 0 }}>
        {product.description}
      </p>

      <div style={{ flex: 1 }} />

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: GOLD }}>Ξ{product.priceEth}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>${product.priceUsd.toLocaleString()} USD</span>
      </div>

      <div style={{ height: 1, background: BORDER }} />

      {/* Compliance badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {product.compliance.map((c) => (
          <span key={c} style={{
            fontFamily: MONO, fontSize: 8, letterSpacing: '0.04em', padding: '2px 7px',
            background: ACCENT_DIM, color: MUTED, border: `1px solid ${BORDER}`,
          }}>
            {c}
          </span>
        ))}
      </div>

      {/* CTA */}
      <a
        href={`/product/${product.id}`}
        style={{
          fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
          color: GOLD, textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
          gap: 6, transition: 'gap 0.2s ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.gap = '12px' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.gap = '6px' }}
      >
        VIEW LOT DETAILS →
      </a>
    </div>
  )
}

/* ────────────────────────────────────────────
   Keyframes (injected via <style>)
   ──────────────────────────────────────────── */

const PAGE_KEYFRAMES = `
@keyframes fadeInCard {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
  }
}
`

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export const Route = createFileRoute('/marketplace')({
  head: () => ({
    meta: [{ title: 'Showroom Floor · SolveX' }],
  }),
  component: Marketplace,
})

function Marketplace() {
  const [activeTab, setActiveTab] = useState<'SHOWROOM FLOOR' | 'SOLVED PARADOXES'>('SHOWROOM FLOOR')
  const [activeFilter, setActiveFilter] = useState<FilterGroup>('ALL')

  const filteredProducts = useMemo(() => {
    const cats = FILTER_MAP[activeFilter]
    return SEED_PRODUCTS.filter((p) => cats.includes(p.category))
  }, [activeFilter])

  return (
    <DashboardLayout>
      <style>{PAGE_KEYFRAMES}</style>

      {/* ── Page marquee ── */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{
          whiteSpace: 'nowrap', animation: 'marquee 28s linear infinite',
          padding: '8px 0',
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em',
          color: 'rgba(212,175,55,0.45)', textTransform: 'uppercase',
        }}>
          {'SOLVEX · THE SHOWROOM FLOOR · 105 LOTS ON DISPLAY · '}
          {'SOLVEX · THE SHOWROOM FLOOR · 105 LOTS ON DISPLAY · '}
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ padding: '40px 32px 28px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: SERIF, fontSize: 'clamp(28px, 4.5vw, 50px)', fontWeight: 700,
          color: GOLD, lineHeight: 1.15, letterSpacing: '-0.01em', margin: 0,
        }}>
          The Finest Solutions,
          <br />
          On the Floor.
        </h1>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        borderBottom: `1px solid ${BORDER}`,
        margin: '0 32px',
      }}>
        {(['SHOWROOM FLOOR', 'SOLVED PARADOXES'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              padding: '12px 28px',
              color: activeTab === tab ? GOLD : MUTED,
              background: 'transparent', border: 'none',
              borderBottom: activeTab === tab ? `2px solid ${GOLD}` : '2px solid transparent',
              cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s',
              textTransform: 'uppercase',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Floor Stats ── */}
      <FloorStatsBar />

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
        gap: 8, padding: '24px 32px 8px',
      }}>
        {FILTERS.map((f) => {
          const active = activeFilter === f
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                padding: '7px 16px', textTransform: 'uppercase',
                color: active ? BG : 'rgba(212,175,55,0.65)',
                background: active ? GOLD : ACCENT_DIM,
                border: active ? `1px solid ${GOLD}` : `1px solid ${BORDER}`,
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.08)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.35)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = ACCENT_DIM
                  ;(e.currentTarget as HTMLElement).style.borderColor = BORDER
                }
              }}
            >
              {f}
            </button>
          )
        })}
      </div>

      {/* ── Product Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
        gap: 18,
        padding: 28,
        flex: 1,
      }}>
        {filteredProducts.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>

      {/* ── Count footer ── */}
      <div style={{
        padding: '24px 32px', textAlign: 'center',
        borderTop: `1px solid ${BORDER}`,
      }}>
        <span style={{
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em',
          color: MUTED, textTransform: 'uppercase',
        }}>
          {filteredProducts.length} OF {SEED_PRODUCTS.length} LOTS DISPLAYED · SOLVEX PARADOX BOX
        </span>
      </div>
    </DashboardLayout>
  )
}
