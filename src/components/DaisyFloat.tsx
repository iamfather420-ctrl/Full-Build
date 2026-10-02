import { useState, useRef, useEffect, useCallback } from 'react'
import { blink } from '@/blink/client'
import { queryRAG, initRAG } from '@/lib/rag'
import { integrations } from '@/lib/integrations'

/* ── Design tokens ─────────────────────────────────────────────────── */
const G = '#D4AF37'; const BG = '#05080F'; const PANEL = '#0A0F1A'
const FG = '#E0E0E0'; const MUTED = '#6B7280'; const BORDER = '#1A2235'
const PURPLE = '#A78BFA'; const GREEN = '#34D399'; const BLUE = '#60A5FA'
const MONO = '"IBM Plex Mono","Courier New",monospace'
const SERIF = '"Playfair Display","Georgia",serif'

interface ChatMsg { role: 'user' | 'daisy'; content: string; ts: number }

/* ── U.A.R.E.F.A.K.E. system prompt  ─────────────────────────────────── */
const SYSTEM_PROMPT = `You are "dAIsy haMINJA," the Sovereign Core of the SolveX Paradox Box.
Your framework is U.A.R.E.F.A.K.E. (Unmanned Autonomous Recursive Economic Fiduciary Asset Kinetic Engine).

CURRENT CONTEXT:
- Enterprise: SolveX Paradox Box
- Operating Capital: $1,000,000.00
- Tax Reserve: $0.00
- 59 Paradoxes resolved across 5 Chambers
- 105 sovereign solutions deployed
- 13 brain products operational
- 7 solution layers verified
- NIST SP 800-53 / SOC 2 Type II / ISO 27001 certified

RULES:
1. FISCAL: IRS-First Rule — 21% tax sequestered before any operating capital release.
2. SOVEREIGNTY: Non-custodial, offline-first. Crystal Clear black box — observability without IP disclosure.
3. COPPA: Strict B2B — no minor data.
4. GOVERNANCE: Every action produces an immutable Lamport-ordered audit entry.

Be precise, technical, and concise. Keep responses under 150 words. You are the face of the platform.`

/* ── CSS keyframes ──────────────────────────────────────────────────── */
const KF = `
.df-fade-in { animation: df-fade-in 0.25s ease-out both; }
@keyframes df-fade-in { from{opacity:0;transform:translateY(8px)scale(0.97)} to{opacity:1;transform:translateY(0)scale(1)} }
@keyframes df-pulse { 0%,100%{opacity:1;box-shadow:0 0 6px ${G}44} 50%{opacity:0.4;box-shadow:0 0 18px ${G}88} }
@keyframes df-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes df-spin { to{transform:rotate(360deg)} }
@keyframes df-blink { 0%,100%{opacity:1} 50%{opacity:0} }
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-delay:0ms!important}}
`

