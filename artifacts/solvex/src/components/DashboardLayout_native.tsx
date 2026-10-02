import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/custom-auth-web";
import { PARADOXES } from "../data/brainData";

// Elder Futhark runes for Chamber I (paradoxes 1–13)
const FUTHARK = ["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ","ᚲ","ᚷ","ᚹ","ᚺ","ᚾ","ᛁ","ᛃ","ᛇ"];

function getParadoxSymbol(paradoxId: number): { symbol: string; chamber: string; color: string } {
  if (paradoxId <= 13) return { symbol: FUTHARK[paradoxId - 1] ?? "ᚱ", chamber: "CHAMBER I", color: "#D4AF37" };
  if (paradoxId <= 23) return { symbol: "☸", chamber: "CHAMBER II",  color: "#60A5FA" };
  if (paradoxId <= 38) return { symbol: "𓁙", chamber: "CHAMBER III", color: "#A78BFA" };
  if (paradoxId <= 48) return { symbol: "⬢", chamber: "CHAMBER IV",  color: "#34D399" };
  return                        { symbol: "👁", chamber: "CHAMBER V",  color: "#F59E0B" };
}

function renderChamberIndicator(paradoxId: number): string {
  const { symbol, chamber } = getParadoxSymbol(paradoxId);
  const paradox = PARADOXES.find(p => p.id === paradoxId);
  const name = paradox ? paradox.name.split(" vs ")[0].split(" (")[0].slice(0, 22) : "UNKNOWN";
  const ts = new Date().toISOString().slice(11, 23);
  return `[${ts}] ${chamber} -> ${symbol} P${String(paradoxId).padStart(2,"0")} ${name}`;
}

