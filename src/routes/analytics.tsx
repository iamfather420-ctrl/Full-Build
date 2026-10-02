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
const MONO = '"IBM Plex Mono", "Courier New", monospace'
const SERIF = '"Playfair Display", "Georgia", serif'

/* ── Seed Data ─────────────────────────────────────────────────────────────────── */

const STATS = [
  { label: 'ACTIVE DEPLOYMENTS', value: '1,247', change: '+8.3%', up: true },
  { label: 'API CALLS (24H)', value: '3.84M', change: '+12.1%', up: true },
  { label: 'UPTIME', value: '99.97%', change: '30D AVG', up: true },
  { label: 'LICENSE UTILIZATION', value: '94.2%', change: 'OF 1,323', up: true },
]

const MONTHLY_REVENUE = [
  { month: 'JAN', value: 184 },
  { month: 'FEB', value: 206 },
  { month: 'MAR', value: 241 },
  { month: 'APR', value: 228 },
  { month: 'MAY', value: 267 },
  { month: 'JUN', value: 302 },
  { month: 'JUL', value: 338 },
  { month: 'AUG', value: 315 },
  { month: 'SEP', value: 361 },
  { month: 'OCT', value: 398 },
  { month: 'NOV', value: 422 },
  { month: 'DEC', value: 480 },
]

const MAX_REV = Math.max(...MONTHLY_REVENUE.map((d) => d.value))
const CHART_H = 220

/* ── Sub-components ────────────────────────────────────────────────────────────── */

function StatsOverview() {
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
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, color: s.up ? GREEN : MUTED }}>
            {s.change}
          </span>
        </div>
      ))}
    </div>
  )
}

function RevenueChart() {
  return (
    <div style={{ padding: '22px 28px' }}>
      <h2 style={{
        fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: GOLD,
        letterSpacing: '0.04em', margin: '0 0 6px',
      }}>
        MONTHLY REVENUE
      </h2>
      <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: '0.08em', margin: '0 0 20px' }}>
        SOLUTION DEPLOYMENT REVENUE · USD MILLIONS
      </p>

      {/* Bar chart built with divs */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        gap: 6, height: CHART_H,
        borderBottom: `1px solid ${BORDER}`,
        paddingBottom: 0,
      }}>
        {MONTHLY_REVENUE.map((d) => {
          const h = (d.value / MAX_REV) * (CHART_H - 28)
          const isPeak = d.value === MAX_REV
          return (
            <div
              key={d.month}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                height: CHART_H, justifyContent: 'flex-end',
              }}
            >
              <span style={{
                fontFamily: MONO, fontSize: 7, fontWeight: 600, color: MUTED,
                marginBottom: 2,
              }}>
                ${d.value}M
              </span>
              <div
                style={{
                  width: '100%', maxWidth: 48,
                  height: h,
                  background: isPeak
                    ? `linear-gradient(180deg, ${GOLD} 0%, rgba(212,175,55,0.3) 100%)`
                    : `linear-gradient(180deg, rgba(212,175,55,0.45) 0%, rgba(212,175,55,0.08) 100%)`,
                  border: isPeak ? `1px solid ${GOLD}` : '1px solid transparent',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
              />
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {MONTHLY_REVENUE.map((d) => (
          <span
            key={d.month}
            style={{
              flex: 1, textAlign: 'center',
              fontFamily: MONO, fontSize: 7, fontWeight: 600,
              color: MUTED, letterSpacing: '0.06em',
            }}
          >
            {d.month}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────────── */

function Analytics() {
  return (
    <DashboardLayout>
      {/* Page marquee */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{
          whiteSpace: 'nowrap', padding: '8px 0',
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em',
          color: 'rgba(212,175,55,0.45)', textTransform: 'uppercase',
        }}>
          {'ANALYTICS · METRICS DASHBOARD · REAL-TIME TELEMETRY · ANALYTICS · METRICS DASHBOARD · REAL-TIME TELEMETRY · '}
        </div>
      </div>

      <div style={{ padding: '32px 28px 16px' }}>
        <h1 style={{
          fontFamily: SERIF, fontSize: 'clamp(26px, 3.8vw, 42px)', fontWeight: 700,
          color: GOLD, lineHeight: 1.15, margin: 0,
        }}>
          ANALYTICS
        </h1>
        <p style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.08em', margin: '6px 0 0' }}>
          REAL-TIME DEPLOYMENT & USAGE METRICS · SOLVEX PARADOX BOX
        </p>
      </div>

      <StatsOverview />
      <RevenueChart />

      {/* Summary footer */}
      <div style={{
        padding: '20px 28px', borderTop: `1px solid ${BORDER}`,
        textAlign: 'center',
      }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: MUTED, textTransform: 'uppercase' }}>
          DATA REFRESHED: LIVE · FISCAL YEAR {new Date().getFullYear()}
        </span>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/analytics')({
  head: () => ({ meta: [{ title: 'Analytics · SolveX' }] }),
  component: Analytics,
})
