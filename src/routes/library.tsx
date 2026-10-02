import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { SOVEREIGN_SOLUTIONS, PARADOXES, BRAIN_PRODUCTS, CHAMBER_META } from '@/data/brainData'

const G = '#D4AF37'; const BG = '#05080F'; const BGP = '#0A0F1A'; const FG = '#E0E0E0'
const M = '#6B7280'; const BR = '#1A2235'; const AD = '#162040'
const MNO = '"IBM Plex Mono", "Courier New", monospace'
const SRF = '"Playfair Display", "Georgia", serif'
const CH_SYM: Record<number, string> = { 1: 'ᚱ', 2: '☸', 3: '𓁙', 4: '⬢', 5: '👁' }
const CH_RANGE: Record<number, { min: number; max: number }> = {
  1: { min: 1, max: 13 }, 2: { min: 14, max: 23 }, 3: { min: 24, max: 38 },
  4: { min: 39, max: 48 }, 5: { min: 49, max: 59 },
}
const LY_CLR: Record<number, string> = {
  1: '#60A5FA', 2: '#A78BFA', 3: '#34D399', 4: '#F59E0B', 5: '#F87171', 6: G, 7: '#E879F9',
}

const KF = `@keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-delay:0ms!important}}`

const sCard: React.CSSProperties = {
  background: BGP, border: `1px solid ${BR}`, padding: '14px 16px',
  display: 'flex', flexDirection: 'column', gap: 8,
  transition: 'border-color .2s, transform .2s, box-shadow .2s',
}
const cardHoverIn = (el: HTMLElement, clr: string) => {
  el.style.borderColor = clr; el.style.transform = 'translateY(-2px)'
  el.style.boxShadow = `0 6px 24px ${clr}14`
}
const cardHoverOut = (el: HTMLElement) => {
  el.style.borderColor = BR; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'
}

type CardProps = { clr: string; idx: number; children: React.ReactNode }

function Card({ clr, idx, children }: CardProps) {
  return (
    <div
      style={{ ...sCard, borderLeft: `2px solid ${clr}`, animation: `fi .30s ease-out both`, animationDelay: `${Math.min(idx * 20, 250)}ms` }}
      onMouseEnter={e => cardHoverIn(e.currentTarget as HTMLElement, clr)}
      onMouseLeave={e => cardHoverOut(e.currentTarget as HTMLElement)}
    >
      {children}
    </div>
  )
}

export const Route = createFileRoute('/library')({
  head: () => ({ meta: [{ title: 'Solution Library · SolveX' }] }),
  component: Library,
})

