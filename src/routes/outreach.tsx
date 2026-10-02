import { createFileRoute } from '@tanstack/react-router'
import { DashboardLayout } from '@/components/DashboardLayout'

/* ── Design tokens ─────────────────────────────────────────────────────────────── */
const GOLD = '#D4AF37'
const BG = '#05080F'
const BG_PANEL = '#0A0F1A'
const FG = '#E0E0E0'
const MUTED = '#6B7280'
const BORDER = '#1A2235'
const ACCENT_DIM = '#162040'
const GREEN = '#22C55E'
const AMBER = '#F59E0B'
const BLUE = '#64B4FF'
const MONO = '"IBM Plex Mono", "Courier New", monospace'
const SERIF = '"Playfair Display", "Georgia", serif'

/* ── Seed Data ─────────────────────────────────────────────────────────────────── */

const STATS = [
  { label: 'TOTAL PROSPECTS', value: '1,842', accent: GOLD },
  { label: 'NEW LEADS (7D)', value: '47', accent: BLUE },
  { label: 'DRAFTS READY', value: '12', accent: AMBER },
  { label: 'DELIVERED', value: '1,628', accent: GREEN },
  { label: 'REPLIES', value: '314', accent: GOLD },
]

interface Prospect {
  company: string
  sector: string
  stage: string
  platform: string
  fitScore: number
  lastAction: string
}

const PROSPECTS: Prospect[] = [
  { company: 'BlackRock Aladdin', sector: 'ASSET MGMT', stage: 'NEGOTIATION', platform: 'EMAIL', fitScore: 94, lastAction: 'PROPOSAL SENT' },
  { company: 'JPMorgan Onyx', sector: 'BANKING', stage: 'QUALIFIED', platform: 'LINKEDIN', fitScore: 91, lastAction: 'DEMO BOOKED' },
  { company: 'Goldman Sachs DAP', sector: 'BANKING', stage: 'OUTREACH', platform: 'EMAIL', fitScore: 88, lastAction: 'FOLLOW-UP #2' },
  { company: 'BNY Mellon Digital', sector: 'CUSTODY', stage: 'CLOSED-WON', platform: 'REFERRAL', fitScore: 96, lastAction: 'CONTRACT SIGNED' },
  { company: 'Fidelity Digital Assets', sector: 'ASSET MGMT', stage: 'NEGOTIATION', platform: 'EMAIL', fitScore: 92, lastAction: 'TERMS REVIEW' },
  { company: 'State Street Alpha', sector: 'CUSTODY', stage: 'QUALIFIED', platform: 'CONFERENCE', fitScore: 85, lastAction: 'DEMO REQUESTED' },
  { company: 'DTCC Project Ion', sector: 'CLEARING', stage: 'OUTREACH', platform: 'EMAIL', fitScore: 79, lastAction: 'INITIAL TOUCH' },
  { company: 'Swift gpi Lab', sector: 'PAYMENTS', stage: 'DRAFT', platform: 'LINKEDIN', fitScore: 82, lastAction: 'DRAFT IN REVIEW' },
  { company: 'Euroclear D-FMI', sector: 'CLEARING', stage: 'QUALIFIED', platform: 'EMAIL', fitScore: 87, lastAction: 'NDA SIGNED' },
  { company: 'CME Group Digital', sector: 'EXCHANGE', stage: 'NEGOTIATION', platform: 'REFERRAL', fitScore: 93, lastAction: 'PILOT KICKOFF' },
]

const STAGE_COLORS: Record<string, string> = {
  'CLOSED-WON': GREEN,
  'NEGOTIATION': GOLD,
  'QUALIFIED': BLUE,
  'OUTREACH': AMBER,
  'DRAFT': MUTED,
}

/* ── Sub-components ────────────────────────────────────────────────────────────── */