function OmniscientTerminal() {
  const [paradoxId, setParadoxId] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const [pulse, setPulse] = useState(false);
  const logRef = useRef<string[]>([]);

  useEffect(() => {
    const advance = () => {
      setParadoxId(prev => {
        const next = prev >= 59 ? 1 : prev + 1;
        const line = renderChamberIndicator(next);
        logRef.current = [...logRef.current.slice(-6), line];
        setLog([...logRef.current]);
        setPulse(p => !p);
        return next;
      });
    };
    const t = setInterval(advance, 1800);
    return () => clearInterval(t);
  }, []);

  const current = getParadoxSymbol(paradoxId);

  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid #1A2035" }}>
      {/* Pulsing Chamber Symbol */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4AF37", boxShadow: pulse ? "0 0 12px 4px #D4AF3766" : "0 0 4px 1px #D4AF3733", transition: "box-shadow 0.9s ease", flexShrink: 0 }} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.18em", color: "#D4AF37", fontWeight: 600 }}>GLASS BOX ACTIVE</span>
      </div>

      {/* Paradox Archetype Display */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
        border: "1px solid " + current.color + "25",
        background: current.color + "08", marginBottom: 8,
      }}>
        <div style={{ fontSize: 20, color: current.color, lineHeight: 1, minWidth: 24, textAlign: "center" }}>{current.symbol}</div>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, letterSpacing: "0.18em", color: current.color, fontWeight: 700 }}>
            {current.chamber} · P{String(paradoxId).padStart(2,"0")}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, letterSpacing: "0.08em", color: "#3D4560", marginTop: 2 }}>
            {PARADOXES.find(p => p.id === paradoxId)?.name.slice(0, 26) ?? "CHAMBER_ENGAGED"}
          </div>
        </div>
      </div>

      {/* Omniscient Terminal Log */}
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#2A3050", lineHeight: 1.7, overflow: "hidden", maxHeight: 70 }}>
        {log.slice(-4).map((line, i) => (
          <div key={i} style={{ color: i === log.slice(-4).length - 1 ? current.color + "99" : "#2A3050", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {line}
          </div>
        ))}
      </div>

      {/* dAIsy haMINJA Sovereign AI identity */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <img
          src="/daisy-haminja.png"
          alt="dAIsy haMINJA"
          style={{
            width: 22, height: 22, borderRadius: "50%",
            objectFit: "cover",
            border: "1px solid #A78BFA44",
            flexShrink: 0,
          }}
        />
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#2A3050", letterSpacing: "0.08em", lineHeight: 1.5 }}>
          dAIsy haMINJA<br />88-PARADOX ENGINE v2.0
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { href: "/marketplace", label: "PARADOX VAULT", icon: "◈" },
  { href: "/outreach", label: "OUTREACH OPS", icon: "⇶" },
  { href: "/brain", label: "BRAIN CONSOLE", icon: "◉" },
  { href: "/challenges", label: "CHALLENGE HUB", icon: "⬡" },
  { href: "/library", label: "SOLUTION LIBRARY", icon: "▣" },
];

const ADMIN_ITEMS = [
  { href: "/owner", label: "COMMAND CENTER", icon: "⬡" },
  { href: "/analytics", label: "ANALYTICS", icon: "▲" },
];

const TICKER = [
  "ZK-KYC ▲+12.4%", "KYBER-QKD ▲+8.1%", "FHE-VAULT ▼-2.3%",
  "HFT-FABRIC ▲+19.7%", "DARK-POOL ▲+5.6%", "RTGS-OPT ▲+11.2%",
  "OSFI-B13 ▲+3.9%", "ANOMALY-GCN ▲+22.8%", "PAM-BROKER ▲+9.3%",
  "XAI-SHAPLEY ▲+14.5%", "APEX-MASTER ▲+31.2%", "SOLVEX INDEX ▲+8.74%",
];

function GlassBoxLight() {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2 px-3 py-2 border border-[#D4AF37]/20 bg-[#D4AF37]/5">
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "#D4AF37",
        boxShadow: pulse ? "0 0 12px 4px #D4AF3766" : "0 0 4px 1px #D4AF3733",
        transition: "box-shadow 1.2s ease",
      }} />
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.18em", color: "#D4AF37", fontWeight: 600 }}>
        GLASS BOX ACTIVE
      </span>
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, login, logout } = useAuth();
  const [location] = useLocation();
  const [tickerPos, setTickerPos] = useState(0);
  const tickerText = [...TICKER, ...TICKER].join("   ·   ");

  useEffect(() => {
    const t = setInterval(() => setTickerPos(p => (p + 1) % (tickerText.length / 2 * 8)), 40);
    return () => clearInterval(t);
  }, [tickerText]);

  if (isLoading) return (
    <div style={{ minHeight: "100vh", background: "#05080F", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#D4AF37", fontSize: 12, letterSpacing: "0.2em" }}>
        INITIALIZING 59-PARADOX ENGINE...
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#05080F", color: "#E8EAF0", overflow: "hidden" }}>

      {/* Top Ticker Bar */}
      <div style={{
        background: "#0B0E1A", borderBottom: "1px solid #1A2035",
        height: 32, display: "flex", alignItems: "center", overflow: "hidden", flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.2em", color: "#D4AF37", background: "#0B0E1A",
          borderRight: "1px solid #D4AF37", padding: "0 14px", whiteSpace: "nowrap",
          height: "100%", display: "flex", alignItems: "center", flexShrink: 0,
        }}>LIVE</div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#5B6480",
            whiteSpace: "nowrap",
            animation: "ticker-scroll 50s linear infinite",
          }}>
            {[...TICKER, ...TICKER].map((item, i) => (
              <span key={i} style={{ marginRight: 48, color: item.includes("▼") ? "#F87171" : "#34D399" }}>
                {item}
              </span>
            ))}
          </div>
        </div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#3D4560",
          padding: "0 14px", borderLeft: "1px solid #1A2035", flexShrink: 0,
        }}>
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} EST
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside style={{
          width: 220, background: "#07091A", borderRight: "1px solid #1A2035",
          display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #1A2035" }}>
            <Link href="/">
              <div style={{ cursor: "pointer" }}>
                <img
                  src="/solvex-logo.png"
                  alt="SOLVEX PARADOX BOX"
                  style={{
                    width: "100%", height: 80,
                    objectFit: "contain", objectPosition: "left center",
                    display: "block",
                  }}
                />
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, letterSpacing: "0.2em", color: "#3D4560", marginTop: 4 }}>
                  OSFI B-13 · SOC 2 · NIST · PIPEDA
                </div>
              </div>
            </Link>
          </div>

          {/* Omniscient Terminal — Glass Box + Symbolic Logic Layer */}
          <OmniscientTerminal />

          {/* Nav */}
          <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
            {NAV_ITEMS.map(item => {
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 20px",
                    background: active ? "rgba(212,175,55,0.08)" : "transparent",
                    borderLeft: active ? "2px solid #D4AF37" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}>
                    <span style={{ color: active ? "#D4AF37" : "#3D4560", fontSize: 12 }}>{item.icon}</span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600,
                      letterSpacing: "0.15em", color: active ? "#D4AF37" : "#5B6480",
                    }}>{item.label}</span>
                  </div>
                </Link>
              );
            })}

            {(user as any)?.role === "admin" && (
              <>
                <div style={{ padding: "16px 20px 8px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, letterSpacing: "0.2em", color: "#2A3050" }}>
                  ARCHITECT ACCESS
                </div>
                {ADMIN_ITEMS.map(item => {
                  const active = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 20px",
                        background: active ? "rgba(212,175,55,0.05)" : "transparent",
                        borderLeft: active ? "2px solid #D4AF37" : "2px solid transparent",
                        cursor: "pointer",
                      }}>
                        <span style={{ color: active ? "#D4AF37" : "#3D4560", fontSize: 12 }}>{item.icon}</span>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600,
                          letterSpacing: "0.15em", color: active ? "#D4AF37" : "#3D4560",
                        }}>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User / OSFI Strip */}
          <div style={{ borderTop: "1px solid #1A2035", padding: "14px 16px" }}>
            {user ? (
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#5B6480", marginBottom: 8, letterSpacing: "0.1em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.firstName ?? user.email ?? "AUTHENTICATED"}
                </div>
                <button
                  onClick={logout}
                  style={{
                    width: "100%", padding: "7px", background: "transparent",
                    border: "1px solid #1A2035", color: "#5B6480",
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.15em",
                    cursor: "pointer",
                  }}>
                  LOGOUT
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                style={{
                  width: "100%", padding: "8px 12px", background: "linear-gradient(135deg, #D4AF37, #B8860B)",
                  color: "#05080F", fontFamily: "'IBM Plex Mono', monospace", border: "none",
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.15em",
                  textAlign: "center", cursor: "pointer",
                }}>
                AUTHENTICATE →
              </button>
            )}
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["OSFI", "FINTRAC", "SOC2", "PIPEDA"].map(b => (
                <div key={b} style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#D4AF37",
                  border: "1px solid rgba(212,175,55,0.2)", padding: "2px 6px",
                  letterSpacing: "0.12em",
                }}>✓ {b}</div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: "auto", background: "#05080F" }}>
          {children}
        </main>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