function Library() {
  const [ch, setCh] = useState<number | null>(null)
  const range = ch ? CH_RANGE[ch] : null
  const chClr = ch ? CHAMBER_META[ch - 1].color : G
  
  const { cParadoxes, cSolutions } = useMemo(() => ({
    cParadoxes: range
      ? PARADOXES.filter(p => p.id >= range.min && p.id <= range.max)
      : PARADOXES,
    cSolutions: SOVEREIGN_SOLUTIONS,
  }), [range])

  const uniqLy = new Set(SOVEREIGN_SOLUTIONS.map(s => s.layer)).size

  return (
    <DashboardLayout>
      <style>{KF}</style>

      {/* Marquee */}
      <div style={{ borderBottom: `1px solid ${BR}`, overflow: 'hidden' }}>
        <div style={{ whiteSpace: 'nowrap', animation: 'marquee 28s linear infinite', padding: '8px 0', fontFamily: MNO, fontSize: 10, letterSpacing: '.12em', color: 'rgba(212,175,55,.40)', textTransform: 'uppercase' }}>
          {'SOLUTION LIBRARY · 59 PARADOXES · 105 SOLUTIONS · 13 PRODUCTS · THE COMPLETE RESOLUTION CATALOG · '.repeat(2)}
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '32px 32px 20px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: SRF, fontSize: 'clamp(26px,4vw,44px)', fontWeight: 700, color: G, lineHeight: 1.15, margin: 0 }}>Solution Library</h1>
        <p style={{ fontFamily: MNO, fontSize: 10, color: M, letterSpacing: '.10em', textTransform: 'uppercase', margin: '8px 0 0' }}>The Complete Resolution Catalog</p>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: `1px solid ${BR}`, borderBottom: `1px solid ${BR}`, background: BGP }}>
        {[
          { l: 'Paradoxes', v: 59, c: '#60A5FA' }, { l: 'Solutions', v: 105, c: G },
          { l: 'Products', v: 13, c: '#34D399' }, { l: 'Chambers', v: 5, c: '#A78BFA' }, { l: 'Layers', v: uniqLy, c: '#F59E0B' },
        ].map((s, i) => (
          <div key={s.l} style={{ padding: '14px 22px', borderRight: i < 4 ? `1px solid ${BR}` : 'none', flex: '1 1 0', minWidth: 110, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: MNO, fontSize: 8, fontWeight: 700, letterSpacing: '.10em', color: M, textTransform: 'uppercase' }}>{s.l}</span>
            <span style={{ fontFamily: SRF, fontSize: 26, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</span>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, padding: '14px 24px' }}>
        <button onClick={() => setCh(null)} style={{
          fontFamily: MNO, fontSize: 9, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase',
          padding: '7px 18px', color: ch === null ? BG : G, background: ch === null ? G : AD,
          border: ch === null ? `1px solid ${G}` : `1px solid ${BR}`, cursor: 'pointer', transition: 'all .2s',
        }}>ALL CHAMBERS</button>
        {CHAMBER_META.map(c => {
          const cn = Number(c.num); const act = ch === cn
          return (
            <button key={c.num} onClick={() => setCh(cn)} style={{
              fontFamily: MNO, fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
              padding: '7px 14px', color: act ? BG : c.color, background: act ? c.color : AD,
              border: act ? `1px solid ${c.color}` : `1px solid ${BR}`, cursor: 'pointer', transition: 'all .2s',
              display: 'flex', alignItems: 'center', gap: 5,
            }} onMouseEnter={e => { if (!act) { const t = e.currentTarget as HTMLElement; t.style.borderColor = c.color; t.style.color = c.color } }}
               onMouseLeave={e => { if (!act) { const t = e.currentTarget as HTMLElement; t.style.borderColor = BR; t.style.color = c.color } }}>
              <span style={{ fontSize: 13 }}>{CH_SYM[cn]}</span>{c.num} · {c.name}
            </button>
          )
        })}
      </div>

      {/* Filter indicator */}
      {ch && (
        <div style={{ padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 10, background: `${chClr}08`, borderTop: `1px solid ${BR}`, borderBottom: `1px solid ${BR}` }}>
          <span style={{ fontSize: 18 }}>{CH_SYM[ch]}</span>
          <span style={{ fontFamily: SRF, fontSize: 14, fontWeight: 600, color: chClr }}>Chamber {ch}: {CHAMBER_META[ch - 1].name}</span>
          <span style={{ marginLeft: 'auto', fontFamily: MNO, fontSize: 9, color: M }}>{cParadoxes.length} paradoxes matching</span>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Paradoxes */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>☸</span>
            <h2 style={{ fontFamily: SRF, fontSize: 15, fontWeight: 600, color: '#60A5FA', margin: 0 }}>Paradoxes</h2>
            <span style={{ fontFamily: MNO, fontSize: 8, color: M }}>{cParadoxes.length} entries</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 8 }}>
            {cParadoxes.map((p, i) => (
              <Card key={`p-${p.id}`} clr="#60A5FA" idx={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: SRF, fontSize: 15, color: '#60A5FA' }}>{CH_SYM[p.chamber]}</span>
                  <span style={{ fontFamily: MNO, fontSize: 7, fontWeight: 700, color: G, letterSpacing: '.06em', background: AD, padding: '2px 6px', border: `1px solid ${BR}` }}>#{String(p.id).padStart(2,'0')}</span>
                </div>
                <div style={{ fontFamily: SRF, fontSize: 12, fontWeight: 600, color: '#60A5FA', lineHeight: 1.35 }}>{p.name}</div>
                <div style={{ fontFamily: MNO, fontSize: 8, lineHeight: 1.5, color: 'rgba(200,210,225,.50)' }}>{p.description}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* Solutions */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>◈</span>
            <h2 style={{ fontFamily: SRF, fontSize: 15, fontWeight: 600, color: G, margin: 0 }}>Sovereign Solutions</h2>
            <span style={{ fontFamily: MNO, fontSize: 8, color: M }}>{cSolutions.length} entries</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 7 }}>
            {cSolutions.slice(0, 42).map((s, i) => {
              const lc = LY_CLR[s.layer] ?? G
              return (
                <Card key={`s-${s.id}`} clr={lc} idx={i}>
                  <span style={{ fontFamily: MNO, fontSize: 7, fontWeight: 700, color: lc, letterSpacing: '.05em', textTransform: 'uppercase' }}>{s.id} · L{s.layer}</span>
                  <div style={{ fontFamily: SRF, fontSize: 11, fontWeight: 600, color: lc, lineHeight: 1.3 }}>{s.name}</div>
                </Card>
              )
            })}
            {cSolutions.length > 42 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, border: `1px solid ${BR}`, background: BGP, fontFamily: MNO, fontSize: 9, color: M }}>
                +{cSolutions.length - 42} more solutions
              </div>
            )}
          </div>
        </section>

        {/* Products */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>⬢</span>
            <h2 style={{ fontFamily: SRF, fontSize: 15, fontWeight: 600, color: '#34D399', margin: 0 }}>Brain Products</h2>
            <span style={{ fontFamily: MNO, fontSize: 8, color: M }}>{BRAIN_PRODUCTS.length} entries</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 8 }}>
            {BRAIN_PRODUCTS.map((bp, i) => (
              <Card key={bp.id} clr="#34D399" idx={i}>
                <span style={{ fontFamily: MNO, fontSize: 7, fontWeight: 700, color: M, letterSpacing: '.06em', textTransform: 'uppercase' }}>{bp.category}</span>
                <div style={{ fontFamily: SRF, fontSize: 12, fontWeight: 600, color: '#34D399', lineHeight: 1.35 }}>{bp.name}</div>
                <div style={{ fontFamily: MNO, fontSize: 8, lineHeight: 1.5, color: 'rgba(200,210,225,.50)' }}>{bp.description}</div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div style={{ padding: '18px 32px', textAlign: 'center', borderTop: `1px solid ${BR}` }}>
        <span style={{ fontFamily: MNO, fontSize: 9, letterSpacing: '.1em', color: M, textTransform: 'uppercase' }}>
          {ch ? `${cParadoxes.length} PARADOXES MATCHING · CHAMBER ${ch}` : 'FULL CATALOG · 59 PARADOXES · 105 SOLUTIONS · 13 PRODUCTS'}
        </span>
      </div>
    </DashboardLayout>
  )
}