function StatsBar() {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap',
      borderBottom: `1px solid ${BORDER}`,
      background: BG_PANEL,
    }}>
      {STATS.map((s, i) => (
        <div
          key={s.label}
          style={{
            padding: '14px 20px',
            borderRight: i < STATS.length - 1 ? `1px solid ${BORDER}` : 'none',
            display: 'flex', flexDirection: 'column', gap: 4,
            flex: '1 1 140px',
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: MUTED, textTransform: 'uppercase' }}>
            {s.label}
          </span>
          <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: s.accent, lineHeight: 1 }}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function ProspectsTable() {
  return (
    <div style={{ padding: '22px 28px', flex: 1, overflow: 'auto' }}>
      <h2 style={{
        fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: GOLD,
        letterSpacing: '0.04em', margin: '0 0 16px',
      }}>
        OUTREACH PROSPECTS
      </h2>

      {/* Table header */}
      <div style={{
        display: 'flex', fontFamily: MONO, fontSize: 8, fontWeight: 700,
        letterSpacing: '0.1em', color: MUTED, textTransform: 'uppercase',
        borderBottom: `1px solid ${BORDER}`, paddingBottom: 10, marginBottom: 6,
      }}>
        <span style={{ flex: '0 0 190px' }}>COMPANY</span>
        <span style={{ flex: '0 0 110px' }}>SECTOR</span>
        <span style={{ flex: '0 0 110px' }}>STAGE</span>
        <span style={{ flex: '0 0 90px' }}>PLATFORM</span>
        <span style={{ flex: '0 0 80px', textAlign: 'center' }}>FIT SCORE</span>
        <span style={{ flex: 1 }}>LAST ACTION</span>
      </div>

      {PROSPECTS.map((p) => (
        <div
          key={p.company}
          style={{
            display: 'flex', alignItems: 'center',
            fontFamily: MONO, fontSize: 10, color: FG,
            borderBottom: `1px solid ${BORDER}`,
            padding: '11px 0',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = ACCENT_DIM }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <span style={{ flex: '0 0 190px', color: FG, fontWeight: 600, fontSize: 10 }}>
            {p.company}
          </span>
          <span style={{ flex: '0 0 110px', color: MUTED, fontSize: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {p.sector}
          </span>
          <span style={{
            flex: '0 0 110px', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: STAGE_COLORS[p.stage] ?? MUTED,
          }}>
            ● {p.stage}
          </span>
          <span style={{ flex: '0 0 90px', color: MUTED, fontSize: 8, letterSpacing: '0.05em' }}>
            {p.platform}
          </span>
          <span style={{
            flex: '0 0 80px', textAlign: 'center',
            fontSize: 8, fontWeight: 700, color: p.fitScore >= 90 ? GOLD : p.fitScore >= 80 ? BLUE : MUTED,
          }}>
            {p.fitScore}%
          </span>
          <span style={{ flex: 1, color: MUTED, fontSize: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {p.lastAction}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────────── */

function OutreachOps() {
  return (
    <DashboardLayout>
      {/* Page marquee */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{
          whiteSpace: 'nowrap', padding: '8px 0',
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em',
          color: 'rgba(212,175,55,0.45)', textTransform: 'uppercase',
        }}>
          {'OUTREACH OPS · PROSPECT PIPELINE · ENGAGEMENT TRACKER · OUTREACH OPS · PROSPECT PIPELINE · ENGAGEMENT TRACKER · '}
        </div>
      </div>

      <div style={{ padding: '32px 28px 16px' }}>
        <h1 style={{
          fontFamily: SERIF, fontSize: 'clamp(26px, 3.8vw, 42px)', fontWeight: 700,
          color: GOLD, lineHeight: 1.15, margin: 0,
        }}>
          OUTREACH OPS
        </h1>
        <p style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.08em', margin: '6px 0 0' }}>
          PROSPECT PIPELINE · INSTITUTIONAL ENGAGEMENT · SOLVEX ENTERPRISE
        </p>
      </div>

      <StatsBar />
      <ProspectsTable />

      {/* Count footer */}
      <div style={{
        padding: '20px 28px', borderTop: `1px solid ${BORDER}`,
        textAlign: 'center',
      }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: MUTED, textTransform: 'uppercase' }}>
          {PROSPECTS.length} PROSPECTS · PIPELINE VALUE: $1.84B · UPDATED: REALTIME
        </span>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/outreach')({
  head: () => ({ meta: [{ title: 'Outreach Ops · SolveX' }] }),
  component: OutreachOps,
})
