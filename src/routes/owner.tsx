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
const RED = '#EF4444'
const AMBER = '#F59E0B'
const MONO = '"IBM Plex Mono", "Courier New", monospace'
const SERIF = '"Playfair Display", "Georgia", serif'

/* ── Seed Data ─────────────────────────────────────────────────────────────────── */
const STATS = [
  { label: 'VAULT BALANCE', value: 'Ξ847.33K', change: '+12.4%', up: true },
  { label: 'AVAILABLE FUNDS', value: '$128.4M', change: '+3.8%', up: true },
  { label: 'TOTAL REVENUE', value: '$2.847B', change: '+24.1%', up: true },
  { label: 'SOLVED PROBLEMS', value: '88', change: 'ALL-TIME', up: true },
]

const LEDGER_ENTRIES = [
  { id: 'TXN-8471', amount: 'Ξ12.500', method: 'MULTI-SIG ESCROW', status: 'SETTLED' },
  { id: 'TXN-8472', amount: '$425,000', method: 'WIRE TRANSFER', status: 'SETTLED' },
  { id: 'TXN-8473', amount: 'Ξ28.000', method: 'ZK-ROLLUP BRIDGE', status: 'PENDING' },
  { id: 'TXN-8474', amount: '$952,000', method: 'ACH SETTLEMENT', status: 'SETTLED' },
  { id: 'TXN-8475', amount: 'Ξ18.400', method: 'THRESHOLD SIGN', status: 'CONFIRMING' },
  { id: 'TXN-8476', amount: '$625,000', method: 'INSTANT SETTLE', status: 'SETTLED' },
]

/* ── Sub-components ────────────────────────────────────────────────────────────── */

function StatsRow() {
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
            padding: '16px 24px',
            borderRight: i < STATS.length - 1 ? `1px solid ${BORDER}` : 'none',
            display: 'flex', flexDirection: 'column', gap: 6,
            flex: '1 1 180px',
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', color: MUTED, textTransform: 'uppercase' }}>
            {s.label}
          </span>
          <span style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
            {s.value}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, color: s.up ? GREEN : RED }}>
            {s.change}
          </span>
        </div>
      ))}
    </div>
  )
}

function VaultLedger() {
  return (
    <div style={{ padding: '22px 28px', flex: 1 }}>
      <h2 style={{
        fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: GOLD,
        letterSpacing: '0.04em', margin: '0 0 16px',
      }}>
        VAULT LEDGER
      </h2>
      {/* Table header */}
      <div style={{
        display: 'flex', fontFamily: MONO, fontSize: 9, fontWeight: 700,
        letterSpacing: '0.1em', color: MUTED, textTransform: 'uppercase',
        borderBottom: `1px solid ${BORDER}`, paddingBottom: 10, marginBottom: 8,
      }}>
        <span style={{ flex: '0 0 140px' }}>TRANSACTION ID</span>
        <span style={{ flex: '0 0 140px' }}>AMOUNT</span>
        <span style={{ flex: 1 }}>METHOD</span>
        <span style={{ flex: '0 0 120px', textAlign: 'right' }}>STATUS</span>
      </div>
      {LEDGER_ENTRIES.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: 'flex', alignItems: 'center',
            fontFamily: MONO, fontSize: 10, color: FG,
            borderBottom: `1px solid ${BORDER}`,
            padding: '10px 0',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = ACCENT_DIM }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <span style={{ flex: '0 0 140px', color: GOLD }}>{entry.id}</span>
          <span style={{ flex: '0 0 140px' }}>{entry.amount}</span>
          <span style={{ flex: 1, color: MUTED, fontSize: 9, letterSpacing: '0.06em' }}>{entry.method}</span>
          <span style={{
            flex: '0 0 120px', textAlign: 'right',
            fontFamily: MONO, fontSize: 8, fontWeight: 700,
            letterSpacing: '0.08em',
            color: entry.status === 'SETTLED' ? GREEN : entry.status === 'PENDING' ? AMBER : MUTED,
          }}>
            ● {entry.status}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────────── */

function OwnerDashboard() {
  return (
    <DashboardLayout>
      {/* Page heading */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`, overflow: 'hidden',
      }}>
        <div style={{
          whiteSpace: 'nowrap', padding: '8px 0',
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em',
          color: 'rgba(212,175,55,0.45)', textTransform: 'uppercase',
        }}>
          {'COMMAND CENTER · VAULT OVERSIGHT · LEDGER AUDIT · COMMAND CENTER · VAULT OVERSIGHT · LEDGER AUDIT · '}
        </div>
      </div>

      <div style={{ padding: '32px 28px 16px' }}>
        <h1 style={{
          fontFamily: SERIF, fontSize: 'clamp(26px, 3.8vw, 42px)', fontWeight: 700,
          color: GOLD, lineHeight: 1.15, margin: 0,
        }}>
          COMMAND CENTER
        </h1>
        <p style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.08em', margin: '6px 0 0' }}>
          ADMINISTRATIVE OVERSIGHT · SOLVEX PARADOX BOX ENTERPRISE
        </p>
      </div>

      <StatsRow />
      <VaultLedger />

      {/* Count footer */}
      <div style={{
        padding: '20px 28px', borderTop: `1px solid ${BORDER}`,
        textAlign: 'center',
      }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: MUTED, textTransform: 'uppercase' }}>
          {LEDGER_ENTRIES.length} LEDGER ENTRIES · LAST UPDATED: REALTIME
        </span>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/owner')({
  head: () => ({ meta: [{ title: 'Command Center · SolveX' }] }),
  component: OwnerDashboard,
})
