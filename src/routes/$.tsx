import { createFileRoute, Link } from '@tanstack/react-router'

const GOLD = '#D4AF37'
const BG = '#05080F'
const MUTED = '#6B7280'
const MONO = '"IBM Plex Mono", monospace'
const SERIF = '"Playfair Display", serif'

export const Route = createFileRoute('/$')({
  head: () => ({
    meta: [{ title: '404 · Paradox Not Found · SolveX' }],
  }),
  component: NotFound,
})

function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: BG, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center', padding: 48 }}>
        <div style={{
          fontFamily: SERIF, fontSize: 120, fontWeight: 900,
          color: GOLD, lineHeight: 1, marginBottom: 8,
          textShadow: `0 0 60px ${GOLD}44`,
        }}>404</div>
        <div style={{
          fontFamily: MONO, fontSize: 14, fontWeight: 600,
          color: GOLD, letterSpacing: '0.2em', marginBottom: 24,
        }}>PARADOX NOT FOUND</div>
        <div style={{
          width: 60, height: 1, background: `${GOLD}44`,
          margin: '0 auto 24px',
        }} />
        <p style={{
          fontFamily: MONO, fontSize: 11, color: MUTED,
          lineHeight: 1.8, maxWidth: 420, margin: '0 auto 32px',
        }}>
          The requested page does not exist in the sovereign mesh.
          Return to the Showroom Floor to browse resolved paradoxes
          and verified enterprise solutions.
        </p>
        <Link to="/" style={{
          fontFamily: MONO, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.12em', color: BG,
          background: GOLD, padding: '12px 32px',
          textDecoration: 'none', display: 'inline-block',
        }}>
          RETURN TO SHOWROOM →
        </Link>
      </div>
    </div>
  )
}
