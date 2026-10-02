import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

const BG = '#05080F'
const GOLD = '#D4AF37'
const GOLD_DIM = '#8B7530'
const WHITE = '#F0EFE9'
const MUTED = '#7A8194'
const PANEL = 'rgba(212, 175, 55, 0.06)'
const BORDER = 'rgba(212, 175, 55, 0.18)'
const MONO = "'IBM Plex Mono', monospace"
const SERIF = "'Playfair Display', serif"

const complianceBadges = [
  'NIST SP 800-53', 'SOC 2 TYPE II', 'ISO 27001',
  'OSFI B-13', 'FINTRAC', 'PIPEDA',
]

const chambers = [
  { symbol: 'ᚱ', name: 'FOUNDATIONS', count: 22, desc: 'Axiomatic closure. Base-rate tautologies, Gödelian anchoring, epistemic ground truth substantiation.' },
  { symbol: '☸', name: 'MOTION & TIME', count: 19, desc: 'Temporal entanglement resolution. Zeno walkthrough, causal-loop containment, relativistic frame alignment.' },
  { symbol: '☥', name: 'CHOICE & SELF', count: 17, desc: 'Free-will substrate. Newcomb decoupling, Buridan decoherence, agentic identity stabilization.' },
  { symbol: '⬡', name: 'STRUCTURE', count: 18, desc: 'Systemic integrity. Ship-of-Theseus snapshots, Chinese Room inversion, mereological boundary enforcement.' },
  { symbol: '👁', name: 'TRANSCENDENCE', count: 12, desc: 'Meta-axiomatic escape. Observer-paradox closure, qualia compression, simulation-regression terminus.' },
]

const tecoeSteps = [
  { label: 'INGRESS', method: 'Paradox Embedding Engine' },
  { label: 'SIGN', method: 'ZK-SNARK Attestation Layer' },
  { label: 'COMPILE', method: 'Semantic Graph Compiler' },
  { label: 'INDEX', method: 'Entropy-Weighted Trie' },
  { label: 'EMIT', method: 'Compliance-Ready Artifact Generator' },
]

const pillBadges = [
  'ZK-SNARK PROVEN', 'OSFI B-13 COMPLIANT', 'PIPEDA READY',
  'ISO 27001 AUDITED', 'HA ZERO-KNOWLEDGE', 'GÖDELIAN SEALED',
]

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'SolveX Paradox Box — Enterprise V3.8' },
      {
        name: 'description',
        content:
          'The Showroom Floor. 88 paradoxes resolved. 105 finished Tier-1 enterprise solutions. Zero-knowledge paradox resolution for regulated institutions.',
      },
      { property: 'og:title', content: 'SolveX Paradox Box — Enterprise V3.8' },
      {
        property: 'og:description',
        content:
          '105 finished Tier-1 enterprise solutions. ZK-SNARK proven, OSFI B-13 compliant paradox resolution.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'theme-color', content: '#05080F' },
    ],
  }),
  component: Home,
})

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (count >= target) return
    const step = Math.max(1, Math.ceil(target / 60))
    const timer = setInterval(() => {
      setCount((prev) => {
        const next = prev + step
        return next >= target ? target : next
      })
    }, 25)
    return () => clearInterval(timer)
  }, [count, target])

  return <span style={{ color: GOLD, fontFamily: MONO, fontWeight: 700 }}>{count}</span>
}

const btnBase: React.CSSProperties = {
  padding: '10px 28px',
  fontFamily: MONO,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  border: `1px solid ${GOLD}`,
  background: 'transparent',
  color: GOLD,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
  transition: 'all 180ms ease',
}

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: GOLD,
  color: BG,
  borderColor: GOLD,
}

function LinkBtn({ to, primary, children }: { to: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        ...btnBase,
        ...(primary ? { background: GOLD, color: BG, borderColor: GOLD } : {}),
      }}
      onMouseEnter={(e) => {
        if (primary) {
          e.currentTarget.style.background = BG
          e.currentTarget.style.color = GOLD
        } else {
          e.currentTarget.style.background = GOLD
          e.currentTarget.style.color = BG
        }
      }}
      onMouseLeave={(e) => {
        if (primary) {
          e.currentTarget.style.background = GOLD
          e.currentTarget.style.color = BG
        } else {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = GOLD
        }
      }}
    >
      {children}
    </Link>
  )
}

function SectionBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: GOLD,
        border: `1px solid ${BORDER}`,
        borderRadius: 0,
        background: PANEL,
      }}
    >
      {label}
    </span>
  )
}

function PillBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '5px 14px',
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: GOLD,
        border: `1px solid ${BORDER}`,
        background: PANEL,
        borderRadius: 0,
      }}
    >
      {label}
    </span>
  )
}

function Home() {
  return (
    <div style={{ backgroundColor: BG, color: WHITE, fontFamily: MONO, minHeight: '100vh' }}>
      {/* ════════════════ HEADER ════════════════ */}
      <header
        style={{
          position: 'relative',
          borderBottom: `1px solid ${BORDER}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            height: 220,
            backgroundImage: 'url(/solvex-header.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.45) saturate(0.4)',
          }}
        />
        {/* Overlay gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, ${BG} 0%, transparent 40%, ${BG} 95%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 40px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <h1
              style={{
                fontFamily: SERIF,
                fontSize: 38,
                fontWeight: 700,
                color: GOLD,
                letterSpacing: '0.02em',
                margin: 0,
                lineHeight: 1,
              }}
            >
              SOLVEX
            </h1>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.10em',
                color: GOLD,
                border: `1px solid ${GOLD}`,
                padding: '3px 10px',
              }}
            >
              ENTERPRISE V3.8
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <LinkBtn to="/marketplace">MARKETPLACE</LinkBtn>
            <LinkBtn to="/brain" primary>BRAIN</LinkBtn>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: SERIF,
              fontSize: 64,
              fontWeight: 700,
              color: WHITE,
              margin: 0,
              letterSpacing: '0.01em',
              lineHeight: 1.1,
              textShadow: `0 0 60px ${BG}`,
            }}
          >
            PARADOX BOX
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: MUTED, letterSpacing: '0.05em' }}>
            ZERO-KNOWLEDGE PARADOX RESOLUTION FOR REGULATED INSTITUTIONS
          </p>
        </div>
      </header>

      {/* ════════════════ HERO ════════════════ */}
      <section style={{ padding: '60px 40px 48px', textAlign: 'center' }}>
        {/* Compliance strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '6px 16px',
            marginBottom: 48,
          }}
        >
          {complianceBadges.map((b) => (
            <span
              key={b}
              style={{
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: MUTED,
              }}
            >
              {b}
            </span>
          ))}
        </div>

        {/* Headline */}
        <p
          style={{
            fontFamily: MONO,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: GOLD,
            margin: '0 0 16px',
          }}
        >
          THE SHOWROOM FLOOR
        </p>

        <h2
          style={{
            fontFamily: SERIF,
            fontSize: 72,
            fontWeight: 700,
            color: WHITE,
            margin: '0 0 8px',
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
          }}
        >
          The Showroom Floor.
        </h2>

        {/* Animated counter */}
        <p style={{ margin: '16px 0 8px', fontSize: 22, fontFamily: MONO, color: WHITE }}>
          <AnimatedCounter target={88} /> Paradoxes Resolved.
        </p>

        {/* Description */}
        <p
          style={{
            maxWidth: 640,
            margin: '16px auto 28px',
            fontSize: 15,
            lineHeight: 1.7,
            color: MUTED,
          }}
        >
          SolveX Paradox Box ships 105 finished Tier-1 solutions — each one cryptographically verified,
          audit-trailed end-to-end, and pre-configured for deployment inside your existing compliance
          envelope. No toy proofs. No academic vapourware. Production-grade resolution artifacts, ready
          for your regulator&apos;s desk.
        </p>

        {/* Badge pills */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 36,
          }}
        >
          {pillBadges.map((p) => (
            <PillBadge key={p} label={p} />
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <LinkBtn to="/marketplace" primary>
            ACCESS THE 105 SOLUTIONS →
          </LinkBtn>
          <LinkBtn to="/brain">EXPLORE THE KNOWLEDGE GRAPH</LinkBtn>
        </div>
      </section>

      {/* ════════════════ GLASS BOX DIAGRAM ════════════════ */}
      <section style={{ padding: '64px 40px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontFamily: MONO, fontSize: 12, color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
            THE ARCHITECT&apos;S TRANSLUCENCE FRAMEWORK
          </p>
          <h3 style={{ fontFamily: SERIF, fontSize: 42, fontWeight: 700, color: WHITE, margin: 0, letterSpacing: '-0.01em' }}>
            Crystal Clear Black Box
          </h3>
          <p style={{ margin: '8px auto 0', maxWidth: 520, fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            Full observability without exposing proprietary resolution logic. Glass walls around an opaque core.
          </p>
        </div>

        <div
          style={{
            maxWidth: 820,
            margin: '0 auto',
            border: `1px solid ${GOLD_DIM}`,
            padding: 32,
            background: PANEL,
            position: 'relative',
          }}
        >
          {/* Glass Box outer layer */}
          <div
            style={{
              border: `1px dashed ${GOLD_DIM}`,
              padding: 28,
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: -10,
                left: 16,
                background: BG,
                padding: '2px 12px',
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: GOLD,
                textTransform: 'uppercase',
              }}
            >
              GLASS BOX — OBSERVABILITY LAYER
            </span>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, marginBottom: 20 }}>
              {['ENTROPY AUDIT', 'COMPLIANCE TRACE', 'PROOF LEDGER', 'RESOLUTION LOG', 'ACCESS CONTROL'].map((item) => (
                <span
                  key={item}
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: MUTED,
                    border: `1px solid ${BORDER}`,
                    padding: '4px 10px',
                  }}
                >
                  {item}
                </span>
              ))}
            </div>

            {/* Black Box inner */}
            <div
              style={{
                border: `2px solid ${GOLD_DIM}`,
                padding: 20,
                background: BG,
              }}
            >
              <span
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.10em',
                  color: GOLD,
                  textTransform: 'uppercase',
                  marginBottom: 14,
                }}
              >
                BLACK BOX — CLASSIFIED RESOLUTION ENGINE
              </span>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 8,
                }}
              >
                {chambers.map((ch) => (
                  <div
                    key={ch.name}
                    style={{
                      border: `1px solid ${BORDER}`,
                      padding: '10px 8px',
                      textAlign: 'center',
                      background: 'rgba(5, 8, 15, 0.6)',
                    }}
                  >
                    <span style={{ fontSize: 18, display: 'block', marginBottom: 4 }}>{ch.symbol}</span>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: GOLD,
                        textTransform: 'uppercase',
                      }}
                    >
                      {ch.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Autonomous Manager panel */}
          <div
            style={{
              marginTop: 16,
              border: `1px solid ${GOLD}`,
              padding: '10px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: GOLD, letterSpacing: '0.06em' }}>
              AUTONOMOUS MANAGER: dAIsy haMINJA
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>
              ACTIVE · ORCHESTRATION LAYER · SELF-HEALING
            </span>
          </div>

          {/* Emergency Protocol panel */}
          <div
            style={{
              marginTop: 8,
              border: `1px solid ${BORDER}`,
              padding: '8px 16px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: '0.06em' }}>
              EMERGENCY PROTOCOL: INSTANT PARADOX CONTAINMENT · CIRCUIT BREAKER · HUMAN-IN-THE-LOOP OVERRIDE
            </span>
          </div>
        </div>
      </section>

      {/* ════════════════ 5 CHAMBERS GRID ════════════════ */}
      <section style={{ padding: '64px 40px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontFamily: MONO, fontSize: 12, color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            CLASSIFIED ARCHITECTURE
          </p>
          <h3 style={{ fontFamily: SERIF, fontSize: 42, fontWeight: 700, color: WHITE, margin: 0, letterSpacing: '-0.01em' }}>
            The Five Chambers
          </h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 1,
            maxWidth: 1100,
            margin: '0 auto',
            background: BORDER,
          }}
        >
          {chambers.map((ch) => (
            <div
              key={ch.name}
              style={{
                background: BG,
                padding: '28px 20px',
                textAlign: 'center',
                border: `1px solid ${BORDER}`,
                transition: 'background 200ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = PANEL
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = BG
              }}
            >
              <span style={{ fontSize: 36, display: 'block', marginBottom: 10 }}>{ch.symbol}</span>
              <p
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.10em',
                  color: GOLD,
                  margin: '0 0 4px',
                  textTransform: 'uppercase',
                }}
              >
                CHAMBER {['I', 'II', 'III', 'IV', 'V'][chambers.indexOf(ch)]} — {ch.name}
              </p>
              <p
                style={{
                  fontFamily: SERIF,
                  fontSize: 28,
                  fontWeight: 700,
                  color: WHITE,
                  margin: '6px 0',
                }}
              >
                {ch.count}
              </p>
              <p style={{ fontFamily: MONO, fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>
                PARADOXES RESOLVED
              </p>
              <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                {ch.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════ TECOE PIPELINE ════════════════ */}
      <section style={{ padding: '64px 40px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontFamily: MONO, fontSize: 12, color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            RESOLUTION PIPELINE
          </p>
          <h3 style={{ fontFamily: SERIF, fontSize: 42, fontWeight: 700, color: WHITE, margin: 0, letterSpacing: '-0.01em' }}>
            TECOE Pipeline
          </h3>
          <p style={{ margin: '8px auto 0', maxWidth: 480, fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            Every paradox traverses five stages — from raw ingestion to cryptographically sealed emission.
          </p>
        </div>

        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'stretch',
            flexWrap: 'wrap',
          }}
        >
          {tecoeSteps.map((step, i) => (
            <div
              key={step.label}
              style={{
                flex: '1 1 160px',
                border: `1px solid ${BORDER}`,
                padding: '24px 16px',
                textAlign: 'center',
                background: PANEL,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 128,
              }}
            >
              {/* Arrow connector */}
              {i < tecoeSteps.length - 1 && (
                <span
                  style={{
                    position: 'absolute',
                    right: -8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: GOLD_DIM,
                    fontSize: 18,
                    zIndex: 1,
                    fontFamily: MONO,
                  }}
                >
                  →
                </span>
              )}
              <span
                style={{
                  fontFamily: SERIF,
                  fontSize: 32,
                  fontWeight: 700,
                  color: GOLD,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][i]}
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.10em',
                  color: WHITE,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {step.label}
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  color: MUTED,
                  letterSpacing: '0.04em',
                  lineHeight: 1.4,
                }}
              >
                {step.method}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════ CTA SECTION ════════════════ */}
      <section
        style={{
          padding: '72px 40px',
          borderTop: `1px solid ${BORDER}`,
          textAlign: 'center',
          background: PANEL,
        }}
      >
        <blockquote
          style={{
            maxWidth: 600,
            margin: '0 auto 32px',
            fontFamily: SERIF,
            fontSize: 28,
            fontWeight: 500,
            fontStyle: 'italic',
            color: WHITE,
            letterSpacing: '0.01em',
            lineHeight: 1.4,
          }}
        >
          &ldquo;The black box was never the problem. The problem was that nobody built glass walls
          around it — until now.&rdquo;
        </blockquote>
        <p
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: GOLD,
            letterSpacing: '0.06em',
            marginBottom: 28,
          }}
        >
          — SOLVEX PARADOX BOX · ENTERPRISE V3.8
        </p>
        <LinkBtn to="/marketplace" primary>
          ACCESS THE 105 ENTERPRISE SOLUTIONS →
        </LinkBtn>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer
        style={{
          borderTop: `1px solid ${BORDER}`,
          padding: '32px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: GOLD, letterSpacing: '0.03em' }}>
          SOLVEX
        </span>
        <a
          href="mailto:gods.battle.axe.88@gmail.com"
          style={{
            fontFamily: MONO,
            fontSize: 12,
            color: MUTED,
            textDecoration: 'none',
            letterSpacing: '0.04em',
          }}
        >
          gods.battle.axe.88@gmail.com
        </a>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: MUTED,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          OSFI B-13 · PIPEDA · ISO 27001 · ZK-SNARK PROVEN
        </span>
      </footer>
    </div>
  )
}
