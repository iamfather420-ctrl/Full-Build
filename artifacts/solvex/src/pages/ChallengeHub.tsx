import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "../components/DashboardLayout";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Platform {
  id: string;
  name: string;
  focus: string;
  bestFor: string;
  url: string;
  tier: string;
  color: string;
  challengeCount: number;
  status: string;
}

interface Challenge {
  id: string;
  platformId: string;
  platformName: string;
  title: string;
  description: string | null;
  prizeValue: string | null;
  deadline: string | null;
  requirements: string | null;
  category: string | null;
  sourceUrl: string | null;
  feasibilityScore: number | null;
  paradoxMatches: string[] | null;
  complianceFlags: string[] | null;
  submissionStatus: string | null;
  scrapedAt: string | null;
}

interface DisclosureResult {
  platformName: string;
  challengeTitle: string;
  generatedAt: string;
  document: string;
}

const TIER_COLORS: Record<string, string> = {
  FEDERAL: "#60A5FA",
  GLOBAL: "#A78BFA",
  ENTERPRISE: "#34D399",
  CYBERSECURITY: "#F87171",
  GOVERNMENT: "#D4AF37",
};

const STATUS_COLORS: Record<string, string> = {
  DISCOVERED: "#5B6480",
  ANALYZING: "#F59E0B",
  FEASIBLE: "#34D399",
  SUBMITTED: "#A78BFA",
};

const CATEGORY_COLORS: Record<string, string> = {
  identity: "#60A5FA",
  security: "#F87171",
  "ai-governance": "#A78BFA",
  optimization: "#34D399",
  regulatory: "#F59E0B",
};

// ── Protocol Step Component ────────────────────────────────────────────────────
function ProtocolStep({ step, label, sub, active, done }: {
  step: number; label: string; sub: string; active: boolean; done: boolean;
}) {
  return (
    <div style={{
      flex: 1, padding: "12px 16px",
      border: `1px solid ${active ? "#D4AF37" : done ? "#34D39940" : "#1A2035"}`,
      background: active ? "#D4AF3708" : done ? "#34D39908" : "transparent",
      position: "relative",
    }}>
      {active && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, #D4AF37, transparent)",
        }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          background: done ? "#34D399" : active ? "#D4AF37" : "#1A2035",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700,
          color: done || active ? "#05080F" : "#3D4560", flexShrink: 0,
        }}>{done ? "✓" : step}</div>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.18em", color: active ? "#D4AF37" : done ? "#34D399" : "#3D4560",
        }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#3D4560", letterSpacing: "0.08em" }}>
        {sub}
      </div>
    </div>
  );
}

