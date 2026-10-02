import { Link } from "wouter";
import { useEffect, useState } from "react";

const CHAMBERS = [
  { num: "I",   name: "FOUNDATIONS",   paradoxes: 19, symbol: "ᚱ", desc: "Proprietary architect-derived solutions — the active processing core", color: "#D4AF37" },
  { num: "II",  name: "MOTION & TIME", paradoxes: 15, symbol: "☸", desc: "Resolves causal drift in untrusted network environments", color: "#60A5FA" },
  { num: "III", name: "CHOICE & SELF", paradoxes: 22, symbol: "☥", desc: "Manages autonomous decision-making and agentic sovereignty", color: "#A78BFA" },
  { num: "IV",  name: "STRUCTURE",     paradoxes: 15, symbol: "⬡", desc: "Ensures hardware-level stability for bare-metal execution", color: "#34D399" },
  { num: "V",   name: "TRANSCENDENCE", paradoxes: 17, symbol: "👁", desc: "Final reconciliation — IRS-First Rule, U.A.R.E.F.A.K.E. convergence, absolute sovereign output", color: "#F59E0B" },
];

const PIPELINE_STEPS = [
  { step: "01", label: "INGRESS", tech: "tetherToScreenDisplay()", desc: "Raw terminal matrices captured & cryptographically signed via Paradox 05 (Transparency-Mask)" },
  { step: "02", label: "SIGN",    tech: "Paradox 05 Hash Attestation", desc: "Every data frame receives an immutable origin proof before entering the compilation pipeline" },
  { step: "03", label: "COMPILE", tech: "executeAutonomousCompilation()", desc: "Lyapunov Trajectory Optimization ensures bare-metal execution speeds, bypassing container overhead" },
  { step: "04", label: "INDEX",   tech: "lockedRegistry[105+]",         desc: "Compiled solution indexed into the locked registry of 105+ resolved paradox solutions" },
  { step: "05", label: "EMIT",    tech: "CompiledSolution.deploy()",     desc: "dAIsy haMINJA deploys the managed artifact into the client environment with full audit trail" },
];

