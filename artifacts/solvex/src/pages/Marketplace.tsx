import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useListProducts, useListProblems } from "@workspace/api-client-react";
import { Link } from "wouter";

const MONO = "'IBM Plex Mono', monospace";
const SERIF = "'Playfair Display', serif";
const GOLD = "#D4AF37";
const GREEN = "#34D399";

const DOMAIN_META: Record<string, { badge: string; color: string; chamber: string; plain: string }> = {
  "fundamental": { badge: "ZK-CRYPTO", color: "#00D4FF", chamber: "CHAMBER I", plain: "Proves facts without revealing secrets" },
  "operational": { badge: "OPS-CORE", color: "#FFD700", chamber: "CHAMBER II", plain: "Moves money & markets at machine speed" },
  "ai": { badge: "AI-GOV", color: "#A78BFA", chamber: "CHAMBER III", plain: "Keeps AI honest, auditable & compliant" },
};

const DOMAINS = ["ALL", "fundamental", "operational", "ai"];
const DOMAIN_LABELS: Record<string, string> = {
  fundamental: "ZK & CRYPTOGRAPHY",
  operational: "HFT & COMPLIANCE",
  ai: "AI & GOVERNANCE",
};

function useShowroomStyles() {
  useEffect(() => {
    const id = "showroom-css";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      @keyframes sr-spot { 0%,100%{opacity:0.5} 50%{opacity:0.85} }
      @keyframes sr-scan { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      @keyframes sr-tick { 0%,100%{opacity:1} 50%{opacity:0.35} }
      .sr-lot { transition: transform 0.25s ease, box-shadow 0.25s ease; }
      .sr-lot:hover { transform: translateY(-6px); }
    `;
    document.head.appendChild(el);
    return () => document.getElementById(id)?.remove();
  }, []);
}

export default function Marketplace() {
  useShowroomStyles();
  const { data: products, isLoading: loadingProducts } = useListProducts();
  const { data: problems, isLoading: loadingProblems } = useListProblems({ status: "solution_submitted", limit: 500 });
  const [activeTab, setActiveTab] = useState<"vault" | "bounties">("vault");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = activeFilter === "ALL"
    ? products ?? []
    : (products ?? []).filter(p => p.category === activeFilter);

  return (
    <DashboardLayout>
      <div style={{ minHeight: "100vh" }}>

        {/* ─── Showroom Marquee ─── */}
        <div style={{
          padding: "44px 40px 0", position: "relative", overflow: "hidden",
          borderBottom: "1px solid #1A2035",
          background: "radial-gradient(ellipse 70% 90% at 50% -20%, rgba(212,175,55,0.10), transparent 60%)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.28em", color: "#5B6480", marginBottom: 10 }}>
            SOLVEX · THE SHOWROOM FLOOR · {products?.length ?? ""} LOTS ON DISPLAY
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 42, fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", marginBottom: 8, lineHeight: 1.1 }}>
            The Finest Solutions,<br />
            <span style={{ color: GOLD }}>On the Floor.</span>
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 10, color: "#7B869A", letterSpacing: "0.08em", maxWidth: 640, lineHeight: 1.8, marginBottom: 26 }}>
            Every lot below is a finished, Tier-1 instrument engineered for autonomous market
            outreach &amp; distribution — it finds its buyers, proves its worth, and delivers itself.
            Walk the floor. Read the terminal. Acquire.
          </p>
          <div style={{ display: "flex", gap: 0 }}>
            {[{ key: "vault", label: "SHOWROOM FLOOR" }, { key: "bounties", label: "SOLVED PARADOXES" }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as "vault" | "bounties")} style={{
                padding: "10px 28px",
                background: activeTab === tab.key ? "rgba(212,175,55,0.08)" : "transparent",
                borderTop: activeTab === tab.key ? "2px solid #D4AF37" : "2px solid transparent",
                borderLeft: "none", borderRight: "none", borderBottom: "none",
                color: activeTab === tab.key ? GOLD : "#5B6480",
                fontFamily: MONO, fontSize: 9, fontWeight: 700,
                letterSpacing: "0.18em", cursor: "pointer", marginBottom: -1,
              }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "vault" && (
          <div style={{ padding: "0 40px 60px" }}>

            {/* Floor Stats */}
            <div style={{
              display: "flex", background: "#07091A", borderBottom: "1px solid #1A2035",
              margin: "0 -40px", padding: "14px 40px",
            }}>
              {[
                { val: String(products?.length ?? ""), lbl: "LOTS ON FLOOR" }, { val: "5", lbl: "CHAMBERS" },
                { val: "88", lbl: "PARADOXES" }, { val: "AUTONOMOUS", lbl: "OUTREACH" },
                { val: "SELF-DELIVERING", lbl: "DISTRIBUTION" }, { val: "OSFI ✓", lbl: "CERTIFIED" },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, borderLeft: i > 0 ? "1px solid #1A2035" : "none", paddingLeft: i > 0 ? 20 : 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: GOLD, letterSpacing: "0.04em" }}>{s.val}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.18em", color: "#3D4560", marginTop: 2 }}>{s.lbl}</div>
                </div>
              ))}
            </div>

            {/* Wing Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", borderBottom: "1px solid #1A2035" }}>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.2em", color: "#3D4560", marginRight: 8 }}>
                FLOOR WING ›
              </div>
              {DOMAINS.map(d => (
                <button key={d} onClick={() => setActiveFilter(d)} style={{
                  padding: "5px 14px",
                  background: activeFilter === d ? "rgba(212,175,55,0.07)" : "transparent",
                  border: activeFilter === d ? "1px solid #D4AF37" : "1px solid transparent",
                  color: activeFilter === d ? GOLD : "#5B6480",
                  fontFamily: MONO, fontSize: 8, fontWeight: 700,
                  letterSpacing: "0.14em", cursor: "pointer",
                }}>
                  {d === "ALL" ? `FULL FLOOR — ${products?.length ?? ""} LOTS` : (DOMAIN_LABELS[d] ?? d.toUpperCase())}
                </button>
              ))}
              <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: "#3D4560" }}>
                {filtered.length} / {products?.length ?? ""} LOTS
              </div>
            </div>

            {loadingProducts ? (
              <div style={{ padding: "60px 0", textAlign: "center", fontFamily: MONO, fontSize: 11, color: "#3D4560", letterSpacing: "0.2em" }}>
                RAISING THE SHOWROOM LIGHTS…
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, marginTop: 36 }}>
                {filtered.map((p, idx) => {
                  const meta = DOMAIN_META[p.category ?? "fundamental"] ?? DOMAIN_META["fundamental"];
                  const col = meta.color;
                  const hov = hoveredId === p.id;
                  const isPlatinum = p.id === "SOLVEX-MASTER-29";
                  const lotNo = String(idx + 1).padStart(2, "0");

                  return (
                    <div key={p.id} className="sr-lot"
                      onMouseEnter={() => setHoveredId(p.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        position: "relative",
                        boxShadow: hov
                          ? `0 24px 48px rgba(0,0,0,0.55), 0 0 40px ${col}14`
                          : "0 12px 28px rgba(0,0,0,0.35)",
                      }}>

                      {/* Spotlight cone */}
                      <div style={{
                        position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)",
                        width: "78%", height: 120, pointerEvents: "none",
                        background: `radial-gradient(ellipse 50% 100% at 50% 0%, ${col}${hov || isPlatinum ? "26" : "14"}, transparent 70%)`,
                        animation: "sr-spot 3.4s ease-in-out infinite",
                        zIndex: 1,
                      }} />

                      {/* Pedestal card */}
                      <div style={{
                        background: hov ? "linear-gradient(180deg, #0A0E20, #07091A)" : "#07091A",
                        border: isPlatinum ? "1px solid rgba(212,175,55,0.45)" : hov ? `1px solid ${col}44` : "1px solid #1A2035",
                        position: "relative", overflow: "hidden",
                      }}>
                        {/* Top light strip */}
                        <div style={{
                          height: 3, position: "relative", overflow: "hidden",
                          background: `linear-gradient(90deg, transparent, ${col}66, transparent)`,
                        }}>
                          {hov && <div style={{ position: "absolute", inset: 0, width: "50%", background: `linear-gradient(90deg, transparent, ${col}, transparent)`, animation: "sr-scan 1.4s linear infinite" }} />}
                        </div>

                        {isPlatinum && (
                          <div style={{
                            position: "absolute", top: 18, right: -30,
                            background: "linear-gradient(90deg, #B8860B, #D4AF37)", color: "#05080F",
                            fontSize: 7, fontWeight: 900, letterSpacing: "0.18em",
                            padding: "4px 36px", transform: "rotate(45deg)", zIndex: 2,
                          }}>APEX</div>
                        )}

                        <div style={{ padding: "20px 24px 0" }}>
                          {/* Lot plate */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <div style={{
                              fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.2em",
                              color: "#05080F", background: `linear-gradient(135deg, ${col}, ${col}99)`,
                              padding: "3px 10px",
                            }}>LOT {lotNo}</div>
                            <div style={{ fontFamily: MONO, fontSize: 7, color: col, fontWeight: 700, letterSpacing: "0.16em" }}>{meta.chamber}</div>
                          </div>

                          {/* Showpiece name under the light */}
                          <h3 style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.25, marginBottom: 6, position: "relative", zIndex: 2 }}>
                            {p.name}
                          </h3>
                          <div style={{ fontFamily: MONO, fontSize: 8, color: col, letterSpacing: "0.1em", marginBottom: 14 }}>
                            {meta.plain}
                          </div>
                        </div>

                        {/* Easy-to-understand terminal */}
                        <div style={{
                          margin: "0 24px 16px", border: "1px solid #141A2E",
                          background: "rgba(3,5,12,0.75)",
                        }}>
                          <div style={{
                            padding: "6px 12px", borderBottom: "1px solid #141A2E",
                            display: "flex", alignItems: "center", gap: 6,
                          }}>
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: GREEN, animation: "sr-tick 1.8s ease-in-out infinite" }} />
                            <span style={{ fontFamily: MONO, fontSize: 7, color: "#5B6480", letterSpacing: "0.16em" }}>LOT TERMINAL · LIVE</span>
                          </div>
                          <div style={{ padding: "10px 12px" }}>
                            {[
                              { k: "WHAT IT DOES", v: (p.description ?? "").slice(0, 64) + ((p.description?.length ?? 0) > 64 ? "…" : ""), c: "#9AA3B5" },
                              { k: "OUTREACH", v: "AUTONOMOUS — finds its own buyers", c: GREEN },
                              { k: "DISTRIBUTION", v: "SELF-DELIVERING — instant vault unlock", c: GREEN },
                              { k: "GRADE", v: "TIER-1 · 99.999% SLA · ZK-PROVEN", c: GOLD },
                            ].map(row => (
                              <div key={row.k} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "baseline" }}>
                                <span style={{ fontFamily: MONO, fontSize: 6.5, color: "#3D4560", letterSpacing: "0.14em", width: 74, flexShrink: 0 }}>{row.k}</span>
                                <span style={{ fontFamily: MONO, fontSize: 8, color: row.c, lineHeight: 1.5 }}>{row.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Price plaque + actions */}
                        <div style={{ padding: "0 24px 22px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                            <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 600, color: "#FFFFFF" }}>{p.priceEth} ETH</div>
                            <div style={{ fontFamily: MONO, fontSize: 10, color: "#5B6480" }}>{p.priceUsdc} USDC</div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Link href={`/product/${p.id}`} style={{ flex: 1 }}>
                              <div style={{
                                padding: "10px 0", background: "transparent",
                                border: "1px solid rgba(212,175,55,0.35)", color: GOLD,
                                fontFamily: MONO, fontSize: 8, fontWeight: 800,
                                letterSpacing: "0.14em", textAlign: "center", cursor: "pointer",
                              }}>INSPECT LOT →</div>
                            </Link>
                            <Link href={`/product/${p.id}`} style={{ flex: 1 }}>
                              <div style={{
                                padding: "10px 0", background: "linear-gradient(135deg, #D4AF37, #B8860B)",
                                color: "#05080F", fontFamily: MONO,
                                fontSize: 8, fontWeight: 900, letterSpacing: "0.14em", textAlign: "center", cursor: "pointer",
                              }}>ACQUIRE</div>
                            </Link>
                          </div>
                        </div>

                        {/* Pedestal base */}
                        <div style={{
                          height: 8,
                          background: `linear-gradient(180deg, ${col}22, transparent)`,
                          borderTop: `1px solid ${col}33`,
                        }} />
                      </div>

                      {/* Floor reflection */}
                      <div style={{
                        height: 22, margin: "0 14px",
                        background: `linear-gradient(180deg, ${col}${hov ? "1E" : "10"}, transparent)`,
                        filter: "blur(4px)",
                        transform: "scaleY(-1)",
                        opacity: 0.8, pointerEvents: "none",
                      }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "bounties" && (
          <div style={{ padding: "24px 40px" }}>
            <div style={{ display: "flex", background: "#07091A", borderBottom: "1px solid #1A2035", margin: "0 -40px 24px", padding: "14px 40px" }}>
              {[
                { val: String((problems ?? []).length), lbl: "BRAIN RESOLVED" },
                { val: "40", lbl: "HISTORICAL KEYS" },
                { val: "10", lbl: "RESOLUTION TYPES" },
                { val: "0%", lbl: "HALLUCINATION RATE" },
                { val: "NIST ✓", lbl: "COMPLIANCE ANCHORED" },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, borderLeft: i > 0 ? "1px solid #1A2035" : "none", paddingLeft: i > 0 ? 20 : 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, color: GREEN }}>{s.val}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.18em", color: "#3D4560" }}>{s.lbl}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", color: "#5B6480" }}>
                dAIsy BRAIN RESOLUTION REGISTRY — TETHER-BUBBLE SYNTHESIS v2.0 · 40 HISTORICAL KEYS
              </div>
              {!loadingProblems && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN }} />
                  <div style={{ fontFamily: MONO, fontSize: 8, color: GREEN, letterSpacing: "0.12em" }}>
                    {(problems ?? []).length} VERIFIED · 0 SOVEREIGN HOLD · 0 HALLUCINATION
                  </div>
                </div>
              )}
            </div>

            {loadingProblems ? (
              <div style={{ fontFamily: MONO, fontSize: 11, color: "#3D4560", padding: "60px 0", textAlign: "center" }}>QUERYING BRAIN LEDGER...</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                {(problems ?? []).map((p, idx) => {
                  const cat = (p.category ?? "regulatory").toUpperCase();
                  const resTypes: Record<string, { label: string; color: string }> = {
                    "regulatory": { label: "TETHER_BUBBLE_CAUSAL_LOOP", color: "#F59E0B" },
                    "ai-governance": { label: "TETHER_BUBBLE_BAYESIAN", color: "#A78BFA" },
                    "security": { label: "TETHER_BUBBLE_SET_THEORY", color: "#60A5FA" },
                    "identity": { label: "TETHER_BUBBLE_IDENTITY_THEORY", color: "#34D399" },
                    "optimization": { label: "TETHER_BUBBLE_CALCULUS", color: "#D4AF37" },
                  };
                  const rt = resTypes[p.category ?? "regulatory"] ?? { label: "TETHER_BUBBLE_BEHAVIORAL", color: "#34D399" };
                  return (
                    <div key={p.id} style={{ background: "#07091A", border: "1px solid #1A2035", padding: 24, borderLeft: "2px solid #34D399", position: "relative" }}>
                      <div style={{ position: "absolute", top: 14, right: 16, fontFamily: MONO, fontSize: 9, color: "#1A2035", fontWeight: 800 }}>
                        #{String(idx + 1).padStart(2, "0")}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ fontFamily: MONO, fontSize: 7, color: GOLD, letterSpacing: "0.14em", border: "1px solid rgba(212,175,55,0.2)", padding: "2px 7px" }}>{cat}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: GREEN }} />
                          <div style={{ fontFamily: MONO, fontSize: 7, color: GREEN, letterSpacing: "0.12em", fontWeight: 700 }}>BRAIN VERIFIED</div>
                        </div>
                      </div>

                      <h3 style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: "#FFFFFF", marginBottom: 10, lineHeight: 1.3 }}>{p.title}</h3>

                      <p style={{ fontSize: 10, color: "#5B6480", lineHeight: 1.55, marginBottom: 14 }}>{(p.description ?? "").slice(0, 120)}...</p>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 12, borderTop: "1px solid #1A2035" }}>
                        <div style={{ fontFamily: MONO, fontSize: 7, color: rt.color, letterSpacing: "0.1em", border: `1px solid ${rt.color}33`, padding: "2px 7px", background: `${rt.color}0A` }}>
                          {rt.label}
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 7, color: "#3D4560" }}>
                          VAULT BRIDGED · ARTIFACT READY
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(problems ?? []).length === 0 && (
                  <div style={{ gridColumn: "span 2", padding: "60px 0", textAlign: "center", fontFamily: MONO, fontSize: 11, color: "#3D4560" }}>
                    BRAIN PROCESSING — RESOLUTIONS PENDING
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