// ── Platform Card ─────────────────────────────────────────────────────────────
function PlatformCard({ platform, onScan, scanning }: {
  platform: Platform; onScan: (id: string) => void; scanning: boolean;
}) {
  return (
    <div style={{
      border: `1px solid ${platform.color}22`,
      background: `${platform.color}05`,
      padding: "16px",
      position: "relative",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${platform.color}, transparent)` }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, letterSpacing: "0.2em",
            color: platform.color, fontWeight: 700, marginBottom: 4,
          }}>{platform.tier}</div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700,
            color: "#E8EAF0", letterSpacing: "0.05em",
          }}>{platform.name}</div>
        </div>
        <div style={{
          background: `${platform.color}20`, border: `1px solid ${platform.color}40`,
          padding: "4px 10px",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: platform.color, fontWeight: 700,
        }}>
          {platform.challengeCount}
        </div>
      </div>

      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#5B6480", marginBottom: 6, lineHeight: 1.5 }}>
        {platform.focus}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#3D4560", marginBottom: 12, lineHeight: 1.5 }}>
        BEST FOR: {platform.bestFor}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#34D399",
            boxShadow: "0 0 6px 2px #34D39966",
          }} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#34D399", letterSpacing: "0.12em" }}>
            MONITORING
          </span>
        </div>
        <button
          onClick={() => onScan(platform.id)}
          disabled={scanning}
          style={{
            padding: "5px 12px", background: "transparent",
            border: `1px solid ${platform.color}60`, color: platform.color,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.12em",
            cursor: scanning ? "not-allowed" : "pointer", opacity: scanning ? 0.5 : 1,
          }}>{scanning ? "SCANNING..." : "SCAN NOW"}</button>
      </div>
    </div>
  );
}

// ── Challenge Card ─────────────────────────────────────────────────────────────
function ChallengeCard({ challenge, onFeasibility, onDisclosure, loadingFeasibility, loadingDisclosure }: {
  challenge: Challenge;
  onFeasibility: (c: Challenge) => void;
  onDisclosure: (c: Challenge) => void;
  loadingFeasibility: boolean;
  loadingDisclosure: boolean;
}) {
  const score = challenge.feasibilityScore ?? 0;
  const scoreColor = score >= 80 ? "#34D399" : score >= 60 ? "#D4AF37" : "#F59E0B";
  const statusColor = STATUS_COLORS[challenge.submissionStatus ?? "DISCOVERED"] ?? "#5B6480";
  const catColor = CATEGORY_COLORS[challenge.category ?? "regulatory"] ?? "#5B6480";

  return (
    <div style={{
      border: "1px solid #1A2035",
      background: "#07091A",
      padding: "20px",
      position: "relative",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: scoreColor }} />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ flex: 1, paddingRight: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, letterSpacing: "0.15em",
              color: catColor, border: `1px solid ${catColor}40`, padding: "2px 6px",
            }}>{challenge.category?.toUpperCase() ?? "MISC"}</span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, letterSpacing: "0.12em",
              color: statusColor, border: `1px solid ${statusColor}40`, padding: "2px 6px",
            }}>{challenge.submissionStatus ?? "DISCOVERED"}</span>
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700,
            color: "#E8EAF0", lineHeight: 1.4, marginBottom: 4,
          }}>{challenge.title}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#60A5FA", letterSpacing: "0.1em" }}>
            {challenge.platformName}
          </div>
        </div>

        {/* Feasibility Score */}
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            border: `3px solid ${scoreColor}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `${scoreColor}10`,
          }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 800,
              color: scoreColor,
            }}>{score}</span>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#3D4560", marginTop: 4, letterSpacing: "0.1em" }}>
            FEASIBILITY
          </div>
        </div>
      </div>

      {/* Description */}
      {challenge.description && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#5B6480",
          lineHeight: 1.6, marginBottom: 12,
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>{challenge.description}</div>
      )}

      {/* Meta row */}
      <div style={{ display: "flex", gap: 24, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#3D4560", letterSpacing: "0.12em" }}>PRIZE VALUE</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: "#34D399" }}>
            {challenge.prizeValue ?? "TBD"}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#3D4560", letterSpacing: "0.12em" }}>DEADLINE</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#E8EAF0" }}>
            {challenge.deadline ?? "OPEN"}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#3D4560", letterSpacing: "0.12em" }}>PARADOX MATCHES</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: "#A78BFA" }}>
            {(challenge.paradoxMatches ?? []).length}
          </div>
        </div>
      </div>

      {/* Compliance flags */}
      {(challenge.complianceFlags ?? []).length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
          {(challenge.complianceFlags ?? []).slice(0, 6).map(flag => (
            <span key={flag} style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 6, color: "#D4AF37",
              border: "1px solid #D4AF3730", padding: "2px 5px", letterSpacing: "0.1em",
            }}>✓ {flag}</span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onFeasibility(challenge)}
          disabled={loadingFeasibility}
          style={{
            flex: 1, padding: "8px", background: "transparent",
            border: "1px solid #D4AF3760", color: "#D4AF37",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.12em",
            cursor: loadingFeasibility ? "not-allowed" : "pointer", opacity: loadingFeasibility ? 0.5 : 1,
          }}>{loadingFeasibility ? "ANALYZING..." : "RUN FEASIBILITY GATE →"}</button>
        <button
          onClick={() => onDisclosure(challenge)}
          disabled={loadingDisclosure}
          style={{
            flex: 1, padding: "8px",
            background: "linear-gradient(135deg, #D4AF37, #B8860B)",
            border: "none", color: "#05080F",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.12em",
            cursor: loadingDisclosure ? "not-allowed" : "pointer", opacity: loadingDisclosure ? 0.5 : 1,
          }}>{loadingDisclosure ? "GENERATING..." : "GENERATE DISCLOSURE"}</button>
      </div>
    </div>
  );
}

// ── Disclosure Modal ───────────────────────────────────────────────────────────
function DisclosureModal({ disclosure, onClose }: { disclosure: DisclosureResult; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: "#07091A", border: "1px solid #D4AF37",
        width: "100%", maxWidth: 800, maxHeight: "85vh",
        display: "flex", flexDirection: "column",
        position: "relative",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #D4AF37, transparent)" }} />

        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #1A2035",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#D4AF37", letterSpacing: "0.2em", marginBottom: 4 }}>
              COMPLIANCE DISCLOSURE · dAIsy haMINJA AUTONOMOUS COMPLIANCE ENGINE
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: "#E8EAF0" }}>
              {disclosure.challengeTitle}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#5B6480", marginTop: 2 }}>
              {disclosure.platformName} · {disclosure.generatedAt}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "1px solid #1A2035",
              color: "#5B6480", padding: "6px 12px",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, cursor: "pointer",
            }}>✕ CLOSE</button>
        </div>

        {/* Document */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <pre style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#8B94B0",
            lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word",
            margin: 0,
          }}>{disclosure.document}</pre>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid #1A2035",
          display: "flex", gap: 10, justifyContent: "flex-end",
        }}>
          <button
            onClick={() => { navigator.clipboard.writeText(disclosure.document); }}
            style={{
              padding: "8px 16px", background: "transparent",
              border: "1px solid #D4AF3760", color: "#D4AF37",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.12em",
              cursor: "pointer",
            }}>COPY TO CLIPBOARD</button>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px", background: "linear-gradient(135deg, #D4AF37, #B8860B)",
              border: "none", color: "#05080F",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.12em",
              cursor: "pointer",
            }}>AUTHORIZE SUBMISSION</button>
        </div>
      </div>
    </div>
  );
}

