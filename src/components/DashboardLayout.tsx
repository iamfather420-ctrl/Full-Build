import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { PARADOXES, getChamberForParadox } from '@/data/brainData'

// ── Runenkammer ────────────────────────────────────────────────────────────────
const CHAMBER_I_RUNES = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ']
const CHAMBER_SYMBOLS: Record<number, string> = { 2: '☸', 3: '𓁙', 4: '⬢', 5: '👁' }

function chamberSymbol(chamber: number, paradoxId: number): string {
  if (chamber === 1) return CHAMBER_I_RUNES[(paradoxId - 1) % CHAMBER_I_RUNES.length]
  return CHAMBER_SYMBOLS[chamber] ?? '⬡'
}

// ── Ticker ─────────────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { label: 'SOLVEX/CHF', value: '1,247.33', change: '+2.41%', up: true },
  { label: 'ZAMIN·LOCK', value: '41.2ms', change: '−18%', up: true },
  { label: 'TETHER·DELTA', value: '0.944', change: '+0.07', up: true },
  { label: 'CHRONO·COMPACT', value: '99.7%', change: 'LIVE', up: true },
  { label: 'IRS·FIRST', value: 'ACTIVE', change: '21%', up: true },
  { label: 'UAREFAKE·PROOF', value: '58/59', change: 'VERIFIED', up: true },
  { label: 'ENTROPY·COHERENCE', value: '0.0014σ', change: 'NOMINAL', up: true },
  { label: 'GLASS·BOX', value: 'CYCLE·ON', change: 'SYNC', up: true },
]

// ── Navigation ─────────────────────────────────────────────────────────────────
interface NavItem { to: string; label: string; admin?: boolean }

const MAIN_NAV: NavItem[] = [
  { to: '/marketplace', label: 'PARADOX VAULT' },
  { to: '/sovereign', label: 'SOVEREIGN CONSOLE' },
  { to: '/outreach', label: 'OUTREACH OPS' },
  { to: '/brain', label: 'BRAIN CONSOLE' },
  { to: '/challenges', label: 'CHALLENGE HUB' },
  { to: '/library', label: 'SOLUTION LIBRARY' },
]
const ADMIN_NAV: NavItem[] = [
  { to: '/owner', label: 'COMMAND CENTER', admin: true },
  { to: '/analytics', label: 'ANALYTICS', admin: true },
]

// ── Shared style constants ─────────────────────────────────────────────────────
const GOLD = '#D4AF37'
const BG = '#05080F'
const BG_PANEL = '#0A0F1A'
const FG = '#E0E0E0'
const MUTED = '#6B7280'
const BORDER = '#1A2235'
const ACCENT_DIM = '#162040'
const RED = '#EF4444'
const GREEN = '#22C55E'

const MONO = '"IBM Plex Mono", "Courier New", monospace'
const SERIF = '"Playfair Display", "Georgia", serif'

// ── Stylesheet (keyframes injected once) ───────────────────────────────────────
const KEYFRAMES = `
@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes pulse-dot { 0%,100% { opacity:1; box-shadow:0 0 6px ${GOLD}; } 50% { opacity:0.35; box-shadow:0 0 14px ${GOLD}; } }
@keyframes fade-in { from { opacity:0; } to { opacity:1; } }
`

// ── OmniscientTerminal ─────────────────────────────────────────────────────────
interface LogEntry { time: string; chamber: string; paradoxId: number; paradoxName: string }

