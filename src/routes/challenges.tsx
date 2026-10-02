import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PARADOXES, CHAMBER_META, getChamberForParadox } from '@/data/brainData'

const GOLD = '#D4AF37'
const BG = '#05080F'
const BG_PANEL = '#0A0F1A'
const FG = '#E0E0E0'
const MUTED = '#6B7280'
const BORDER = '#1A2235'
const ACCENT_DIM = '#162040'
const MONO = '"IBM Plex Mono", "Courier New", monospace'
const SERIF = '"Playfair Display", "Georgia", serif'

const KEYFRAMES = `
@keyframes fadeInCard {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
  }
}
`

function ParadoxCard({ paradox, symbol, index }: { paradox: typeof PARADOXES[number]; symbol: string; index: number }) {
  const chamber = getChamberForParadox(paradox.id)
  return (
    <div
      style={{
        background: BG_PANEL,
        border: `1px solid ${BORDER}`,
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
        animation: `fadeInCard 0.30s ease-out both`,
        animationDelay: `${Math.min(index * 25, 250)}ms`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = chamber.color
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${chamber.color}14`
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = BORDER
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: SERIF, fontSize: 20, color: chamber.color, lineHeight: 1,
          minWidth: 24, textAlign: 'center',
        }}>
          {symbol}
        </span>
        <span style={{
          fontFamily: MONO, fontSize: 9, fontWeight: 700, color: GOLD,
          letterSpacing: '0.08em', background: ACCENT_DIM, padding: '2px 8px',
          border: `1px solid ${BORDER}`,
        }}>
          #{String(paradox.id).padStart(2, '0')}
        </span>
        <span style={{
          fontFamily: MONO, fontSize: 8, fontWeight: 600, color: MUTED,
          letterSpacing: '0.06em', textTransform: 'uppercase', marginLeft: 'auto',
        }}>
          CHAMBER {chamber.num}
        </span>
      </div>
      <h3 style={{
        fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: chamber.color,
        lineHeight: 1.35, margin: 0,
      }}>
        {paradox.name}
      </h3>
      <p style={{
        fontFamily: MONO, fontSize: 10, lineHeight: 1.6,
        color: 'rgba(200,210,225,0.55)', margin: 0,
      }}>
        {paradox.description}
      </p>
    </div>
  )
}

export const Route = createFileRoute('/challenges')({
  head: () => ({
    meta: [{ title: 'Challenge Hub · SolveX' }],
  }),
  component: ChallengeHub,
})

const CHAMBER_RUNE_MAP: Record<number, string> = { 1: 'ᚱ', 2: '☸', 3: '𓁙', 4: '⬢', 5: '👁' }

function ChallengeHub() {
  const [activeChamber, setActiveChamber] = useState(1)

  const filteredParadoxes = useMemo(() => {
    return PARADOXES.filter((p) => p.chamber === activeChamber)
  }, [activeChamber])

  const activeMeta = CHAMBER_META[activeChamber - 1]

  return (
    <DashboardLayout>
      <style>{KEYFRAMES}</style>

      {/* ── Page marquee ── */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{
          whiteSpace: 'nowrap', animation: 'marquee 28s linear infinite',
          padding: '8px 0',
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em',
          color: 'rgba(212,175,55,0.40)', textTransform: 'uppercase',
        }}>
          {'CHALLENGE HUB · 59 PARADOXES · 5 CHAMBERS · THE PARADOX RESOLUTION MATRIX · '}
          {'CHALLENGE HUB · 59 PARADOXES · 5 CHAMBERS · THE PARADOX RESOLUTION MATRIX · '}
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ padding: '36px 32px 24px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: SERIF, fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 700,
          color: GOLD, lineHeight: 1.15, letterSpacing: '-0.01em', margin: 0,
        }}>
          Challenge Hub
        </h1>
        <p style={{
          fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.10em',
          textTransform: 'uppercase', margin: '8px 0 0',
        }}>
          59 Paradoxes · 5 Chambers of Resolution
        </p>
      </div>

      {/* ── Chamber Tabs ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        padding: '0 20px 6px', borderBottom: `1px solid ${BORDER}`,
        margin: '0 24px',
      }}>
        {CHAMBER_META.map((chamber) => {
          const active = activeChamber === Number(chamber.num)
          const cIdx = Number(chamber.num)
          return (
            <button
              key={chamber.num}
              onClick={() => setActiveChamber(cIdx)}
              style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '12px 20px',
                color: active ? BG : chamber.color,
                background: active ? chamber.color : 'transparent',
                border: active ? `1px solid ${chamber.color}` : `1px solid ${BORDER}`,
                cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                minWidth: 115,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = `${chamber.color}15`
                  ;(e.currentTarget as HTMLElement).style.borderColor = chamber.color
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.borderColor = BORDER
                }
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{CHAMBER_RUNE_MAP[cIdx]}</span>
              <span style={{ fontSize: 8 }}>{chamber.num} · {chamber.name}</span>
              <span style={{ fontSize: 7, color: active ? BG : MUTED }}>
                {chamber.paradoxes} PARADOXES
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Active Chamber Info ── */}
      {activeMeta && (
        <div style={{
          padding: '14px 32px',
          background: `${activeMeta.color}08`,
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>{CHAMBER_RUNE_MAP[activeChamber]}</span>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: activeMeta.color }}>
              Chamber {activeMeta.num}: {activeMeta.name}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 2 }}>
              {activeMeta.desc}
            </div>
          </div>
          <span style={{
            marginLeft: 'auto', fontFamily: MONO, fontSize: 9, fontWeight: 700,
            color: activeMeta.color, letterSpacing: '0.08em',
          }}>
            {activeMeta.paradoxes} PARADOXES
          </span>
        </div>
      )}

      {/* ── Paradox Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 14, padding: 24, flex: 1,
      }}>
        {filteredParadoxes.map((p, i) => (
          <ParadoxCard
            key={p.id}
            paradox={p}
            symbol={CHAMBER_RUNE_MAP[p.chamber]}
            index={i}
          />
        ))}
      </div>

      {/* ── Count footer ── */}
      <div style={{
        padding: '20px 32px', textAlign: 'center',
        borderTop: `1px solid ${BORDER}`,
      }}>
        <span style={{
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em',
          color: MUTED, textTransform: 'uppercase',
        }}>
          {filteredParadoxes.length} OF {PARADOXES.length} PARADOXES · CHALLENGE HUB
        </span>
      </div>
    </DashboardLayout>
  )
}