// ── Feasibility Panel ─────────────────────────────────────────────────────────
function FeasibilityPanel({ challenge, result, onClose }: {
  challenge: Challenge; result: {
    score: number; paradoxMatches: string[]; complianceFlags: string[];
    resolutionTypes: string[]; reasoning: string;
  }; onClose: () => void;
}) {
  const scoreColor = result.score >= 80 ? "#34D399" : result.score >= 60 ? "#D4AF37" : "#F59E0B";
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: "#07091A", border: `1px solid ${scoreColor}`,
        width: "100%", maxWidth: 640,
        position: "relative",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${scoreColor}, transparent)` }} />

        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1A2035" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: scoreColor, letterSpacing: "0.2em", marginBottom: 4 }}>
            dAIsy FEASIBILITY GATE RESULT
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: "#E8EAF0" }}>
            {challenge.title}
          </div>
        </div>

        <div style={{ padding: "20px" }}>
          {/* Score */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, padding: "16px", background: `${scoreColor}08`, border: `1px solid ${scoreColor}20` }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 36, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                {result.score}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#3D4560", letterSpacing: "0.15em", marginTop: 4 }}>/ 100</div>
            </div>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, color: scoreColor, marginBottom: 4 }}>
                {result.score >= 80 ? "HIGH VALUE TARGET" : result.score >= 60 ? "VIABLE TARGET" : "EXPLORATORY TARGET"}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#5B6480", lineHeight: 1.5 }}>
                {result.score >= 80
                  ? "dAIsy recommends immediate resource allocation. 54-node simulation ready."
                  : result.score >= 60
                  ? "Viable match. Additional paradox cross-reference recommended before submission."
                  : "Exploratory phase. Monitor for requirement alignment as challenge evolves."}
              </div>
            </div>
          </div>

          {/* Reasoning */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#3D4560", letterSpacing: "0.15em", marginBottom: 8 }}>SCORING RATIONALE</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#8B94B0", lineHeight: 1.6 }}>{result.reasoning}</div>
          </div>

          {/* Resolution Types */}
          {result.resolutionTypes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#3D4560", letterSpacing: "0.15em", marginBottom: 8 }}>TETHER-BUBBLE RESOLUTION TYPES</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.resolutionTypes.map(rt => (
                  <span key={rt} style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#A78BFA",
                    border: "1px solid #A78BFA40", padding: "3px 8px", letterSpacing: "0.08em",
                  }}>{rt.replace("TETHER_BUBBLE_", "").replace(/_/g, " ")}</span>
                ))}
              </div>
            </div>
          )}

          {/* Compliance */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#3D4560", letterSpacing: "0.15em", marginBottom: 8 }}>COMPLIANCE FRAMEWORK MATCH</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {result.complianceFlags.map(f => (
                <span key={f} style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 6, color: "#D4AF37",
                  border: "1px solid #D4AF3730", padding: "2px 5px",
                }}>✓ {f}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #1A2035", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", background: "transparent",
            border: "1px solid #1A2035", color: "#5B6480",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, cursor: "pointer",
          }}>CLOSE</button>
          <button style={{
            padding: "8px 16px", background: "linear-gradient(135deg, #D4AF37, #B8860B)",
            border: "none", color: "#05080F",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.12em",
            cursor: "pointer",
          }}>ADVANCE TO SIMULATE →</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ChallengeHub() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [scanning, setScanning] = useState<string | null>(null);
  const [fullScan, setFullScan] = useState(false);
  const [feasibilityLoading, setFeasibilityLoading] = useState<string | null>(null);
  const [disclosureLoading, setDisclosureLoading] = useState<string | null>(null);
  const [disclosure, setDisclosure] = useState<DisclosureResult | null>(null);
  const [feasibilityResult, setFeasibilityResult] = useState<{ challenge: Challenge; result: any } | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [protocolStep, setProtocolStep] = useState(1);

  const loadData = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/challenges/platforms"),
        fetch("/api/challenges"),
      ]);
      if (pRes.ok) setPlatforms(await pRes.json());
      if (cRes.ok) setChallenges(await cRes.json());
    } catch { /* graceful */ }
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(() => setProtocolStep(s => s >= 4 ? 1 : s + 1), 3000);
    return () => clearInterval(t);
  }, [loadData]);

  const handleScan = async (platformId?: string) => {
    if (platformId) {
      setScanning(platformId);
    } else {
      setFullScan(true);
    }
    setProtocolStep(1);

    try {
      const body = platformId ? { platformId } : {};
      await fetch("/api/challenges/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await loadData();
    } catch { /* graceful */ }

    setScanning(null);
    setFullScan(false);
    setProtocolStep(4);
  };

  const handleFeasibility = async (challenge: Challenge) => {
    setFeasibilityLoading(challenge.id);
    try {
      const res = await fetch("/api/challenges/feasibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id }),
      });
      if (res.ok) {
        const result = await res.json();
        setFeasibilityResult({ challenge, result });
        await loadData();
      }
    } catch { /* graceful */ }
    setFeasibilityLoading(null);
  };

  const handleDisclosure = async (challenge: Challenge) => {
    setDisclosureLoading(challenge.id);
    try {
      const res = await fetch("/api/challenges/compliance-disclosure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id }),
      });
      if (res.ok) setDisclosure(await res.json());
    } catch { /* graceful */ }
    setDisclosureLoading(null);
  };

  const filtered = challenges.filter(c => {
    if (filterPlatform !== "ALL" && c.platformId !== filterPlatform) return false;
    if (filterStatus !== "ALL" && c.submissionStatus !== filterStatus) return false;
    return true;
  });

  const totalFeasible = challenges.filter(c => (c.feasibilityScore ?? 0) >= 80).length;
  const totalPrize = challenges.reduce((sum, c) => {
    const m = c.prizeValue?.match(/[\d,]+/);
    return sum + (m ? parseInt(m[0].replace(/,/g, "")) : 0);
  }, 0);

  return (
    <DashboardLayout>
      <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.3em", color: "#D4AF37", marginBottom: 8, fontWeight: 600 }}>
                dAIsy haMINJA · CHALLENGE HUB · U.A.R.E.F.A.K.E. ENGINE
              </div>
              <h1 style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 800,
                color: "#E8EAF0", margin: 0, letterSpacing: "0.05em",
              }}>Enterprise Innovation<br />Challenge Monitor</h1>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#5B6480", marginTop: 8, lineHeight: 1.6 }}>
                Autonomous monitoring of 6 enterprise/government innovation platforms · dAIsy cross-references each challenge against 88 resolved paradoxes
              </div>
            </div>

            <button
              onClick={() => handleScan()}
              disabled={fullScan}
              style={{
                padding: "12px 20px",
                background: fullScan ? "transparent" : "linear-gradient(135deg, #D4AF37, #B8860B)",
                border: fullScan ? "1px solid #D4AF37" : "none",
                color: fullScan ? "#D4AF37" : "#05080F",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.2em",
                cursor: fullScan ? "not-allowed" : "pointer", flexShrink: 0,
              }}>
              {fullScan ? "⟳ SCANNING ALL PLATFORMS..." : "⊕ FULL PLATFORM SCAN"}
            </button>
          </div>
        </div>

        {/* Integration Protocol Pipeline */}
        <div style={{ marginBottom: 24, border: "1px solid #1A2035", padding: "16px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#3D4560", letterSpacing: "0.2em", marginBottom: 12 }}>
            dAIsy INTEGRATION PROTOCOL — AUTONOMOUS PIPELINE
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            <ProtocolStep step={1} label="PARSE" sub="Scrape challenge briefs · Extract requirements + constraints" active={protocolStep === 1} done={protocolStep > 1} />
            <ProtocolStep step={2} label="CROSS-REF" sub="Map against 88 paradoxes · TETHER-BUBBLE v2.0 alignment" active={protocolStep === 2} done={protocolStep > 2} />
            <ProtocolStep step={3} label="SIMULATE" sub="54-node feasibility gate · NIST/SOC2/ISO compliance check" active={protocolStep === 3} done={protocolStep > 3} />
            <ProtocolStep step={4} label="EXECUTE" sub="Auto-disclosure + submission dossier · IRS-First sequestration" active={protocolStep === 4} done={false} />
          </div>
        </div>

        {/* Stats Bar */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1,
          background: "#1A2035", marginBottom: 28,
        }}>
          {[
            { label: "PLATFORMS", value: `${platforms.length}`, color: "#D4AF37" },
            { label: "CHALLENGES", value: `${challenges.length}`, color: "#60A5FA" },
            { label: "FEASIBLE TARGETS", value: `${totalFeasible}`, color: "#34D399" },
            { label: "TOTAL PRIZE POOL", value: `$${(totalPrize / 1e6).toFixed(1)}M`, color: "#A78BFA" },
            { label: "COMPLIANCE READY", value: `${challenges.length}`, color: "#D4AF37" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "#07091A", padding: "14px 18px" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#3D4560", letterSpacing: "0.15em", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Platform Grid */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "#5B6480", marginBottom: 14, fontWeight: 600 }}>
            MONITORED PLATFORMS — AUTONOMOUS SCRAPER ACTIVE
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {platforms.map(p => (
              <PlatformCard
                key={p.id}
                platform={p}
                onScan={handleScan}
                scanning={scanning === p.id}
              />
            ))}
          </div>
        </div>

        {/* Challenge Feed */}
        <div>
          {/* Filter row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "#5B6480", fontWeight: 600 }}>
              CHALLENGE FEED — {filtered.length} / {challenges.length} CHALLENGES
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={filterPlatform}
                onChange={e => setFilterPlatform(e.target.value)}
                style={{
                  background: "#07091A", border: "1px solid #1A2035", color: "#5B6480",
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, padding: "6px 10px",
                  letterSpacing: "0.1em", cursor: "pointer",
                }}>
                <option value="ALL">ALL PLATFORMS</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{
                  background: "#07091A", border: "1px solid #1A2035", color: "#5B6480",
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, padding: "6px 10px",
                  letterSpacing: "0.1em", cursor: "pointer",
                }}>
                <option value="ALL">ALL STATUSES</option>
                <option value="FEASIBLE">FEASIBLE</option>
                <option value="ANALYZING">ANALYZING</option>
                <option value="DISCOVERED">DISCOVERED</option>
                <option value="SUBMITTED">SUBMITTED</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{
              border: "1px solid #1A2035", padding: "48px",
              textAlign: "center",
            }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, color: "#1A2035", marginBottom: 16 }}>⊕</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#3D4560", marginBottom: 8 }}>
                NO CHALLENGES DISCOVERED YET
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#2A3050", marginBottom: 20 }}>
                Run a full platform scan to populate the challenge feed.
              </div>
              <button
                onClick={() => handleScan()}
                style={{
                  padding: "12px 24px", background: "linear-gradient(135deg, #D4AF37, #B8860B)",
                  border: "none", color: "#05080F",
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.2em",
                  cursor: "pointer",
                }}>⊕ INITIATE PLATFORM SCAN</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {filtered.map(c => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  onFeasibility={handleFeasibility}
                  onDisclosure={handleDisclosure}
                  loadingFeasibility={feasibilityLoading === c.id}
                  loadingDisclosure={disclosureLoading === c.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Strategic Targets Note */}
        <div style={{ marginTop: 32, border: "1px solid #1A2035", padding: "20px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#D4AF37", letterSpacing: "0.2em", marginBottom: 12 }}>
            dAIsy haMINJA STRATEGIC TARGETS — 2026 ARCHITECTURE INTERFACES
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {[
              { title: "DECENTRALIZED AI & ON-CHAIN GOVERNANCE", desc: "Autonomous DeFi treasury management, verifiable on-chain decision-making. dAIsy deploys recursive agents to optimize smart contract execution and risk mitigation in permissioned liquidity pools.", color: "#60A5FA" },
              { title: "EMBODIED AI & ROBOTIC MANIPULATION (ICRA 2026)", desc: "Dexterous manipulation, real-world embodied intelligence, cloud robotics. Interfacing simulation-to-physical workcells to validate 54-node logic against real-time physical constraints.", color: "#A78BFA" },
              { title: "PRIVACY-ENHANCING TECHNOLOGIES (PETs)", desc: "Secure Multi-Party Computation (MPC), Zero Knowledge Proofs (ZKP). dAIsy bridges proprietary paradox solutions with compliance-heavy financial data without compromising IP.", color: "#34D399" },
              { title: "AUTONOMOUS AGENT ORCHESTRATION", desc: "Scalable production-grade agent workflows (Google ADK, Mastra). Maps dAIsy synaptic loop onto standard agent runtimes — modular digital assembly lines for enterprise B2B.", color: "#F59E0B" },
            ].map(t => (
              <div key={t.title} style={{ padding: "14px", background: "#0B0E1A", border: `1px solid ${t.color}20` }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, fontWeight: 700, color: t.color, marginBottom: 6, letterSpacing: "0.1em" }}>{t.title}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#5B6480", lineHeight: 1.6 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Modals */}
      {disclosure && <DisclosureModal disclosure={disclosure} onClose={() => setDisclosure(null)} />}
      {feasibilityResult && (
        <FeasibilityPanel
          challenge={feasibilityResult.challenge}
          result={feasibilityResult.result}
          onClose={() => setFeasibilityResult(null)}
        />
      )}
    </DashboardLayout>
  );
}