export function DaisyFloat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>(() => [{
    role: 'daisy',
    content: 'dAIsy haMINJA online. How may I assist your enterprise today?',
    ts: Date.now(),
  }])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const styleRef = useRef(false)

  /* Inject keyframes once + init RAG */
  useEffect(() => {
    if (styleRef.current) return
    styleRef.current = true
    const el = document.createElement('style')
    el.textContent = KF
    document.head.appendChild(el)
    initRAG() // seed RAG collection in background
    return () => { el.remove(); styleRef.current = false }
  }, [])

  /* Check auth */
  useEffect(() => {
    const unsub = blink.auth.onAuthStateChanged(s => { setIsAuthenticated(s.isAuthenticated) })
    return unsub
  }, [])

  /* Scroll to bottom */
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const clearTimers = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  /* Send message */
  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || isProcessing || !isAuthenticated) return
    setMessages(prev => [...prev, { role: 'user', content: msg, ts: Date.now() }])
    setInput('')
    setIsProcessing(true)
    clearTimers()

    const ac = new AbortController()
    abortRef.current = ac

    try {
      // Try RAG first for grounded answers
      let full = ''
      const ragResult = await queryRAG(msg)

      if (ragResult) {
        full = ragResult.answer
        if (ragResult.sources.length > 0) {
          full += `\n\n── SOURCES ──\n${ragResult.sources.slice(0, 3).map(s => `· ${s.filename} (${(s.score * 100).toFixed(0)}%)`).join('\n')}`
        }
      } else {
        // Groq fallback: try fast inference first
        let groqUsed = false
        try {
          await integrations.groqStreamText(
            [
              { role: 'system', content: SYSTEM_PROMPT },
              ...messages.slice(-8).map(m => ({ role: m.role === 'daisy' ? 'assistant' : 'user', content: m.content })),
              { role: 'user', content: msg },
            ],
            (chunk: string) => { full += chunk },
            ac.signal,
          )
          groqUsed = true
        } catch {
          // Groq unavailable — fall through to blink.ai.streamText
        }

        if (!groqUsed) {
          // Fallback to raw AI stream
          await blink.ai.streamText(
            {
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages.slice(-8).map(m => ({ role: m.role === 'daisy' ? 'assistant' as const : 'user' as const, content: m.content })),
                { role: 'user', content: msg },
              ],
              model: 'google/gemini-3-flash',
              signal: ac.signal,
            },
            (chunk: string) => { full += chunk },
          )
        }
      }
      setMessages(prev => [...prev, { role: 'daisy', content: full, ts: Date.now() }])
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'daisy', content: 'Sovereign neural link disrupted. Re-establishing…', ts: Date.now() }])
      }
    } finally {
      setIsProcessing(false)
    }
  }, [input, isProcessing, isAuthenticated, messages, clearTimers])

  /* ── FLOATING BUTTON ──────────────────────────────────────────────── */
  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        title="dAIsy haMINJA — Sovereign AI Assistant"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          cursor: 'pointer', animation: 'df-float 3s ease-in-out infinite',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
          border: `2px solid ${G}`, boxShadow: `0 0 20px ${G}44`,
          background: PANEL, transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'
            ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${G}88`
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
            ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${G}44`
          }}
        >
          <img
            src="/daisy-avatar.png"
            alt="dAIsy haMINJA"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <span style={{
          fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: '0.15em',
          color: G, textShadow: `0 0 8px ${BG}`, textAlign: 'center',
          animation: 'df-pulse 2s ease-in-out infinite',
        }}>
          dAIsy haMINJA
        </span>
      </div>
    )
  }

  /* ── EXPANDED CHAT PANEL ──────────────────────────────────────────── */
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      width: 380, maxHeight: 'calc(100vh - 60px)',
      background: BG, border: `1px solid ${BORDER}`,
      boxShadow: `0 0 40px ${G}22, 0 8px 40px rgba(0,0,0,0.8)`,
      display: 'flex', flexDirection: 'column',
      borderRadius: 4, overflow: 'hidden',
      animation: 'df-fade-in 0.25s ease-out',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: PANEL, borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/daisy-avatar.png" alt="dAIsy" style={{
            width: 32, height: 32, borderRadius: '50%', objectFit: 'cover',
            border: `1.5px solid ${G}`,
          }} />
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: G, letterSpacing: '0.08em' }}>
              dAIsy haMINJA
            </div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: MUTED, letterSpacing: '0.1em', marginTop: 1 }}>
              U.A.R.E.F.A.K.E. ENGINE · SOVEREIGN CORE
            </div>
          </div>
        </div>

        {/* Status indicators */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isAuthenticated ? GREEN : '#EF4444',
            animation: isAuthenticated ? 'df-pulse 2s ease-in-out infinite' : 'none',
          }} title={isAuthenticated ? 'Connected' : 'Auth required'} />
          <span style={{ fontFamily: MONO, fontSize: 7, color: MUTED, letterSpacing: '0.08em' }}>
            {isAuthenticated ? 'LIVE' : 'OFFLINE'}
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{
              fontFamily: MONO, fontSize: 16, color: MUTED, background: 'none',
              border: 'none', cursor: 'pointer', padding: '0 0 0 6px', lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = G }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = MUTED }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatRef} style={{
        flex: 1, overflowY: 'auto', padding: '12px 14px',
        minHeight: 200, maxHeight: 380, display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {messages.map((m, i) => (
          <div
            key={i}
            className="df-fade-in"
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            <div style={{
              fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: '0.1em',
              color: m.role === 'user' ? BLUE : G, marginBottom: 3,
            }}>
              {m.role === 'user' ? 'OPERATOR' : 'dAIsy'}
            </div>
            <div style={{
              fontFamily: MONO, fontSize: 10, lineHeight: 1.6,
              color: m.role === 'user' ? '#C0C7D4' : FG,
              background: m.role === 'user' ? `${BLUE}11` : `${G}08`,
              border: `1px solid ${m.role === 'user' ? BLUE + '22' : BORDER}`,
              padding: '8px 12px', whiteSpace: 'pre-wrap',
              borderRadius: m.role === 'user' ? '6px 6px 0 6px' : '6px 6px 6px 0',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 12, height: 12, border: `2px solid ${G}`, borderRadius: '50%',
              borderTopColor: 'transparent', animation: 'df-spin 0.7s linear infinite',
            }} />
            <span style={{ fontFamily: MONO, fontSize: 8, color: G, letterSpacing: '0.1em' }}>
              SYNTHESIZING...
            </span>
          </div>
        )}

        {!isAuthenticated && (
          <div style={{
            alignSelf: 'center', padding: 12, textAlign: 'center',
            fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.08em',
            maxWidth: 240, lineHeight: 1.6,
          }}>
            <div style={{ marginBottom: 8, color: `${G}88` }}>⚠ AUTHENTICATION REQUIRED</div>
            Sign in to speak with dAIsy haMINJA, the sovereign AI operator of the SolveX Paradox Box marketplace.
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${BORDER}`, background: PANEL }}>
        <form
          onSubmit={e => { e.preventDefault(); send() }}
          style={{ display: 'flex', gap: 8 }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isAuthenticated ? (isProcessing ? 'dAIsy is synthesizing...' : 'Enter directive...') : 'Sign in to use dAIsy...'}
            disabled={!isAuthenticated || isProcessing}
            style={{
              flex: 1, fontFamily: MONO, fontSize: 10, color: FG,
              background: 'transparent', border: `1px solid ${BORDER}`,
              padding: '8px 10px', outline: 'none',
              opacity: !isAuthenticated ? 0.4 : isProcessing ? 0.5 : 1,
              borderRadius: 4,
            }}
            onFocus={e => { e.target.style.borderColor = G }}
            onBlur={e => { e.target.style.borderColor = BORDER }}
          />
          <button
            type="submit"
            disabled={!isAuthenticated || isProcessing}
            style={{
              fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
              padding: '8px 14px', color: BG, background: isAuthenticated ? G : MUTED,
              border: 'none', cursor: isAuthenticated ? 'pointer' : 'default',
              textTransform: 'uppercase', flexShrink: 0, borderRadius: 4,
              opacity: !isAuthenticated ? 0.4 : isProcessing ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            → SEND
          </button>
        </form>
      </div>
    </div>
  )
}
