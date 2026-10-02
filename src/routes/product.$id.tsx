import { createFileRoute, Link } from '@tanstack/react-router'
import { DashboardLayout } from '@/components/DashboardLayout'

const GOLD = '#D4AF37'
const BG = '#05080F'
const MUTED = '#6B7280'
const BORDER = '#1A2235'
const MONO = '"IBM Plex Mono", monospace'
const SERIF = '"Playfair Display", serif'

const CATEGORY_META: Record<string, { badge: string; color: string }> = {
  fundamental: { badge: 'ZK-CRYPTOGRAPHY', color: '#00D4FF' },
  operational: { badge: 'OPERATIONAL-CORE', color: '#FFD700' },
  ai: { badge: 'AI GOVERNANCE', color: '#A78BFA' },
}

interface Product {
  id: string; name: string; description: string; category: 'fundamental' | 'operational' | 'ai'
  chamber: number; priceEth: string; priceUsd: number; compliance: string[]
}

const PRODUCTS: Product[] = [
  { id: "p1", name: "Chassis Controller v3.8", description: "Bare-metal hardware orchestration layer with direct register mapping and DMA ring-buffer pipeline for zero-latency sovereign execution.", category: "fundamental", chamber: 1, priceEth: "12.5", priceUsd: 42500, compliance: ["OSFI B-13", "SOC 2", "NIST 800-53"] },
  { id: "p2", name: "Memory Controller", description: "Deterministic memory space management with compile-time bounds checking and zero-copy buffer allocation across sovereign compute partitions.", category: "fundamental", chamber: 1, priceEth: "9.8", priceUsd: 33200, compliance: ["SOC 2", "ISO 27001"] },
  { id: "p3", name: "Consensus Engine v2", description: "Autonomous multi-region consensus middleware resolving distributed data-sprawl paradoxes without split-brain anomalies.", category: "operational", chamber: 2, priceEth: "18.2", priceUsd: 61800, compliance: ["NIST 800-53", "SOC 2", "OSFI B-13"] },
  { id: "p4", name: "Deterministic Clock Sync", description: "Enforces absolute chronological ordering of sovereign transactions without external NTP dependencies.", category: "operational", chamber: 2, priceEth: "7.4", priceUsd: 25100, compliance: ["ISO 27001"] },
  { id: "p5", name: "dAIsy haMINJA Sentinel", description: "Autonomous sovereign AI brain governing marketplace operations, paradox resolution, and self-healing execution.", category: "ai", chamber: 5, priceEth: "45.0", priceUsd: 153000, compliance: ["OSFI B-13", "SOC 2", "NIST 800-53", "PIPEDA"] },
  { id: "p6", name: "Compliance Enclave", description: "Automated continuous verification and self-documenting audit telemetry for regulatory frameworks.", category: "ai", chamber: 5, priceEth: "22.0", priceUsd: 74800, compliance: ["SOC 2", "ISO 27001", "NIST 800-53"] },
  { id: "p7", name: "TECOE Pipeline Engine", description: "Text-Tethering Extraction & Compilation Engine for autonomous solution synthesis from raw terminal matrices.", category: "ai", chamber: 3, priceEth: "28.5", priceUsd: 96900, compliance: ["OSFI B-13", "NIST 800-53"] },
  { id: "p8", name: "Zero-Sandbox Access", description: "Resides at the binary level, bypassing secondary OS system calls for latency-free hardware orchestration.", category: "fundamental", chamber: 4, priceEth: "15.0", priceUsd: 51000, compliance: ["SOC 2", "ISO 27001"] },
  { id: "p9", name: "Black Box Vault", description: "Non-custodial, offline-first security enclaves using military-grade cryptographic hashing and local-only ephemeral memory.", category: "fundamental", chamber: 4, priceEth: "32.0", priceUsd: 108800, compliance: ["OSFI B-13", "SOC 2", "NIST 800-53", "FINTRAC"] },
  { id: "p10", name: "Envoy Protocol Suite", description: "End-to-end encrypted outbound communication layer for sovereign data transmission with zero interception surface.", category: "operational", chamber: 1, priceEth: "11.2", priceUsd: 38000, compliance: ["SOC 2", "PIPEDA"] },
  { id: "p11", name: "IRS-First Rule Engine", description: "Sequences 21% corporate tax sequestration to EFTPS before any revenue is classified as operating capital.", category: "operational", chamber: 5, priceEth: "8.9", priceUsd: 30200, compliance: ["OSFI B-13", "FINTRAC"] },
  { id: "p12", name: "Crystal Clear Glass Box", description: "Complete environmental observability layer — every system state change logged to omniscient terminal with cryptographic attestation.", category: "fundamental", chamber: 1, priceEth: "19.7", priceUsd: 66900, compliance: ["NIST 800-53", "SOC 2", "OSFI B-13"] },
  { id: "p13", name: "Lamport Sequence Engine", description: "Combines physical clock offsets with logical Lamport timestamps to maintain transactional causality under partition.", category: "operational", chamber: 2, priceEth: "6.3", priceUsd: 21400, compliance: ["ISO 27001"] },
  { id: "p14", name: "ZK-SNARK Prover", description: "Proves code compliance mathematically without exposing proprietary source code. Groth16 + AST analysis pipeline.", category: "fundamental", chamber: 1, priceEth: "24.0", priceUsd: 81600, compliance: ["OSFI B-13", "SOC 2", "NIST 800-53"] },
  { id: "p15", name: "FHE Computation Layer", description: "Fully Homomorphic Encryption circuit manager — max computation depth before ciphertext noise budget exhaustion.", category: "fundamental", chamber: 4, priceEth: "40.5", priceUsd: 137700, compliance: ["SOC 2", "NIST 800-53", "PIPEDA"] },
  { id: "p16", name: "Autonomic Healer", description: "Self-healing micro-service restart loop — recovers crashed services within 10ms of fault detection.", category: "ai", chamber: 3, priceEth: "16.8", priceUsd: 57100, compliance: ["SOC 2", "ISO 27001"] },
  { id: "p17", name: "Pheromone Mesh Router", description: "Digital signal pulse attractor/repulsion protocol for self-optimizing ad-hoc mesh network pathfinding.", category: "ai", chamber: 2, priceEth: "14.1", priceUsd: 47900, compliance: ["NIST 800-53"] },
  { id: "p18", name: "Chrono-Compaction Node", description: "Compresses distributed state sprawl into atomic, non-interactive ZK-verified chronological ledger blocks.", category: "operational", chamber: 5, priceEth: "21.3", priceUsd: 72400, compliance: ["OSFI B-13", "SOC 2", "NIST 800-53", "FINTRAC"] },
  { id: "p19", name: "Sovereign Epoch Guard", description: "Enforces clean epoch transitions for ledger checkpointing without interrupting live transaction pipelines.", category: "operational", chamber: 4, priceEth: "10.5", priceUsd: 35700, compliance: ["ISO 27001", "SOC 2"] },
  { id: "p20", name: "Gossip Sync Protocol", description: "Epidemic-style state synchronization across the sovereign mesh with dynamic fan-out throttling.", category: "operational", chamber: 3, priceEth: "9.1", priceUsd: 30900, compliance: ["NIST 800-53"] },
  { id: "p21", name: "Cognitive Memory Brancher", description: "Clones application states into parallel memory branches for risk-free sandbox testing with zero-downtime reintegration.", category: "ai", chamber: 3, priceEth: "26.7", priceUsd: 90700, compliance: ["SOC 2", "ISO 27001", "OSFI B-13"] },
  { id: "p22", name: "Byzantine Validator", description: "Guarantees correct transaction execution even with up to one-third malicious cluster nodes — one-slot finality.", category: "operational", chamber: 4, priceEth: "35.0", priceUsd: 119000, compliance: ["NIST 800-53", "SOC 2", "FINTRAC"] },
  { id: "p23", name: "Fractal Consensus Core", description: "Establishes fast, localized agreement among nested node clusters before propagating updates to the wider mesh.", category: "fundamental", chamber: 2, priceEth: "13.8", priceUsd: 46900, compliance: ["OSFI B-13", "SOC 2"] },
  { id: "p24", name: "NIST Gate Enforcer", description: "Continuous NIST SP 800-53 control verification — never degrades transaction pipeline frequency.", category: "ai", chamber: 5, priceEth: "17.2", priceUsd: 58400, compliance: ["NIST 800-53", "SOC 2", "OSFI B-13"] },
  { id: "p25", name: "Predictive Failure Engine", description: "Monitors hardware health trends to migrate critical workloads away from failing nodes before they crash.", category: "ai", chamber: 4, priceEth: "20.9", priceUsd: 71000, compliance: ["SOC 2", "ISO 27001"] },
  { id: "p26", name: "AODV Mesh Core", description: "Establishes dynamic, self-healing routing tunnels through shifting networks of neighboring sovereign nodes.", category: "operational", chamber: 3, priceEth: "11.6", priceUsd: 39400, compliance: ["NIST 800-53"] },
  { id: "p27", name: "Sovereign Homeostasis Monitor", description: "Continuously evaluates overall system health metrics — triggers self-healing protocols as needed.", category: "ai", chamber: 5, priceEth: "30.0", priceUsd: 102000, compliance: ["OSFI B-13", "SOC 2", "NIST 800-53", "PIPEDA"] },
]

