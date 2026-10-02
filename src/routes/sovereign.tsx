import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { SOVEREIGN_SOLUTIONS, SOLUTION_LAYERS } from '@/data/brainData'

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

function SolutionCard({ solution, index }: { solution: typeof SOVEREIGN_SOLUTIONS[number]; index: number }) {
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
        (e.currentTarget as HTMLElement).style.borderColor = GOLD
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(212,175,55,0.06)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = BORDER
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: MONO, fontSize: 9, fontWeight: 700, color: GOLD,
          letterSpacing: '0.08em', background: ACCENT_DIM, padding: '2px 8px',
          border: `1px solid ${BORDER}`,
        }}>
          {solution.id}
        </span>
        <span style={{
          fontFamily: MONO, fontSize: 8, fontWeight: 600, color: MUTED,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          LAYER {solution.layer}
        </span>
      </div>
      <h3 style={{
        fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: GOLD,
        lineHeight: 1.35, margin: 0,
      }}>
        {solution.name}
      </h3>
      <p style={{
        fontFamily: MONO, fontSize: 10, lineHeight: 1.6,
        color: 'rgba(200,210,225,0.55)', margin: 0,
      }}>
        {solution.description}
      </p>
    </div>
  )
}

export const Route = createFileRoute('/sovereign')({
  head: () => ({
    meta: [{ title: 'Sovereign Console · SolveX' }],
  }),
  component: Sovereign,
})

function Sovereign() {
  const [activeLayer, setActiveLayer] = useState(1)

  const filteredSolutions = useMemo(() => {
    return SOVEREIGN_SOLUTIONS.filter((s) => s.layer === activeLayer)
  }, [activeLayer])

  const activeLayerMeta = SOLUTION_LAYERS.find((l) => l.num === activeLayer)

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
          {'SOVEREIGN CONSOLE · 105 SOLUTIONS · 7 LAYERS · FULL-STACK ENTERPRISE RESOLUTIONS · '}
          {'SOVEREIGN CONSOLE · 105 SOLUTIONS · 7 LAYERS · FULL-STACK ENTERPRISE RESOLUTIONS · '}
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ padding: '36px 32px 24px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: SERIF, fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 700,
          color: GOLD, lineHeight: 1.15, letterSpacing: '-0.01em', margin: 0,
        }}>
          Sovereign Console
        </h1>
        <p style={{
          fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.10em',
          textTransform: 'uppercase', margin: '8px 0 0',
        }}>
          105 Solutions · 7 Architecture Layers
        </p>
      </div>

      {/* ── Layer Navigation ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        padding: '0 20px 6px', borderBottom: `1px solid ${BORDER}`,
        margin: '0 24px',
      }}>
        {SOLUTION_LAYERS.map((layer) => {
          const active = activeLayer === layer.num
          return (
            <button
              key={layer.num}
              onClick={() => setActiveLayer(layer.num)}
              style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '10px 16px',
                color: active ? BG : layer.color,
                background: active ? layer.color : 'transparent',
                border: active ? `1px solid ${layer.color}` : `1px solid ${BORDER}`,
                cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                minWidth: 100,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = `${layer.color}15`
                  ;(e.currentTarget as HTMLElement).style.borderColor = layer.color
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.borderColor = BORDER
                }
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{layer.symbol}</span>
              <span style={{ fontSize: 7, color: active ? BG : MUTED }}>
                L{layer.num} · {layer.solutions}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Active Layer Info ── */}
      {activeLayerMeta && (
        <div style={{
          padding: '14px 32px',
          background: `${activeLayerMeta.color}08`,
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{activeLayerMeta.symbol}</span>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: activeLayerMeta.color }}>
              {activeLayerMeta.name}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 2 }}>
              {activeLayerMeta.desc}
            </div>
          </div>
          <span style={{
            marginLeft: 'auto', fontFamily: MONO, fontSize: 9, fontWeight: 700,
            color: activeLayerMeta.color, letterSpacing: '0.08em',
          }}>
            {activeLayerMeta.solutions} SOLUTIONS
          </span>
        </div>
      )}

      {/* ── Solution Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 14, padding: 24, flex: 1,
      }}>
        {filteredSolutions.map((s, i) => (
          <SolutionCard key={s.id} solution={s} index={i} />
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
          {filteredSolutions.length} OF {SOVEREIGN_SOLUTIONS.length} SOLUTIONS · SOVEREIGN CONSOLE
        </span>
      </div>
    </DashboardLayout>
  )
}
