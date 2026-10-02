import { useCallback, useEffect, useRef, useState } from "react";

type FlowState = "idle" | "listening" | "processing" | "streaming" | "speaking";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: new () => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: new () => any;
  }
}

const MONO = "'IBM Plex Mono', monospace";
const GOLD = "#D4AF37";
const GREEN = "#34D399";
const PURPLE = "#A78BFA";
const BLUE = "#60A5FA";

const PROCESS_STEPS = [
  { id: 0, label: "DIRECTIVE RECEIVED", sub: "Input captured & signed", icon: "⬡" },
  { id: 1, label: "PARSING INTENT", sub: "Semantic decomposition", icon: "◈" },
  { id: 2, label: "CHAMBER ROUTING", sub: "Mapped to paradox domain", icon: "☸" },
  { id: 3, label: "SOVEREIGN SYNTHESIS", sub: "gpt-5.4 core reasoning", icon: "🧠" },
  { id: 4, label: "OUTPUT DELIVERY", sub: "Voice + terminal emission", icon: "▸" },
];

function useStyles() {
  useEffect(() => {
    const id = "daisy-float-css";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      @keyframes df-head  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      @keyframes df-gi    { 0%,100%{box-shadow:0 0 14px 5px #D4AF3755} 50%{box-shadow:0 0 28px 12px #D4AF3788} }
      @keyframes df-gl    { 0%,100%{box-shadow:0 0 18px 7px #34D39966} 50%{box-shadow:0 0 36px 16px #34D399aa} }
      @keyframes df-gs    { 0%,100%{box-shadow:0 0 18px 7px #A78BFA66} 50%{box-shadow:0 0 40px 18px #A78BFAaa} }
      @keyframes df-mic   { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.35);opacity:0.6} }
      @keyframes df-spin  { to{transform:rotate(360deg)} }
      @keyframes df-in    { from{opacity:0;transform:translateY(10px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes df-ovl   { from{opacity:0} to{opacity:1} }
      @keyframes df-bar   { 0%,100%{height:4px} 50%{height:18px} }
      @keyframes df-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
      @keyframes df-flow  { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      @keyframes df-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      .df-input::placeholder { color: #3D4560; }
      .df-input:focus { outline: none; border-color: #D4AF37 !important; }
    `;
    document.head.appendChild(el);
    return () => document.getElementById(id)?.remove();
  }, []);
}

async function createConversation(): Promise<number> {
  const r = await fetch("/api/openai/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "dAIsy Showroom Session" }),
  });
  const d = await r.json() as { id: number };
  return d.id;
}

async function* streamText(convId: number, userMsg: string, signal: AbortSignal): AsyncGenerator<string> {
  const resp = await fetch(`/api/openai/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: userMsg }),
    signal,
  });
  if (!resp.ok) throw new Error(`Stream failed (${resp.status})`);
  if (!resp.body) return;
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.replace(/^data: /, "").trim();
      if (!line) continue;
      try {
        const ev = JSON.parse(line) as { content?: string; done?: boolean };
        if (ev.content) yield ev.content;
      } catch { /* skip */ }
    }
  }
}

/** Trim TTS text to a sentence boundary so voice starts fast (~5s instead of ~20s). */
function ttsSlice(text: string, max = 700): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "), cut.lastIndexOf(".\n"));
  return lastEnd > 200 ? cut.slice(0, lastEnd + 1) : cut;
}

function speakText(
  text: string,
  convId: number,
  ctx: AudioContext | null,
  onStart: () => void,
  onDone: () => void,
  onFail: (why: string) => void,
): () => void {
  let stopped = false;
  let src: AudioBufferSourceNode | null = null;
  const stop = () => {
    stopped = true;
    if (src) { src.onended = null; } // detach so a superseded source can't fire callbacks
    try { src?.stop(); } catch { /* noop */ }
    src = null;
  };

  (async () => {
    try {
      const resp = await fetch(`/api/openai/conversations/${convId}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsSlice(text) }),
      });
      if (!resp.ok) { onFail(`voice synthesis failed (${resp.status})`); onDone(); return; }
      const buf = await resp.arrayBuffer();
      if (stopped) { onDone(); return; }

      const audioCtx = ctx ?? new AudioContext();
      if (audioCtx.state === "suspended") {
        try { await audioCtx.resume(); } catch { /* browsers may still allow start() */ }
      }
      const audioBuf = await audioCtx.decodeAudioData(buf);
      if (stopped) { onDone(); return; }

      src = audioCtx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(audioCtx.destination);
      src.onended = () => onDone();
      onStart();
      src.start();

      // If the context is still suspended, the browser blocked autoplay.
      if (audioCtx.state === "suspended") {
        onFail("audio blocked by browser — click anywhere, then press ▶ REPLAY VOICE");
      }
    } catch (err) {
      onFail(`voice playback error — ${(err as Error).message}`);
      onDone();
    }
  })();

  return stop;
}

/* ─── Full-screen Process Interface ─────────────────────────── */
function ProcessInterface({
  directive, response, step, flowState, error, onClose, onStop, onFollowUp, onReplay,
}: {
  directive: string;
  response: string;
  step: number;
  flowState: FlowState;
  error: string | null;
  onClose: () => void;
  onStop: () => void;
  onFollowUp: (text: string) => void;
  onReplay: () => void;
}) {
  const termRef = useRef<HTMLDivElement>(null);
  const [followUp, setFollowUp] = useState("");
  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [response]);

  const busy = flowState === "processing" || flowState === "streaming";
  const submitFollowUp = () => {
    const t = followUp.trim();
    if (!t || busy) return;
    setFollowUp("");
    onFollowUp(t);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(3,5,12,0.92)", backdropFilter: "blur(14px)",
      animation: "df-ovl 0.3s ease-out",
      display: "flex", flexDirection: "column",
      fontFamily: MONO,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 32px", borderBottom: "1px solid rgba(212,175,55,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/daisy-avatar.png" alt="dAIsy" style={{
            width: 38, height: 38, borderRadius: "50%", objectFit: "cover",
            border: `1.5px solid ${flowState === "speaking" ? PURPLE : GOLD}`,
          }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.15em" }}>dAIsy haMINJA — SOVEREIGN PROCESS INTERFACE</div>
            <div style={{ fontSize: 8, color: "#5B6480", letterSpacing: "0.12em", marginTop: 2 }}>GLASS BOX ACTIVE · EVERY STEP OBSERVABLE · ZERO IP DISCLOSURE</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {(flowState === "speaking" || flowState === "streaming") && (
            <button onClick={onStop} style={{
              background: "transparent", border: "1px solid rgba(248,113,113,0.4)", color: "#F87171",
              fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.15em",
              padding: "8px 18px", cursor: "pointer",
            }}>■ HALT</button>
          )}
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid rgba(212,175,55,0.3)", color: GOLD,
            fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.15em",
            padding: "8px 18px", cursor: "pointer",
          }}>✕ CLOSE INTERFACE</button>
        </div>
      </div>

      {/* Process Steps rail */}
      <div style={{ display: "flex", padding: "26px 32px 20px", gap: 2 }}>
        {PROCESS_STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          const col = done ? GREEN : active ? GOLD : "#1A2035";
          return (
            <div key={s.id} style={{ flex: 1, position: "relative" }}>
              <div style={{
                border: `1px solid ${done ? "rgba(52,211,153,0.35)" : active ? "rgba(212,175,55,0.5)" : "#141A2E"}`,
                background: done ? "rgba(52,211,153,0.05)" : active ? "rgba(212,175,55,0.07)" : "rgba(10,14,26,0.6)",
                padding: "14px 16px", position: "relative", overflow: "hidden",
              }}>
                {active && (
                  <div style={{
                    position: "absolute", top: 0, left: 0, bottom: 0, width: "40%",
                    background: `linear-gradient(90deg, transparent, ${GOLD}11, transparent)`,
                    animation: "df-flow 1.6s linear infinite",
                  }} />
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, opacity: done || active ? 1 : 0.3 }}>{done ? "✓" : s.icon}</span>
                  <span style={{
                    fontSize: 8, fontWeight: 800, letterSpacing: "0.14em",
                    color: done ? GREEN : active ? GOLD : "#3D4560",
                    animation: active ? "df-pulse 1.2s ease-in-out infinite" : undefined,
                  }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 7.5, color: done || active ? "#7B869A" : "#2A3148", letterSpacing: "0.08em" }}>{s.sub}</div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: col, opacity: done || active ? 0.8 : 0.25, transition: "all 0.4s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main split: directive + terminal */}
      <div style={{ flex: 1, display: "flex", gap: 2, padding: "0 32px 32px", minHeight: 0 }}>

        {/* Left: directive panel */}
        <div style={{
          width: 320, border: "1px solid #141A2E", background: "rgba(7,9,26,0.7)",
          padding: 24, display: "flex", flexDirection: "column", gap: 18,
        }}>
          <div>
            <div style={{ fontSize: 7.5, color: "#3D4560", letterSpacing: "0.2em", marginBottom: 8 }}>OPERATOR DIRECTIVE</div>
            <div style={{ fontSize: 11, color: "#C8C9D0", lineHeight: 1.7, borderLeft: `2px solid ${GOLD}`, paddingLeft: 12 }}>
              {directive || "—"}
            </div>
          </div>
          <div style={{ borderTop: "1px solid #141A2E", paddingTop: 16 }}>
            <div style={{ fontSize: 7.5, color: "#3D4560", letterSpacing: "0.2em", marginBottom: 10 }}>EXECUTION TELEMETRY</div>
            {[
              { l: "ENGINE", v: "gpt-5.4 SOVEREIGN CORE", c: PURPLE },
              { l: "VOICE", v: "NOVA · NEURAL TTS", c: BLUE },
              { l: "MEMORY", v: "PERSISTENT · DB-ANCHORED", c: GREEN },
              { l: "MODE", v: flowState.toUpperCase(), c: GOLD },
            ].map(r => (
              <div key={r.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 8, color: "#5B6480", letterSpacing: "0.1em" }}>{r.l}</span>
                <span style={{ fontSize: 8, color: r.c, letterSpacing: "0.08em", fontWeight: 700 }}>{r.v}</span>
              </div>
            ))}
          </div>
          {flowState === "speaking" && (
            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 3, alignItems: "center", height: 20 }}>
                {[0.5, 0.7, 0.9, 0.7, 0.5, 0.8, 0.6].map((d, i) => (
                  <div key={i} style={{
                    width: 3, borderRadius: 2, background: PURPLE,
                    animation: `df-bar ${d}s ease-in-out infinite`, animationDelay: `${i * 0.08}s`,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 8, color: PURPLE, letterSpacing: "0.15em" }}>VOICE EMISSION ACTIVE</span>
            </div>
          )}
        </div>

        {/* Right: response terminal */}
        <div style={{
          flex: 1, border: "1px solid #141A2E", background: "rgba(5,8,15,0.85)",
          display: "flex", flexDirection: "column", minHeight: 0,
        }}>
          <div style={{
            padding: "10px 20px", borderBottom: "1px solid #141A2E",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 8, color: GOLD, letterSpacing: "0.18em", fontWeight: 700 }}>SOVEREIGN OUTPUT TERMINAL</span>
            <span style={{ fontSize: 7.5, color: "#3D4560", letterSpacing: "0.1em" }}>
              {response.length} CHARS · {flowState === "streaming" ? "STREAMING" : flowState === "speaking" ? "SPEAKING" : flowState === "processing" ? "SYNTHESIZING" : "COMPLETE"}
            </span>
          </div>
          <div ref={termRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {error && (
              <div style={{
                marginBottom: 16, padding: "10px 14px",
                border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.06)",
                fontSize: 9, color: "#F87171", letterSpacing: "0.1em", lineHeight: 1.6,
              }}>⚠ {error}</div>
            )}
            {!response && !error && flowState === "processing" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 12, height: 12, border: `2px solid ${GOLD}`, borderRadius: "50%", borderTopColor: "transparent", animation: "df-spin 0.7s linear infinite" }} />
                <span style={{ fontSize: 10, color: GOLD, letterSpacing: "0.12em" }}>SOVEREIGN CORE SYNTHESIZING…</span>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#B8BdCC", lineHeight: 1.85, whiteSpace: "pre-wrap", maxWidth: 780 }}>
                {response}
                {flowState === "streaming" && <span style={{ animation: "df-blink 0.8s step-start infinite", color: GOLD }}>▌</span>}
              </div>
            )}
          </div>

          {/* Follow-up directive bar — continue the conversation without leaving the interface */}
          <div style={{
            borderTop: "1px solid #141A2E", padding: "12px 20px",
            display: "flex", gap: 10, alignItems: "center",
          }}>
            <span style={{ fontSize: 8, color: GOLD, letterSpacing: "0.12em", flexShrink: 0 }}>↳ FOLLOW-UP</span>
            <input
              className="df-input"
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitFollowUp(); }}
              placeholder={busy ? "dAIsy is synthesizing — HALT to interrupt…" : "Respond to dAIsy — she remembers the full conversation…"}
              disabled={busy}
              autoFocus
              style={{
                flex: 1, background: "rgba(10,14,26,0.8)",
                border: "1px solid #1A2035", color: "#C8C9D0",
                fontFamily: MONO, fontSize: 11, padding: "10px 14px",
                opacity: busy ? 0.5 : 1, transition: "border-color 0.2s, opacity 0.2s",
              }}
            />
            {response && !busy && (
              <button onClick={onReplay} title="Replay voice" style={{
                height: 38, padding: "0 14px", flexShrink: 0, cursor: "pointer",
                background: "transparent", border: `1px solid ${PURPLE}55`, color: PURPLE,
                fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em",
              }}>▶ REPLAY VOICE</button>
            )}
            <button onClick={submitFollowUp} disabled={busy} style={{
              height: 38, padding: "0 20px", flexShrink: 0, cursor: busy ? "default" : "pointer",
              background: busy ? "#1A2035" : `linear-gradient(135deg, ${GOLD}, #B8860B)`,
              border: "none", color: busy ? "#3D4560" : "#05080F",
              fontFamily: MONO, fontSize: 9, fontWeight: 900, letterSpacing: "0.12em",
            }}>SEND →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main floating widget ──────────────────────────────────── */
export function DaisyFloat() {
  useStyles();

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [input, setInput] = useState("");
  const [directive, setDirective] = useState("");
  const [response, setResponse] = useState("");
  const [step, setStep] = useState(0);
  const [showInterface, setShowInterface] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const flowRef = useRef<FlowState>("idle");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSpokenRef = useRef<{ text: string; cid: number } | null>(null);
  const stopTtsRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<number[]>([]);
  const runIdRef = useRef(0);
  const convPromiseRef = useRef<Promise<number> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  useEffect(() => { flowRef.current = flowState; }, [flowState]);

  const getConversationId = useCallback((): Promise<number> => {
    if (convId) return Promise.resolve(convId);
    if (!convPromiseRef.current) {
      const saved = localStorage.getItem("daisy-conv-id");
      convPromiseRef.current = saved
        ? Promise.resolve(parseInt(saved, 10))
        : createConversation().then(cid => {
            localStorage.setItem("daisy-conv-id", String(cid));
            return cid;
          });
      convPromiseRef.current.then(cid => setConvId(cid)).catch(() => { convPromiseRef.current = null; });
    }
    return convPromiseRef.current;
  }, [convId]);

  useEffect(() => {
    void getConversationId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  }, []);

  const haltAll = useCallback(() => {
    runIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    stopTtsRef.current?.();
    stopTtsRef.current = null;
    clearTimers();
    recRef.current?.stop?.();
    setFlowState("idle");
  }, [clearTimers]);

  useEffect(() => () => {
    abortRef.current?.abort();
    stopTtsRef.current?.();
    for (const t of timersRef.current) window.clearTimeout(t);
    recRef.current?.stop?.();
    try { void audioCtxRef.current?.close(); } catch { /* noop */ }
    audioCtxRef.current = null;
  }, []);

  /** Must be called synchronously inside a user-gesture handler so the browser unlocks audio. */
  const unlockAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume();
      }
    } catch { /* audio unsupported — voice will fail gracefully */ }
  }, []);

  const startSpeaking = useCallback((full: string, cid: number, runId: number) => {
    lastSpokenRef.current = { text: full, cid };
    stopTtsRef.current?.();
    stopTtsRef.current = speakText(
      full, cid, audioCtxRef.current,
      () => { if (runIdRef.current === runId) setFlowState("speaking"); },
      () => { if (runIdRef.current === runId) setFlowState("idle"); },
      (why) => { if (runIdRef.current === runId) setErrorMsg(`VOICE FAULT — ${why}`); },
    );
  }, []);

  const runDirective = useCallback(async (text: string) => {
    // Cancel any previous run (stream, TTS, timers)
    haltAll();
    const runId = ++runIdRef.current;
    const ac = new AbortController();
    abortRef.current = ac;

    setErrorMsg(null);
    setDirective(text);
    setResponse("");
    setStep(0);
    setShowInterface(true);
    setFlowState("processing");

    timersRef.current.push(window.setTimeout(() => { if (runIdRef.current === runId) setStep(1); }, 500));
    timersRef.current.push(window.setTimeout(() => { if (runIdRef.current === runId) setStep(2); }, 1100));

    try {
      const cid = await getConversationId();
      if (runIdRef.current !== runId) return;

      let full = "";
      let firstChunk = true;
      for await (const chunk of streamText(cid, text, ac.signal)) {
        if (runIdRef.current !== runId) return;
        if (firstChunk) { setStep(3); setFlowState("streaming"); firstChunk = false; }
        full += chunk;
        setResponse(full);
      }
      if (runIdRef.current !== runId) return;

      setStep(4);
      setFlowState("processing");
      startSpeaking(full, cid, runId);
    } catch (err) {
      if (runIdRef.current !== runId) return;
      if ((err as Error).name === "AbortError") return;
      clearTimers();
      setErrorMsg(`TRANSMISSION FAULT — ${(err as Error).message}. Retry the directive.`);
      setFlowState("idle");
    }
  }, [getConversationId, haltAll, clearTimers, startSpeaking]);

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text || flowRef.current === "processing" || flowRef.current === "streaming") return;
    unlockAudio();
    setInput("");
    void runDirective(text);
  }, [input, runDirective, unlockAudio]);

  const handleFollowUp = useCallback((text: string) => {
    unlockAudio();
    void runDirective(text);
  }, [runDirective, unlockAudio]);

  const handleReplay = useCallback(() => {
    unlockAudio();
    const last = lastSpokenRef.current;
    if (!last) return;
    setErrorMsg(null);
    // Treat replay as a new run so any stale onended from a prior source can't flip UI state
    const runId = ++runIdRef.current;
    startSpeaking(last.text, last.cid, runId);
  }, [unlockAudio, startSpeaking]);

  const handleMic = useCallback(() => {
    unlockAudio();
    if (flowRef.current === "listening") { recRef.current?.stop(); return; }
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg("VOICE INPUT UNAVAILABLE — this browser lacks speech recognition. Type your directive instead.");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    recRef.current = rec;
    rec.onstart = () => setFlowState("listening");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = (e.results[0][0].transcript as string).trim();
      setFlowState("idle");
      void runDirective(text);
    };
    rec.onerror = () => setFlowState("idle");
    rec.onend = () => { if (flowRef.current === "listening") setFlowState("idle"); };
    rec.start();
  }, [runDirective, unlockAudio]);

  const borderColor = flowState === "listening" ? GREEN : flowState === "speaking" ? PURPLE : GOLD;
  const headGlow = flowState === "listening" ? "df-gl 1.2s ease-in-out infinite"
    : flowState === "speaking" ? "df-gs 1.4s ease-in-out infinite"
    : "df-gi 2.4s ease-in-out infinite";

  return (
    <>
      {showInterface && (
        <ProcessInterface
          directive={directive}
          response={response}
          step={step}
          flowState={flowState}
          error={errorMsg}
          onClose={() => { haltAll(); setShowInterface(false); }}
          onStop={haltAll}
          onFollowUp={handleFollowUp}
          onReplay={handleReplay}
        />
      )}

      {/* Translucent open chat bubble */}
      {!showInterface && (
        <div style={{
          position: "fixed", bottom: 30, right: 118, zIndex: 9998,
          width: 340, animation: "df-in 0.35s ease-out",
          background: "rgba(7,9,26,0.55)", backdropFilter: "blur(12px)",
          border: `1px solid ${borderColor}33`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${borderColor}11`,
        }}>
          <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${borderColor}1A` }}>
            <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.18em", color: GOLD }}>
              dAIsy haMINJA
            </div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: "#5B6480", letterSpacing: "0.1em", marginTop: 3 }}>
              AUTONOMOUS MARKET OUTREACH & DISTRIBUTION INTELLIGENCE
            </div>
          </div>
          <div style={{ padding: "12px 14px 14px", display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="df-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="Speak a directive — outreach, distribution, any solution…"
              style={{
                flex: 1, background: "rgba(5,8,15,0.6)",
                border: "1px solid #1A2035", color: "#C8C9D0",
                fontFamily: MONO, fontSize: 10, padding: "10px 12px",
                transition: "border-color 0.2s",
              }}
            />
            <button onClick={handleMic} title="Voice directive" style={{
              width: 36, height: 36, flexShrink: 0, cursor: "pointer",
              background: flowState === "listening" ? "rgba(52,211,153,0.15)" : "transparent",
              border: `1px solid ${flowState === "listening" ? GREEN : "#1A2035"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: flowState === "listening" ? GREEN : "#5B6480",
                animation: flowState === "listening" ? "df-mic 0.75s ease-in-out infinite" : undefined,
              }} />
            </button>
            <button onClick={handleSubmit} style={{
              height: 36, padding: "0 16px", flexShrink: 0, cursor: "pointer",
              background: `linear-gradient(135deg, ${GOLD}, #B8860B)`,
              border: "none", color: "#05080F",
              fontFamily: MONO, fontSize: 9, fontWeight: 900, letterSpacing: "0.12em",
            }}>RUN →</button>
          </div>
          {errorMsg && (
            <div style={{
              margin: "0 14px 12px", padding: "8px 10px",
              border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.06)",
              fontFamily: MONO, fontSize: 7.5, color: "#F87171", letterSpacing: "0.08em", lineHeight: 1.6,
            }}>⚠ {errorMsg}</div>
          )}
        </div>
      )}

      {/* Floating head — no hands */}
      <div
        onClick={() => { if (directive) setShowInterface(s => !s); }}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          cursor: directive ? "pointer" : "default",
          animation: "df-head 4.6s ease-in-out infinite", userSelect: "none",
        }}
      >
        <div style={{
          width: 78, height: 78, borderRadius: "50%", overflow: "hidden",
          border: `2px solid ${borderColor}`, animation: headGlow,
          transition: "border-color 0.5s ease", position: "relative",
        }}>
          <img src="/daisy-avatar.png" alt="dAIsy haMINJA"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          {(flowState === "processing" || flowState === "streaming") && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(212,175,55,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 14, height: 14, border: `2.5px solid ${GOLD}`, borderRadius: "50%", borderTopColor: "transparent", animation: "df-spin 0.7s linear infinite" }} />
            </div>
          )}
          {flowState === "speaking" && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(167,139,250,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                {[0.5, 0.7, 0.9, 0.7, 0.5].map((d, i) => (
                  <div key={i} style={{
                    width: 3, borderRadius: 2, background: PURPLE,
                    animation: `df-bar ${d}s ease-in-out infinite`, animationDelay: `${i * 0.1}s`,
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{
          textAlign: "center", fontFamily: MONO, fontSize: 7,
          letterSpacing: "0.12em", color: `${borderColor}99`, marginTop: 5,
          transition: "color 0.5s ease", whiteSpace: "nowrap",
        }}>
          {flowState === "listening" ? "LISTENING…" : flowState === "processing" || flowState === "streaming" ? "PROCESSING…" : flowState === "speaking" ? "SPEAKING" : "SOVEREIGN CORE"}
        </div>
      </div>
    </>
  );
}