export const Route = createFileRoute('/product/$id')({
  head: ({ params }) => {
    const product = PRODUCTS.find(p => p.id === params.id)
    return {
      meta: [
        { title: `${product?.name ?? 'Product'} · SolveX Paradox Box` },
        { name: 'description', content: product?.description?.slice(0, 160) ?? 'Enterprise solution from the SolveX Showroom Floor.' },
      ],
    }
  },
  component: ProductDetail,
})

function ProductDetail() {
  const { id } = Route.useParams()
  const product = PRODUCTS.find(p => p.id === id)

  if (!product) {
    return (
      <DashboardLayout>
        <div style={{ padding: 64, textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontSize: 32, color: GOLD, marginBottom: 16 }}>Lot Not Found</div>
          <Link to="/marketplace" style={{ fontFamily: MONO, fontSize: 12, color: GOLD, textDecoration: 'underline' }}>
            ← RETURN TO SHOWROOM FLOOR
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const meta = CATEGORY_META[product.category] ?? { badge: 'GENERAL', color: GOLD }

  return (
    <DashboardLayout>
      <div style={{ minHeight: '100vh', padding: '40px 48px', maxWidth: 1000 }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: 32 }}>
          <Link to="/marketplace" style={{ fontFamily: MONO, fontSize: 9, color: MUTED, textDecoration: 'none', letterSpacing: '0.15em' }}>
            ← SHOWROOM FLOOR
          </Link>
        </div>

        {/* Domain badge */}
        <div style={{
          display: 'inline-block', fontFamily: MONO, fontSize: 9, fontWeight: 700,
          letterSpacing: '0.15em', color: meta.color, border: `1px solid ${meta.color}44`,
          background: `${meta.color}0D`, padding: '4px 12px', marginBottom: 20,
        }}>
          {meta.badge} · CHAMBER {product.chamber}
        </div>

        {/* Product Name */}
        <h1 style={{ fontFamily: SERIF, fontSize: 42, fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 16, marginTop: 0 }}>
          {product.name}
        </h1>

        {/* Description */}
        <p style={{ fontFamily: MONO, fontSize: 12, color: '#A0ABC0', lineHeight: 1.8, marginBottom: 28, maxWidth: 700 }}>
          {product.description}
        </p>

        {/* Price */}
        <div style={{
          border: `1px solid ${BORDER}`, background: BG, padding: 24, marginBottom: 32,
          display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.2em', marginBottom: 6 }}>PRICE (ETH)</div>
            <div style={{ fontFamily: SERIF, fontSize: 32, color: GOLD, fontWeight: 900 }}>Ξ {product.priceEth}</div>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.2em', marginBottom: 6 }}>PRICE (USD)</div>
            <div style={{ fontFamily: SERIF, fontSize: 28, color: 'white', fontWeight: 700 }}>${product.priceUsd.toLocaleString()}</div>
          </div>
        </div>

        {/* Payment */}
        <div style={{
          border: `1px solid #0070BA`, background: 'rgba(0,112,186,0.06)', padding: 24, marginBottom: 32,
          display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.2em', marginBottom: 6 }}>SECURE PAYMENT</div>
            <div style={{ fontFamily: SERIF, fontSize: 22, color: '#0070BA', fontWeight: 700 }}>PayPal</div>
          </div>
          <a href="https://paypal.me/tjites" target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-block', padding: '14px 36px',
            background: '#0070BA', color: '#FFFFFF',
            fontFamily: MONO, fontSize: 11, fontWeight: 900, letterSpacing: '0.15em',
            textDecoration: 'none', border: 'none', cursor: 'pointer',
          }}>
            PAY WITH PAYPAL →
          </a>
        </div>

        {/* Compliance */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.2em', marginBottom: 10 }}>COMPLIANCE CERTIFICATIONS</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {product.compliance.map(c => (
              <span key={c} style={{
                fontFamily: MONO, fontSize: 9, color: '#34D399', border: '1px solid rgba(52,211,153,0.25)',
                padding: '4px 12px', background: 'rgba(52,211,153,0.04)',
              }}>✓ {c}</span>
            ))}
          </div>
        </div>

        {/* Specs */}
        <div style={{ border: `1px solid ${BORDER}`, padding: 24 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.2em', marginBottom: 16 }}>TECHNICAL SPECIFICATIONS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: 'DOMAIN', value: meta.badge },
              { label: 'CHAMBER', value: `CHAMBER ${product.chamber}` },
              { label: 'CATEGORY', value: product.category.toUpperCase() },
              { label: 'SOLUTION ID', value: `SOLVEX-${product.id.toUpperCase()}` },
              { label: 'DELIVERY', value: 'IMMEDIATE · AUTONOMOUS' },
              { label: 'SUPPORT', value: 'dAIsy haMINJA 24/7/365' },
            ].map(spec => (
              <div key={spec.label}>
                <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.12em', marginBottom: 4 }}>{spec.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: GOLD, fontWeight: 700 }}>{spec.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 28 }}>
          <Link to="/marketplace" style={{
            display: 'inline-block', padding: '14px 36px', background: `linear-gradient(135deg, ${GOLD}, #B8860B)`,
            color: BG, fontFamily: MONO, fontSize: 11, fontWeight: 900, letterSpacing: '0.18em',
            textDecoration: 'none',
          }}>
            ← RETURN TO SHOWROOM FLOOR
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