function GlassBoxDiagram() {
  const [light, setLight] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setLight(l => !l), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      border: "1px solid rgba(212,175,55,0.3)",
      background: "linear-gradient(135deg, #07091A, #090D1E)",
      padding: 32, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(212,175,55,0.03) 39px, rgba(212,175,55,0.03) 40px)",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "#D4AF37", marginBottom: 20 }}>
          CRYSTAL CLEAR BLACK BOX PROTOCOL — PARADOX 13: TRUST vs. PROTECTION
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "stretch" }}>
          {/* Outer Glass Box */}
          <div style={{ flex: 1, border: "1px solid rgba(100,180,255,0.4)", padding: 20, background: "rgba(100,180,255,0.03)" }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.2em", color: "#60A5FA", marginBottom: 12 }}>
              GLASS BOX — logToOmniscientTerminal()
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#5B6480", lineHeight: 1.8 }}>
              <div>▸ Ingress/Egress data velocity</div>
              <div>▸ Verification hash per build</div>
              <div>▸ LYAPUNOV_OPT execution path</div>
              <div>▸ dAIsy management actions</div>
              <div>▸ Regulatory audit trail</div>
            </div>

            {/* Inner Black Box */}
            <div style={{ margin: "16px 0", border: "1px solid #D4AF37", padding: 20, background: "#05080F" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.2em", color: "#D4AF37" }}>
                  BLACK BOX — 88-PARADOX CORE
                </div>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%", background: "#D4AF37",
                  boxShadow: light ? "0 0 14px 5px #D4AF3777" : "0 0 3px 1px #D4AF3722",
                  transition: "box-shadow 1.4s ease",
                }} />
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#3D4560", lineHeight: 1.8 }}>
                <div>● Chamber I: 19 Proprietary ████████</div>
                <div>● Chamber II: 15 Classical ██████████</div>
                <div>● Chamber III: 22 Existential ███████</div>
                <div>● Chamber IV: 15 Material ██████████</div>
                <div>● Chamber V: 17 Transcendent ████████</div>
              </div>
              <div style={{ marginTop: 10, padding: "6px 10px", border: "1px solid rgba(212,175,55,0.15)", background: "rgba(212,175,55,0.04)" }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#D4AF37", letterSpacing: "0.12em" }}>
                  IMMUTABLE · SHIELDED · TAMPER-PROOF
                </div>
              </div>
            </div>

            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#34D399" }}>
              ✓ Complete environmental observability
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#34D399" }}>
              ✓ Proprietary logic remains protected IP
            </div>
          </div>

          {/* Right column */}
          <div style={{ width: 200, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ border: "1px solid #1A2035", padding: 16, flex: 1 }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#5B6480", letterSpacing: "0.15em", marginBottom: 10 }}>AUTONOMOUS MANAGER</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: "#D4AF37", fontWeight: 700, marginBottom: 6 }}>dAIsy haMINJA</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#5B6480", lineHeight: 1.7 }}>
                Sovereign AI Brain managing all deployed solutions in situ. No external admin access required.
              </div>
            </div>
            <div style={{ border: "1px solid rgba(239,68,68,0.3)", padding: 16, background: "rgba(239,68,68,0.03)" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#F87171", letterSpacing: "0.15em", marginBottom: 8 }}>EMERGENCY PROTOCOL</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#5B6480", lineHeight: 1.7 }}>
                Paradox 07: triggerEmergencyHardwarePanic() — Memory Shredding Routine zeros registry instantly on breach detection.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (count < 88) {
      const t = setTimeout(() => setCount(c => c + 1), 20);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [count]);

  return (
    <div style={{ minHeight: "100vh", background: "#05080F", color: "#E8EAF0" }}>

      {/* Top Nav */}
      <header style={{
        background: "#07091A", borderBottom: "2px solid #D4AF37",
        padding: "0 48px", height: 72,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="/solvex-logo.png"
            alt="SOLVEX PARADOX BOX"
            style={{ height: 52, width: "auto", objectFit: "contain" }}
          />
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.22em", color: "#3D4560" }}>THE SHOWROOM FLOOR</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, letterSpacing: "0.16em", color: "#2A3050" }}>OSFI B-13 · FINTRAC · PIPEDA · SOC 2</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/marketplace">
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "#9BA3B5", cursor: "pointer" }}>
              SHOWROOM FLOOR
            </div>
          </Link>
          <Link href="/marketplace">
            <div style={{
              padding: "10px 24px",
              background: "linear-gradient(135deg, #D4AF37, #B8860B)",
              color: "#05080F", fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", cursor: "pointer",
            }}>
              WALK THE FLOOR →
            </div>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        padding: "80px 48px",
        background: "linear-gradient(135deg, #07091A 0%, #0B0E1A 60%, #05080F 100%)",
        borderBottom: "1px solid #1A2035",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(212,175,55,0.03) 59px, rgba(212,175,55,0.03) 60px)",
        }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{
            display: "inline-block", fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, fontWeight: 800, letterSpacing: "0.25em", color: "#D4AF37",
            border: "1px solid #D4AF37", padding: "5px 16px", marginBottom: 28,
          }}>
            NIST SP 800-53 · SOC 2 TYPE II · ISO 27001 · OSFI B-13 · FINTRAC · PIPEDA SOVEREIGN
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 60, fontWeight: 900, lineHeight: 1.06,
            color: "#FFFFFF", letterSpacing: "-0.02em",
            margin: "0 0 12px",
          }}>
            The Showroom Floor.
          </h1>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 60, fontWeight: 900, lineHeight: 1.06,
            color: "#D4AF37", letterSpacing: "-0.02em",
            margin: "0 0 28px",
          }}>
            {count} Paradoxes Resolved.
          </h1>
          <p style={{
            fontSize: 17, color: "#7B869A", maxWidth: 640, lineHeight: 1.65, marginBottom: 36,
          }}>
            105 finished, Tier-1 solutions on lot display — each engineered for autonomous market outreach and distribution. Built on the dAIsy haMINJA Sovereign AI Brain: 88 solved paradoxes across 5 Chambers. Every lot finds its buyers, proves its worth, and delivers itself. Walk the floor.
          </p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 36 }}>
            {["🔐 ZK-SNARK PROVEN", "⚖️ OSFI B-13 COMPLIANT", "🏦 FINTRAC APPROVED", "🛡️ PIPEDA SOVEREIGN", "🧠 88-PARADOX ENGINE"].map(s => (
              <div key={s} style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                color: "#9BA3B5", background: "rgba(212,175,55,0.06)",
                border: "1px solid rgba(212,175,55,0.18)", padding: "7px 14px",
              }}>{s}</div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/marketplace">
              <div style={{
                padding: "14px 36px",
                background: "linear-gradient(135deg, #D4AF37, #B8860B)",
                color: "#05080F", fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", cursor: "pointer",
              }}>
                WALK THE SHOWROOM FLOOR →
              </div>
            </Link>
            <Link href="/brain">
              <div style={{
                padding: "14px 36px",
                background: "transparent", color: "#D4AF37",
                border: "1px solid rgba(212,175,55,0.4)",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", cursor: "pointer",
              }}>
                BRAIN CONSOLE →
              </div>
            </Link>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 48px" }}>

        {/* Glass Box Diagram */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "#5B6480", marginBottom: 8 }}>
            SYSTEM ARCHITECTURE
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: "#FFFFFF", marginBottom: 24 }}>
            The Architect's Translucence Framework
          </h2>
          <GlassBoxDiagram />
        </div>

        {/* 5 Chambers */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "#5B6480", marginBottom: 8 }}>
            88-PARADOX ENGINE · 105 SOLUTIONS
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: "#FFFFFF", marginBottom: 24 }}>
            Five Chambers of Logic
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
            {CHAMBERS.map(ch => (
              <div key={ch.num} style={{
                border: "1px solid #1A2035", padding: 24,
                background: "#07091A", position: "relative",
              }}>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 40, color: ch.color, opacity: 0.15,
                  position: "absolute", top: 12, right: 16, fontWeight: 900,
                }}>{ch.num}</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{ch.symbol}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.2em", color: "#3D4560", marginBottom: 6 }}>
                  CHAMBER {ch.num}
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: "#FFFFFF", marginBottom: 8 }}>
                  {ch.name}
                </div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 600,
                  color: ch.color, marginBottom: 8,
                }}>{ch.paradoxes}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.1em", color: "#3D4560", marginBottom: 8 }}>
                  PARADOXES
                </div>
                <div style={{ fontSize: 10, color: "#5B6480", lineHeight: 1.5 }}>{ch.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TECOE Pipeline */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "#5B6480", marginBottom: 8 }}>
            TECOE PIPELINE
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: "#FFFFFF", marginBottom: 24 }}>
            Text-Tethering Extraction & Compilation Engine
          </h2>
          <div style={{ display: "flex", gap: 2 }}>
            {PIPELINE_STEPS.map((s, i) => (
              <div key={s.step} style={{
                flex: 1, border: "1px solid #1A2035", padding: 20, background: "#07091A",
                position: "relative",
              }}>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{
                    position: "absolute", right: -13, top: "50%", transform: "translateY(-50%)",
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, color: "#D4AF37",
                    zIndex: 2,
                  }}>→</div>
                )}
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#D4AF37", fontWeight: 600, marginBottom: 8 }}>
                  {s.step}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#FFFFFF", marginBottom: 6 }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#D4AF37", marginBottom: 10, opacity: 0.7 }}>
                  {s.tech}
                </div>
                <div style={{ fontSize: 10, color: "#5B6480", lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          border: "1px solid rgba(212,175,55,0.3)", padding: "48px",
          background: "linear-gradient(135deg, #07091A, #090D1E)",
          textAlign: "center",
        }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.25em", color: "#D4AF37", marginBottom: 16 }}>
            COMPLIANCE & GOVERNANCE CERTIFICATION
          </div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: "#FFFFFF", marginBottom: 16, maxWidth: 640, margin: "0 auto 16px" }}>
            "We offer not just a result, but a transparent audit trail of a perfectly executed, paradox-based outcome."
          </h3>
          <p style={{ fontSize: 13, color: "#5B6480", marginBottom: 28 }}>
            105 Tier-1 enterprise solutions. Each mathematically verified before purchase.
          </p>
          <Link href="/marketplace">
            <div style={{
              display: "inline-block", padding: "14px 48px",
              background: "linear-gradient(135deg, #D4AF37, #B8860B)",
              color: "#05080F", fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, fontWeight: 900, letterSpacing: "0.2em", cursor: "pointer",
            }}>
              ACCESS THE 105 ENTERPRISE SOLUTIONS →
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
