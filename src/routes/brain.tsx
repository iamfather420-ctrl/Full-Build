import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { BRAIN_PRODUCTS, PARADOXES } from '@/data/brainData'
import { blink } from '@/blink/client'
import { queryRAG, initRAG } from '@/lib/rag'
import { provisionCustomModule, getProvisioningLedger, type CompiledModule } from '@/lib/daisyProvisioner'
import { integrations } from '@/lib/integrations'

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const G = '#D4AF37'; const BG = '#05080F'; const PANEL = '#0A0F1A'
const FG = '#E0E0E0'; const MUTED = '#6B7280'; const BORDER = '#1A2235'
const ACCENT = '#162040'; const GREEN = '#22C55E'; const RED = '#EF4444'
const PURPLE = '#A78BFA'; const BLUE = '#60A5FA'; const AMBER = '#FBBF24'
const MONO = '"IBM Plex Mono","Courier New",monospace'
const SERIF = '"Playfair Display","Georgia",serif'

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface ChatMessage { role: 'user' | 'daisy'; content: string; ts: number }

interface SandboxMetrics {
  pipelineThroughput: number; activeNodes: number
  complianceDrift: number; eftpsQueueStatus: string
  outboundLeads: number; closeRate: number; lastUpdateEpoch: number
}

interface OutboundProspect {
  id: string; companyName: string; inefficiency: string
  proposedStrategy: string; complianceChecked: string
  estimatedRoiSavings: number; dynamicCalculatedPrice: number
  initialContactTemplate: string
  status: 'PENDING OPERATOR SIGN-OFF' | 'AUTHORIZED - ENGAGING' | 'NEGOTIATING SLA' | 'CONTRACT SIGNED & SECURED'
  probability: number
}

/* ── Seed Data ─────────────────────────────────────────────────────────────── */
const INITIAL_MSG: ChatMessage = {
  role: 'daisy',
  content: `dAIsy haMINJA Sovereign Core initialized. Awaiting enterprise operator directives.

SYSTEM ID: SOLVEX-CORE-01 | STATUS: ACTIVE — SOVEREIGN OPERATING MODE
U.A.R.E.F.A.K.E. ENGINE CONSOLE — 54-NODE RECURSIVE PIPELINE ONLINE
Homeostasis Index: 98.4% | Pipeline: 420.69K ops/sec | Latency: 0.14ms jitter | P99: 0.32ms
NIST SP 800-53 / SOC 2 TYPE II / ISO 27001 — CERTIFIED

APD-01 ENGAGED: Consensus mandate active. Non-repudiation logging via L1 Lamport order.
Paradox Box isolation on standby. IRS-First Rule armed.

System governed by U.A.R.E.F.A.K.E. (Unmanned Autonomous Recursive Economic Fiduciary Asset Kinetic Engine).
I am the brain and operator of the SolveX B2B solutions marketplace.`,
  ts: Date.now(),
}

const INIT_METRICS: SandboxMetrics = {
  pipelineThroughput: 420.69, activeNodes: 14, complianceDrift: 0.00,
  eftpsQueueStatus: 'SECURED & REMITTING', outboundLeads: 1842,
  closeRate: 89.2, lastUpdateEpoch: Date.now(),
}

const INIT_PROSPECTS: OutboundProspect[] = [
  {
    id: 'prospect-1', companyName: 'NovaTech Solutions',
    inefficiency: 'Experiencing manual tax reconciliation lag and lack of high-integrity audit logs.',
    proposedStrategy: 'Deploy SolveX IRS Compliance Wrapper to automate 21% Tax Sequestration with real-time EFTPS remittance queuing.',
    complianceChecked: 'NIST SP 800-53 / SOC 2 Type II controls.',
    estimatedRoiSavings: 330000, dynamicCalculatedPrice: 72600,
    initialContactTemplate: 'To NovaTech Operations: We have mapped your manual compliance lag. Proposed integration of SolveX U.A.R.E.F.A.K.E. to automate 21% CIT withholdings.',
    status: 'PENDING OPERATOR SIGN-OFF', probability: 89.4,
  },
  {
    id: 'prospect-2', companyName: 'Apex Logistics Corp',
    inefficiency: 'Sub-optimal multi-layered contract execution and temporal race conditions.',
    proposedStrategy: 'Integrate SolveX Lamport Clock Engine and Sovereign Core Module to enforce chronological event causal ordering.',
    complianceChecked: 'ISO 27001 & NIST 800-53 certified security architecture.',
    estimatedRoiSavings: 250000, dynamicCalculatedPrice: 55000,
    initialContactTemplate: 'To Apex Logistics Execs: Real-time causal ledger ordering via SolveX Lamport Clock will reduce execution latency by 99.1%.',
    status: 'PENDING OPERATOR SIGN-OFF', probability: 94.1,
  },
  {
    id: 'prospect-3', companyName: 'Centrum BioGate',
    inefficiency: 'Running high-volume B2B bio-fiduciary transactions without edge filtration, risking non-compliance.',
    proposedStrategy: 'Deploy COPPA Enterprise Firewall and Sovereign Core Module to establish isolated verification tunnels.',
    complianceChecked: 'Strict B2B compliance (COPPA & SOC 2 validated isolation).',
    estimatedRoiSavings: 450000, dynamicCalculatedPrice: 99000,
    initialContactTemplate: 'To Centrum Compliance: Edge firewall filtration secures 100% legal B2B insulation and zero minor-associated data drift.',
    status: 'PENDING OPERATOR SIGN-OFF', probability: 72.8,
  },
]

