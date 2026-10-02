import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '48px 24px', minHeight: 200, fontFamily: '"IBM Plex Mono",monospace',
          color: '#6B7280', background: '#05080F', border: '1px solid #1A2235',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#D4AF37', marginBottom: 12, textTransform: 'uppercase' }}>
            ⚠ Sovereign Fault
          </div>
          <div style={{ fontSize: 10, color: '#E0E0E0', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
            {this.state.error?.message ?? 'An unexpected error occurred in the U.A.R.E.F.A.K.E. pipeline.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 16, fontFamily: '"IBM Plex Mono",monospace', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.1em', padding: '8px 18px', cursor: 'pointer',
              color: '#05080F', background: '#D4AF37', border: 'none', textTransform: 'uppercase',
            }}
          >
            Re-Establish Link
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