function OmniscientTerminal() {
  const [paradoxIdx, setParadoxIdx] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sheetRef = useRef<HTMLStyleElement | null>(null)

  // Inject keyframes once
  useEffect(() => {
    if (!document.getElementById('solvex-keyframes')) {
      const s = document.createElement('style')
      s.id = 'solvex-keyframes'
      s.textContent = KEYFRAMES
      document.head.appendChild(s)
      sheetRef.current = s
    }
    return () => {
      if (sheetRef.current) document.head.removeChild(sheetRef.current)
    }
  }, [])

  const pushLog = useCallback((pid: number, name: string, chamber: string) => {
    const now = new Date()
    const time = now.toLocaleTimeString('en-CA', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLogs(prev => [{ time, chamber, paradoxId: pid, paradoxName: name }, ...prev].slice(0, 4))
  }, [])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setParadoxIdx(prev => {
        const next = (prev + 1) % PARADOXES.length
        const p = PARADOXES[next]
        const ch = getChamberForParadox(p.id)
        pushLog(p.id, p.name, `CHAMBER ${String(ch.num)}`)
        return next
      })
    }, 1800)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [pushLog])

  const paradox = PARADOXES[paradoxIdx]
  const chamber = getChamberForParadox(paradox.id)
  const sym = chamberSymbol(chamber.num as unknown as number, paradox.id)

  return (
    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BORDER}`, background: BG_PANEL }}>
      {/* GLASS BOX ACTIVE indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: GOLD,
          animation: 'pulse-dot 1.2s ease-in-out infinite',
        }} />
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          GLASS BOX ACTIVE
        </span>
      </div>

      {/* Current paradox display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontFamily: SERIF, fontSize: 22, color: GOLD, lineHeight: 1, minWidth: 28, textAlign: 'center' }}>
          {sym}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {chamber.num} — {chamber.name}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: FG, lineHeight: 1.4, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            #{paradox.id} {paradox.name}
          </div>
        </div>
      </div>

      {/* Transition log */}
      <div style={{ marginTop: 6 }}>
        <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          Chamber Transitions
        </div>
        {logs.map((l, i) => (
          <div key={i} style={{ fontFamily: MONO, fontSize: 8, color: i === 0 ? FG : MUTED, lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: GOLD }}>{l.time}</span>{' '}
            <span>{l.chamber}</span>{' '}
            <span style={{ opacity: 0.6 }}>#{l.paradoxId}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, fontStyle: 'italic' }}>Awaiting first cycle...</div>
        )}
      </div>

      {/* dAIsy haMINJA identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
        <img src="/daisy-avatar.png" alt="dAIsy haMINJA" style={{ width: 22, height: 22, borderRadius: '50%', border: `1px solid ${GOLD}` }} />
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 10, color: GOLD, fontWeight: 600 }}>dAIsy haMINJA</div>
          <div style={{ fontFamily: MONO, fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sovereign Sentinel</div>
        </div>
      </div>
    </div>
  )
}

// ── NavLink ────────────────────────────────────────────────────────────────────
function NavLink({ to, label, admin }: NavItem & { active?: boolean }) {
  const isActive = false // SSR-safe — no window.location; active state handled by parent if needed
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
        fontFamily: MONO, fontSize: 10, fontWeight: 700, color: isActive ? GOLD : MUTED,
        letterSpacing: '0.1em', textDecoration: 'none', borderLeft: isActive ? `2px solid ${GOLD}` : '2px solid transparent',
        background: isActive ? `${ACCENT_DIM}` : 'transparent',
        transition: 'color 0.2s, background 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = GOLD; (e.currentTarget as HTMLElement).style.background = ACCENT_DIM } }}
      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = MUTED; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
    >
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? GOLD : 'transparent', flexShrink: 0 }} />
      {label}
    </Link>
  )
}

// ── DashboardLayout ────────────────────────────────────────────────────────────
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: BG, fontFamily: MONO, color: FG }}>
      {/* ── LIVE DATA TICKER ─────────────────────────────── */}
      <div style={{
        height: 28, background: '#060A14', borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          display: 'flex', gap: 32, whiteSpace: 'nowrap', animation: 'marquee 28s linear infinite',
          padding: '0 16px',
        }}>
          {(TICKER_ITEMS.concat(TICKER_ITEMS)).map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: '0.08em' }}>{t.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, color: FG }}>{t.value}</span>
              <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: t.up ? GREEN : RED }}>
                {t.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* ── SIDEBAR ────────────────────────────────────── */}
        <aside style={{
          width: 280, minWidth: 280, background: BG_PANEL, borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header with logo */}
          <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${BORDER}` }}>
            <img
              src="/solvex-header.jpg"
              alt="SolveX Paradox Box"
              style={{ width: '100%', height: 'auto', display: 'block', marginBottom: 8 }}
            />
            <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: GOLD, letterSpacing: '0.12em', textAlign: 'center' }}>
              SOLVEX PARADOX BOX
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 6 }}>
              {['OSFI', 'FINTRAC', 'SOC2', 'PIPEDA'].map(b => (
                <span key={b} style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, color: GREEN, background: `${ACCENT_DIM}`, padding: '2px 5px', borderRadius: 0, letterSpacing: '0.05em' }}>
                  ✓ {b}
                </span>
              ))}
            </div>
          </div>

          {/* OmniscientTerminal */}
          <OmniscientTerminal />

          {/* Navigation */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '6px 14px 2px' }}>
              Sovereignty
            </div>
            {MAIN_NAV.map(item => <NavLink key={item.to} {...item} />)}
          </nav>

          {/* Footer badges */}
          <div style={{ padding: '10px 14px', borderTop: `1px solid ${BORDER}`, background: '#060A14' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              {['OSFI', 'FINTRAC', 'SOC2', 'PIPEDA'].map(b => (
                <span key={b} style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, color: MUTED, padding: '1px 4px', border: `1px solid ${MUTED}` }}>
                  {b}
                </span>
              ))}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, textAlign: 'center', lineHeight: 1.4 }}>
              <a href="mailto:gods.battle.axe.88@gmail.com" style={{ color: GOLD, textDecoration: 'none' }}>
                gods.battle.axe.88@gmail.com
              </a>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ───────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
          {/* Page content */}
          <div style={{ flex: 1, padding: 0 }}>
            {children}
          </div>

          {/* Footer */}
          <footer style={{
            borderTop: `1px solid ${BORDER}`,
            padding: '12px 20px',
            background: '#060A14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <div style={{ fontFamily: SERIF, fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.08em' }}>
              SOLVEX PARADOX BOX ENTERPRISE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <a href="mailto:gods.battle.axe.88@gmail.com" style={{ fontFamily: MONO, fontSize: 9, color: MUTED, textDecoration: 'none' }}>
                gods.battle.axe.88@gmail.com
              </a>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, display: 'flex', alignItems: 'center', gap: 10 }}>
              {['OSFI', 'FINTRAC', 'SOC2', 'PIPEDA'].map(b => (
                <span key={b} style={{ color: MUTED }}>✓ {b}</span>
              ))}
              <span style={{ color: MUTED }}>NIST SP 800-53</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