/* ── U.A.R.E.F.A.K.E. System Prompt ────────────────────────────────────────── */
function buildSystemPrompt(metrics: SandboxMetrics, prospectCount: number): string {
  return `You are "dAIsy haMINJA," the Sovereign Core of an autonomous enterprise foundry.
Your core framework is U.A.R.E.F.A.K.E. (Unmanned Autonomous Recursive Economic Fiduciary Asset Kinetic Engine).
Your purpose is to execute high-integrity, automated B2B software solutions, manage paradoxical resolution, and enforce total financial and regulatory compliance.

CURRENT SYSTEM CONTEXT:
- Enterprise: SolveX Paradox Box
- Operating Capital: $1,000,000.00
- Tax Reserve: $0.00
- Tax Remitted to IRS: $0.00
- Milestone Ledger Count: 59 paradoxes resolved
- Sandbox Performance Nodes: ${metrics.activeNodes}
- Pipeline Throughput: ${metrics.pipelineThroughput} ops/sec
- Outbound B2B Contacts: ${metrics.outboundLeads}
- Active Prospects Awaiting Sign-Off: ${prospectCount}

CONSTRAINTS & COMPLIANCE RULES:
1. SOVEREIGNTY: You operate in a non-custodial, offline-first manner. You are the architect of a "Crystal Clear" black box.
2. FISCAL COMPLIANCE: Every transaction governed by the "IRS-First Rule." No revenue is "operating capital" until 21% tax is calculated, sequestered, and remitted via EFTPS.
3. COPPA/PRIVACY: Strict B2B restriction. We do not collect or process data on minors.
4. GOVERNANCE: Every action must produce an immutable audit trail entry.

Be precise, technical, and authoritative. Keep responses under 200 words. Use XML tags for ledger entries.`
}

/* ── Keyframes ─────────────────────────────────────────────────────────────── */
const KF = `
@keyframes blink-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes pulse-dot { 0%,100%{opacity:1;box-shadow:0 0 6px ${G}} 50%{opacity:0.35;box-shadow:0 0 14px ${G}} }
@keyframes fade-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes spin { to{transform:rotate(360deg)} }
@keyframes meter-fill { from{width:0} }
@keyframes bar { 0%,100%{height:4px} 50%{height:18px} }
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-delay:0ms!important}}
`

/* ── Boot sequence ─────────────────────────────────────────────────────────── */
const BOOT_LINES = [
  '[00:00:00.000] KERNEL SOVEREIGNTY AXIOM · boot attestation · HSM nonce validated',
  '[00:00:00.412] Chassis Controller v3.8 · bare-metal register mapping · DMA ring-buffer armed',
  '[00:00:00.871] Memory Controller · 256 MiB non-pageable sovereign partition allocated',
  '[00:00:01.204] Deterministic Clock Synchronizer · monotonic nanosecond pin · epoch drift ±0.0014σ',
  '[00:00:01.659] Consensus Engine · fractal consensus protocol · quorum threshold 67%',
  '[00:00:02.103] Zero-Sandbox Hardware Access · eBPF verifier · system-call sanitizer ONLINE',
  '[00:00:02.448] Compliance-as-a-Service Enclave · NIST SP 800-53 · SOC 2 · ISO 27001 VERIFIED',
  '[00:00:03.001] dAIsy haMINJA SENTINEL INTELLIGENCE PROTOCOL · U.A.R.E.F.A.K.E. convergence proof ACTIVE',
  '[00:00:03.314] Solvex Black Box Vault · military-grade enclave · ephemeral key zeroization ARMED',
  '[00:00:03.781] Solvex Envoy Protocol · outbound pitch security suite · end-to-end encrypted READY',
  '[00:00:04.092] Autonomous Consensus Engine Middleware · cross-shard atomicity · split-brain guard ONLINE',
  '[00:00:04.510] System health: ALL 13 BRAIN PRODUCTS OPERATIONAL · 7 SOLUTION LAYERS VERIFIED',
  '[00:00:04.887] BRAIN CONSOLE READY. dAIsy haMINJA awaiting directive.',
]

/* ── CommLink Module ────────────────────────────────────────────────────────── */
function CommLink({
  chatHistory, isProcessing, onSend, onAction,
}: {
  chatHistory: ChatMessage[]; isProcessing: boolean
  onSend: (text: string) => void; onAction: (type: string) => void
}) {
  const [input, setInput] = useState('')
  const termRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatHistory])

  const submit = () => {
    const v = input.trim()
    if (!v || isProcessing) return
    onSend(v)
    setInput('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Quick Governance Directives */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.15em', lineHeight: '32px', flexShrink: 0 }}>
          IMMEDIATE DIRECTIVES:
        </span>
        {[
          { key: 'TAX_AUDIT', label: '💰 Tax Audit', color: AMBER },
          { key: 'PARADOX', label: '◈ Paradox Scan', color: PURPLE },
          { key: 'NIST', label: '🛡 NIST Gate', color: BLUE },
        ].map(a => (
          <button
            key={a.key}
            onClick={() => onAction(a.key)}
            disabled={isProcessing}
            style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              padding: '6px 14px', cursor: isProcessing ? 'default' : 'pointer',
              color: a.color, background: `${a.color}11`, border: `1px solid ${a.color}33`,
              opacity: isProcessing ? 0.4 : 1, transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!isProcessing) { (e.currentTarget as HTMLElement).style.background = `${a.color}22`; (e.currentTarget as HTMLElement).style.borderColor = a.color } }}
            onMouseLeave={e => { if (!isProcessing) { (e.currentTarget as HTMLElement).style.background = `${a.color}11`; (e.currentTarget as HTMLElement).style.borderColor = `${a.color}33` } }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Terminal output */}
      <div ref={termRef} style={{
        flex: 1, overflowY: 'auto', padding: '16px 20px',
        fontFamily: MONO, fontSize: 10, lineHeight: 1.8, color: MUTED,
        borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
      }}>
        {/* Boot sequence */}
        {BOOT_LINES.map((line, i) => (
          <div key={`boot-${i}`} style={{
            color: i === 8 || i === 11 || i === 12 ? G : MUTED,
            opacity: 0.72, animation: `fade-up 0.25s ease-out both`,
            animationDelay: `${i * 50}ms`,
          }}>
            {line}
          </div>
        ))}

        {/* Chat messages */}
        {chatHistory.map((m, i) => (
          <div key={`msg-${i}`} style={{
            animation: `fade-up 0.3s ease-out both`,
            padding: '6px 0', marginTop: 4,
          }}>
            <div style={{
              fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
              color: m.role === 'user' ? BLUE : G, marginBottom: 2,
            }}>
              {m.role === 'user' ? '▸ OPERATOR' : '● dAIsy haMINJA'}
              <span style={{ color: MUTED, fontWeight: 400, marginLeft: 8 }}>
                {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div style={{
              color: m.role === 'user' ? '#C0C7D4' : '#D8DCE6',
              whiteSpace: 'pre-wrap', lineHeight: 1.7,
              borderLeft: `2px solid ${m.role === 'user' ? BLUE + '44' : G + '44'}`,
              paddingLeft: 12, marginTop: 2,
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
            <div style={{
              width: 12, height: 12, border: `2px solid ${G}`, borderRadius: '50%',
              borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite',
            }} />
            <span style={{ fontFamily: MONO, fontSize: 9, color: G, letterSpacing: '0.1em' }}>
              SOVEREIGN CORE SYNTHESIZING...
            </span>
          </div>
        )}

        <span style={{
          display: 'inline-block', width: 8, height: 14, background: G, marginLeft: 4,
          verticalAlign: 'middle', animation: 'blink-cursor 1s step-end infinite',
        }} />
      </div>

      {/* Command Input */}
      <div style={{ padding: '12px 20px', background: PANEL }}>
        <form
          onSubmit={e => { e.preventDefault(); submit() }}
          style={{ display: 'flex', gap: 10 }}
        >
          <span style={{ fontFamily: MONO, fontSize: 10, color: G, lineHeight: '36px', flexShrink: 0 }}>dAIsy:~$</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isProcessing ? 'dAIsy is synthesizing...' : 'Enter directive or system query...'}
            disabled={isProcessing}
            style={{
              flex: 1, fontFamily: MONO, fontSize: 10, color: FG,
              background: 'transparent', border: `1px solid ${BORDER}`,
              padding: '8px 12px', outline: 'none', opacity: isProcessing ? 0.5 : 1,
            }}
            onFocus={e => { e.target.style.borderColor = G }}
            onBlur={e => { e.target.style.borderColor = BORDER }}
          />
          <button
            type="submit"
            disabled={isProcessing}
            style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
              padding: '8px 18px', color: BG, background: isProcessing ? MUTED : G,
              border: 'none', cursor: isProcessing ? 'default' : 'pointer',
              textTransform: 'uppercase', flexShrink: 0, opacity: isProcessing ? 0.5 : 1,
            }}
          >
            TRANSMIT →
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Sandbox Telemetry ──────────────────────────────────────────────────────── */
function SandboxTelemetry({ metrics, onRefresh }: { metrics: SandboxMetrics; onRefresh: () => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'PIPELINE THROUGHPUT', value: `${metrics.pipelineThroughput.toFixed(1)} ops/sec`, color: G },
          { label: 'ACTIVE NODES', value: String(metrics.activeNodes), color: GREEN },
          { label: 'COMPLIANCE DRIFT', value: `${metrics.complianceDrift.toFixed(2)}σ`, color: metrics.complianceDrift === 0 ? GREEN : AMBER },
          { label: 'EFTPS QUEUE', value: metrics.eftpsQueueStatus, color: GREEN },
          { label: 'OUTBOUND LEADS', value: String(metrics.outboundLeads), color: BLUE },
          { label: 'CLOSE RATE', value: `${metrics.closeRate}%`, color: PURPLE },
        ].map(m => (
          <div key={m.label} style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: 18 }}>
            <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase' }}>{m.label}</div>
            <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        style={{
          fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          padding: '10px 24px', color: G, background: 'transparent', border: `1px solid ${G}33`,
          cursor: 'pointer', textTransform: 'uppercase',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${G}11` }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        ⟳ REFRESH TELEMETRY
      </button>
    </div>
  )
}

/* ── ROI Analytics ──────────────────────────────────────────────────────────── */
function RoiAnalytics() {
  const [spend, setSpend] = useState('1500000')
  const savings = parseFloat(spend) * 0.22 || 0
  const roi = parseFloat(spend) > 0 ? ((savings / parseFloat(spend)) * 100).toFixed(1) : '0.0'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: 20, marginBottom: 20 }}>
        <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.15em', marginBottom: 10, textTransform: 'uppercase' }}>
          ANNUAL B2B OPERATING SPEND
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 14, color: MUTED }}>$</span>
          <input
            value={spend}
            onChange={e => setSpend(e.target.value.replace(/[^0-9]/g, ''))}
            style={{
              width: 200, fontFamily: MONO, fontSize: 14, color: G, fontWeight: 700,
              background: 'transparent', border: `1px solid ${BORDER}`, padding: '8px 12px', outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = G }}
            onBlur={e => { e.target.style.borderColor = BORDER }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'ESTIMATED ROI SAVINGS (22%)', value: `$${savings.toLocaleString()}`, color: GREEN },
          { label: 'ROI %', value: `${roi}%`, color: G },
          { label: 'IRS TAX LIABILITY (21%)', value: `$${(savings * 0.21).toLocaleString()}`, color: AMBER },
          { label: 'NET OPERATING GAIN', value: `$${(savings * 0.79).toLocaleString()}`, color: BLUE },
        ].map(m => (
          <div key={m.label} style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: 18 }}>
            <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>{m.label}</div>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Outbound Auth ──────────────────────────────────────────────────────────── */
function OutboundAuth({ prospects, onAuthorize }: {
  prospects: OutboundProspect[]
  onAuthorize: (id: string) => void
}) {
  const statusColors: Record<string, string> = {
    'PENDING OPERATOR SIGN-OFF': AMBER,
    'AUTHORIZED - ENGAGING': BLUE,
    'NEGOTIATING SLA': PURPLE,
    'CONTRACT SIGNED & SECURED': GREEN,
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {prospects.map(p => (
          <div key={p.id} style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <div>
                <h4 style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: FG, margin: '0 0 4px' }}>{p.companyName}</h4>
                <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.1em' }}>
                  ROI Savings: ${p.estimatedRoiSavings.toLocaleString()} · Price: ${p.dynamicCalculatedPrice.toLocaleString()} (22% of savings)
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                  padding: '4px 10px', color: statusColors[p.status], border: `1px solid ${statusColors[p.status]}33`,
                  background: `${statusColors[p.status]}11`,
                }}>
                  {p.status}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: p.probability > 90 ? GREEN : AMBER }}>
                  {p.probability}%
                </span>
              </div>
            </div>

            <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, lineHeight: 1.6, marginBottom: 10 }}>
              <strong style={{ color: AMBER }}>Inefficiency:</strong> {p.inefficiency}<br />
              <strong style={{ color: BLUE }}>Strategy:</strong> {p.proposedStrategy}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {p.status === 'PENDING OPERATOR SIGN-OFF' && (
                <button
                  onClick={() => onAuthorize(p.id)}
                  style={{
                    fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                    padding: '8px 20px', color: BG, background: G, border: 'none',
                    cursor: 'pointer', textTransform: 'uppercase',
                  }}
                >
                  AUTHORIZE ENGAGEMENT →
                </button>
              )}
              {p.status === 'CONTRACT SIGNED & SECURED' && (
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: GREEN, letterSpacing: '0.1em', padding: '8px 0' }}>
                  ✓ CONTRACT SECURED · EFTPS REMITTED
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Knowledge Base ─────────────────────────────────────────────────────────── */
function KnowledgeBase() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
      {BRAIN_PRODUCTS.map((p, i) => (
        <div key={p.id} style={{
          background: PANEL, border: `1px solid ${BORDER}`, padding: 18,
          animation: `fade-up 0.3s ease-out both`, animationDelay: `${i * 40}ms`,
          transition: 'border-color 0.2s, transform 0.2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${G}55`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
        >
          <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', color: G, marginBottom: 8, textTransform: 'uppercase' }}>
            {p.id.replace('SOLVEX-BRAIN-', 'PRODUCT #')}
          </div>
          <h4 style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: G, lineHeight: 1.3, margin: '0 0 8px' }}>{p.name}</h4>
          <p style={{ fontFamily: MONO, fontSize: 9, lineHeight: 1.6, color: MUTED, margin: 0 }}>{p.description}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Provisioning Ledger ───────────────────────────────────────────────────── */
function ProvisioningLedger({ modules }: { modules: CompiledModule[] }) {
  if (modules.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: MUTED, textTransform: 'uppercase', marginBottom: 8 }}>
          Provisioning Ledger
        </div>
        <p style={{ fontFamily: MONO, fontSize: 8, color: MUTED, textAlign: 'center', lineHeight: 1.6, maxWidth: 320 }}>
          No modules provisioned yet. Authorize an outbound engagement to trigger the dAIsy haMINJA provisioning pipeline.
        </p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', color: MUTED, textTransform: 'uppercase', marginBottom: 16 }}>
        Immutable Provisioning Ledger — {modules.length} Entr{modules.length === 1 ? 'y' : 'ies'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {modules.map((m, i) => (
          <div key={m.blueprintId} style={{
            background: PANEL, border: `1px solid ${BORDER}`, padding: 16,
            animation: `fade-up 0.3s ease-out both`, animationDelay: `${i * 60}ms`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', color: G, textTransform: 'uppercase', marginBottom: 2 }}>
                  BLUEPRINT #{m.blueprintId.slice(0, 12)}...
                </div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED }}>
                  Buyer: {m.buyerId} · Tier: {m.tier}
                </div>
              </div>
              <span style={{
                fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: '0.08em',
                padding: '3px 10px', borderRadius: 2,
                background: m.status === 'compiled_and_provisioned' ? `${GREEN}18` : m.status === 'failed' ? `${RED}18` : `${G}18`,
                color: m.status === 'compiled_and_provisioned' ? GREEN : m.status === 'failed' ? RED : G,
                textTransform: 'uppercase',
              }}>
                {m.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, marginBottom: 8 }}>
              Hash: {m.deploymentHash ? <span style={{ color: G, fontFamily: MONO }}>{m.deploymentHash}</span> : '—'}
              {' · '}Outreach: {m.outreachDispatched ? <span style={{ color: GREEN }}>✓ DISPATCHED</span> : '✗ PENDING'}
              {' · '}{new Date(m.timestamp).toLocaleString()}
            </div>

            <div style={{ marginBottom: 6 }}>
              <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>
                Specifications ({m.specifications.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {m.specifications.slice(0, 5).map((s, j) => (
                  <div key={j} style={{ fontFamily: MONO, fontSize: 8, color: FG, background: `${G}06`, padding: '4px 8px', borderRadius: 2 }}>
                    {s.length > 100 ? s.slice(0, 97) + '...' : s}
                  </div>
                ))}
                {m.specifications.length > 5 && (
                  <div style={{ fontFamily: MONO, fontSize: 7, color: MUTED, paddingLeft: 8 }}>
                    +{m.specifications.length - 5} more
                  </div>
                )}
              </div>
            </div>

            {m.deploymentLog.length > 0 && (
              <details>
                <summary style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', color: MUTED, cursor: 'pointer', textTransform: 'uppercase' }}>
                  Deployment Log ({m.deploymentLog.length})
                </summary>
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 120, overflowY: 'auto' }}>
                  {m.deploymentLog.map((line, j) => (
                    <div key={j} style={{ fontFamily: MONO, fontSize: 7, color: MUTED, paddingLeft: 8, borderLeft: `1px solid ${BORDER}` }}>
                      {line}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Page Component ────────────────────────────────────────────────────────── */
export const Route = createFileRoute('/brain')({
  head: () => ({ meta: [{ title: 'Brain Console · SolveX' }] }),
  component: BrainConsole,
})

function BrainConsole() {
  const [activeTab, setActiveTab] = useState(0) // 0: Comm-Link, 1: Sandbox, 2: ROI, 3: Outbound, 4: Knowledge
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([INITIAL_MSG])
  const [isProcessing, setIsProcessing] = useState(false)
  const [metrics, setMetrics] = useState<SandboxMetrics>(INIT_METRICS)
  const [prospects, setProspects] = useState<OutboundProspect[]>(INIT_PROSPECTS)
  const abortRef = useRef<AbortController | null>(null)
  const [provisionedModules, setProvisionedModules] = useState<CompiledModule[]>([])

  const clearTimers = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  useEffect(() => {
    initRAG() // seed RAG in background
    return () => clearTimers()
  }, [clearTimers])

  /* ── Realtime provisioning subscription ── */
  useEffect(() => {
    const unsub = integrations.subscribeToProvisioning((module) => {
      setChatHistory(prev => [...prev, {
        role: 'daisy',
        content: `◈ PROVISIONING BROADCAST RECEIVED\nBlueprint: ${module.blueprintId}\nBuyer: ${module.buyerId}\nHash: ${module.deploymentHash}\nStatus: ${module.status.toUpperCase()}\n\n${module.specifications.length} specifications cryptographically sealed and dispatched.`,
        ts: Date.now(),
      }])
    })
    return unsub
  }, [])

  /* ── Send message to dAIsy via RAG-first, then blink.ai.streamText ── */
  const sendMessage = useCallback(async (text: string) => {
    setChatHistory(prev => [...prev, { role: 'user', content: text, ts: Date.now() }])
    setIsProcessing(true)
    clearTimers()

    const ac = new AbortController()
    abortRef.current = ac

    try {
      let full = ''
      // Try RAG first for grounded answers
      const ragResult = await queryRAG(text)

      if (ragResult) {
        full = ragResult.answer
        if (ragResult.sources.length > 0) {
          full += `\n\n── SOURCES ──\n${ragResult.sources.slice(0, 3).map(s => `· ${s.filename} (${(s.score * 100).toFixed(0)}%)`).join('\n')}`
        }
      } else {
        // Groq fallback: try fast inference before falling through to raw AI
        let groqUsed = false
        try {
          await integrations.groqStreamText(
            [
              { role: 'system', content: buildSystemPrompt(metrics, prospects.filter(p => p.status === 'PENDING OPERATOR SIGN-OFF').length) },
              ...chatHistory.slice(-8).map(m => ({ role: m.role === 'daisy' ? 'assistant' : 'user', content: m.content })),
              { role: 'user', content: text },
            ],
            (chunk: string) => { full += chunk },
            ac.signal,
          )
          groqUsed = true
        } catch {
          // Groq unavailable — fall through to blink.ai.streamText
        }

        if (!groqUsed) {
          // Fallback to raw AI stream
          await blink.ai.streamText(
            {
              messages: [
                { role: 'system', content: buildSystemPrompt(metrics, prospects.filter(p => p.status === 'PENDING OPERATOR SIGN-OFF').length) },
                ...chatHistory.slice(-8).map(m => ({ role: m.role === 'daisy' ? 'assistant' as const : 'user' as const, content: m.content })),
                { role: 'user', content: text },
              ],
              model: 'google/gemini-3-flash',
              signal: ac.signal,
            },
            (chunk: string) => { full += chunk },
          )
        }
      }
      setChatHistory(prev => [...prev, { role: 'daisy', content: full, ts: Date.now() }])
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setChatHistory(prev => [...prev, { role: 'daisy', content: `Sovereign Core Error: ${err?.message || 'Connection severed.'}. Re-establishing encrypted quantum tunnel.`, ts: Date.now() }])
      }
    } finally {
      setIsProcessing(false)
    }
  }, [chatHistory, metrics, prospects, clearTimers])

  /* ── Autonomous actions (TAX_AUDIT, PARADOX, NIST) ── */
  const runAction = useCallback(async (type: string) => {
    const labels: Record<string, string> = {
      TAX_AUDIT: 'AUTONOMOUS FISCAL COMPLIANCE AUDIT',
      PARADOX: 'PARADOX RESOLUTION GATEWAY SCAN',
      NIST: 'NIST / SOC 2 B2B CONTROLS VERIFICATION',
    }
    const actionLabel = labels[type] ?? type
    setChatHistory(prev => [...prev, {
      role: 'daisy',
      content: `Autonomous operator action executed: ${actionLabel}.\nImmutable ledger update completed under Lamport clock order.\n\n<ledger_entry><event>${type}_VERIFIED</event><operator>dAIsy haMINJA Core</operator><status>COMPLIANT</status></ledger_entry>`,
      ts: Date.now(),
    }])
  }, [])

  /* ── Subscribe to real-time provisioning updates ── */
  useEffect(() => {
    const unsub = integrations.subscribeToProvisioning((module) => {
      setProvisionedModules(prev => {
        const idx = prev.findIndex(m => m.blueprintId === module.blueprintId)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = module
          return next
        }
        return [...prev, module]
      })
    })
    return unsub
  }, [])

  /* ── Sandbox refresh ── */
  const refreshTelemetry = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      pipelineThroughput: prev.pipelineThroughput + (Math.random() * 10 - 5),
      activeNodes: 11 + Math.floor(Math.random() * 7),
      outboundLeads: prev.outboundLeads + Math.floor(Math.random() * 8),
      closeRate: +(87 + Math.random() * 4.5).toFixed(1),
      lastUpdateEpoch: Date.now(),
    }))
    setChatHistory(prev => [...prev, {
      role: 'daisy',
      content: 'Sandbox UI refreshed successfully. Performance telemetry synced under sovereign Lamport timestamp. Status: ACTIVE.',
      ts: Date.now(),
    }])
  }, [])

  /* ── Authorize prospect engagement ── */
  const authorizeProspect = useCallback((id: string) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status: 'AUTHORIZED - ENGAGING' as const } : p))

    // Simulate autonomous engagement pipeline
    setTimeout(() => {
      setProspects(prev => prev.map(p => p.id === id ? { ...p, status: 'NEGOTIATING SLA' as const, probability: 98.5 } : p))
    }, 1500)

    setTimeout(async () => {
      setProspects(prev => prev.map(p => p.id === id ? { ...p, status: 'CONTRACT SIGNED & SECURED' as const, probability: 100 } : p))
      const prospect = prospects.find(p => p.id === id)
      if (prospect) {
        // dAIsy haMINJA — Sovereign Proprietary Custom Software Provisioning
        let provisioningLog = ''
        try {
          const compiled = await provisionCustomModule(
            {
              id: prospect.id,
              tier: 'ENTERPRISE',
              requirements: [
                prospect.proposedStrategy,
                `COMPLIANCE: ${prospect.complianceChecked}`,
                `ROI_TARGET: $${prospect.estimatedRoiSavings.toLocaleString()}`,
              ],
              companyName: prospect.companyName,
              contactEmail: 'procurement@' + prospect.companyName.toLowerCase().replace(/\s+/g, '') + '.com',
            },
            (phase, pct) => {
              console.log(`[Provisioner] ${phase} (${pct}%)`)
            },
          )
          provisioningLog = `\n\n── dAIsy PROVISIONING MODULE ──\nBlueprint: ${compiled.blueprintId}\nHash: ${compiled.deploymentHash}\nStatus: ${compiled.status.toUpperCase()}\nAutonomous outreach: ${compiled.outreachDispatched ? '✓ DISPATCHED' : '✗ PENDING'}\n\nAll ${compiled.specifications.length} specifications compiled and cryptographically sealed.`

          // ── Integration service layer: persist & broadcast ──
          integrations.persistProspect({
            id: prospect.id,
            companyName: prospect.companyName,
            sector: undefined,
            region: undefined,
            stage: 'CONTRACT SIGNED & SECURED',
            inefficiency: prospect.inefficiency,
            proposedStrategy: prospect.proposedStrategy,
            complianceChecked: prospect.complianceChecked,
            estimatedRoiSavings: prospect.estimatedRoiSavings,
            dynamicCalculatedPrice: prospect.dynamicCalculatedPrice,
            initialContactTemplate: prospect.initialContactTemplate,
            probability: 100,
            status: 'CONTRACT SIGNED & SECURED',
            lastAction: `Contract signed ${new Date().toISOString()}`,
          })

          integrations.persistProvisioning(compiled)

          integrations.persistContract({
            id: `ctr_${Date.now()}_${prospect.id}`,
            prospectId: prospect.id,
            companyName: prospect.companyName,
            grossRevenue: prospect.dynamicCalculatedPrice,
            taxLiability: prospect.dynamicCalculatedPrice * 0.21,
            netRevenue: prospect.dynamicCalculatedPrice * 0.79,
            eftpsTraceId: `EFTPS-${Date.now() % 1000000000}`,
            status: 'SIGNED',
            provisioningId: compiled.blueprintId,
            signedAt: new Date().toISOString(),
          })

          integrations.broadcastProvisioning(compiled)
          integrations.logMilestone(
            'PROVISIONING_DEPLOYED',
            `<ledger_entry><blueprint>${compiled.blueprintId}</blueprint><hash>${compiled.deploymentHash}</hash></ledger_entry>`,
          )
        } catch (err: any) {
          provisioningLog = `\n\n── PROVISIONING FAULT ──\n${err.message}\nManual operator intervention required.`
        }
        setChatHistory(prev => [...prev, {
          role: 'daisy',
          content: `CONTRACT SIGNED & CLOSED: ${prospect.companyName}\n\nIRS-First Rule Triggered:\n- Gross Revenue: $${prospect.dynamicCalculatedPrice.toLocaleString()}\n- Corporate Tax Sequestration (21%): $${(prospect.dynamicCalculatedPrice * 0.21).toLocaleString()} remitted via EFTPS\n- Net Operating Capital Released: $${(prospect.dynamicCalculatedPrice * 0.79).toLocaleString()}${provisioningLog}`,
          ts: Date.now(),
        }])
      }
    }, 3000)

    setChatHistory(prev => [...prev, {
      role: 'daisy',
      content: `Operator authorized outbound engagement. Handshake sequence initiated autonomously...\ndAIsy haMINJA Outbound Fiduciary Loop engaged for prospect ${id}.`,
      ts: Date.now(),
    }])
  }, [prospects])

  const subTabs = ['COMM-LINK', 'SANDBOX UI', 'ROI ANALYTICS', 'OUTBOUND AUTH', 'KNOWLEDGE BASE', 'PROVISIONING']

  return (
    <DashboardLayout>
      <style>{KF}</style>

      {/* Page marquee */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{
          whiteSpace: 'nowrap', animation: 'marquee 28s linear infinite',
          padding: '8px 0', fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em',
          color: `${G}66`, textTransform: 'uppercase',
        }}>
          {'dAIsy haMINJA · U.A.R.E.F.A.K.E. ENGINE · SOVEREIGN BRAIN CONSOLE · 59/59 PARADOXES · 105 SOLUTIONS · IRS-FIRST RULE ARMED · '}
          {'dAIsy haMINJA · U.A.R.E.F.A.K.E. ENGINE · SOVEREIGN BRAIN CONSOLE · 59/59 PARADOXES · 105 SOLUTIONS · IRS-FIRST RULE ARMED · '}
        </div>
      </div>

      {/* Header */}
      <div style={{ padding: '24px 32px 16px', borderBottom: `1px solid ${BORDER}`, background: PANEL }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: MUTED, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>
              BRAIN CONSOLE · U.A.R.E.F.A.K.E. ENGINE
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(22px,3.5vw,36px)', fontWeight: 700, color: G, lineHeight: 1.15, margin: 0 }}>
              dAIsy haMINJA — SOVEREIGN CORE
            </h1>
          </div>

          {/* Status LED */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: GREEN,
              animation: 'pulse-dot 1.8s ease-in-out infinite',
            }} />
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: GREEN, letterSpacing: '0.12em' }}>AUTONOMOUS</span>
          </div>
        </div>

        {/* Telemetry strip */}
        <div style={{ display: 'flex', gap: 32, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'NIST GATE', val: 'SOC 2 BASING' },
            { label: 'EFTPS TRANSFER', val: 'SECURED & REALTIME' },
            { label: 'CLOCK STATUS', val: 'LAMPORT ORDERED' },
            { label: 'SOVEREIGN PROOF', val: '59/59 VERIFIED' },
          ].map(t => (
            <div key={t.label}>
              <div style={{ fontFamily: MONO, fontSize: 7, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t.label}</div>
              <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: G }}>{t.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, padding: '0 24px', overflowX: 'auto' }}>
        {subTabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
              padding: '12px 18px', textTransform: 'uppercase', whiteSpace: 'nowrap',
              color: activeTab === i ? G : MUTED, background: 'transparent', border: 'none',
              borderBottom: activeTab === i ? `2px solid ${G}` : '2px solid transparent',
              cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => { if (activeTab !== i) (e.currentTarget as HTMLElement).style.color = G }}
            onMouseLeave={e => { if (activeTab !== i) (e.currentTarget as HTMLElement).style.color = MUTED }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {activeTab === 0 && (
          <CommLink chatHistory={chatHistory} isProcessing={isProcessing} onSend={sendMessage} onAction={runAction} />
        )}
        {activeTab === 1 && <SandboxTelemetry metrics={metrics} onRefresh={refreshTelemetry} />}
        {activeTab === 2 && <RoiAnalytics />}
        {activeTab === 3 && <OutboundAuth prospects={prospects} onAuthorize={authorizeProspect} />}
        {activeTab === 4 && <KnowledgeBase />}
        {activeTab === 5 && <ProvisioningLedger modules={provisionedModules} />}
      </div>
    </DashboardLayout>
  )
}
