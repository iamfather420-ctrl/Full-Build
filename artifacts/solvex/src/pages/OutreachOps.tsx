import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";

const MONO = "'IBM Plex Mono', monospace";
const GOLD = "#D4AF37";
const GREEN = "#34D399";
const PURPLE = "#A78BFA";
const BLUE = "#60A5FA";
const RED = "#F87171";
const AMBER = "#FBBF24";

interface Stats {
  total: number;
  newLeads: number;
  draftsReady: number;
  delivered: number;
  replies: number;
  channelConnected: boolean;
}

interface Prospect {
  id: number;
  company: string;
  sector: string;
  region: string;
  stage: string;
  platform: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceAuthor: string | null;
  snippet: string | null;
  draftMessage: string | null;
  postedAt: string | null;
  productName: string | null;
  listPriceEth: string | null;
  fitScore: number;
  lastAction: string | null;
  updatedAt: string;
}

interface OutreachEvent {
  id: number;
  prospectId: number;
  company: string;
  type: string;
  message: string;
  createdAt: string;
}

const STAGE_META: Record<string, { label: string; color: string }> = {
  discovered: { label: "REAL LEAD", color: BLUE },
  composed: { label: "DRAFT READY", color: GOLD },
  delivered: { label: "DELIVERED", color: GREEN },
  replied: { label: "REPLIED", color: PURPLE },
};

const EVENT_META: Record<string, { tag: string; color: string }> = {
  scan: { tag: "SCAN", color: "#9CA3AF" },
  lead: { tag: "REAL LEAD", color: BLUE },
  compose: { tag: "DRAFT", color: GOLD },
  deliver: { tag: "SENT", color: GREEN },
};

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function platformBadge(platform: string | null): { label: string; color: string } {
  if (!platform) return { label: "WEB", color: "#9CA3AF" };
  if (platform.includes("Hacker News")) return { label: "HN", color: "#FF6600" };
  if (platform.includes("Stack Exchange")) return { label: "SE", color: BLUE };
  if (platform.includes("Reddit")) return { label: "RDT", color: "#FF4500" };
  return { label: platform.slice(0, 3).toUpperCase(), color: "#9CA3AF" };
}

export default function OutreachOps() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [emailInputs, setEmailInputs] = useState<Record<number, string>>({});
  const [sendState, setSendState] = useState<Record<number, { status: "sending" | "sent" | "error"; msg?: string }>>({});

  const sendDraft = async (id: number) => {
    const to = (emailInputs[id] ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setSendState(s => ({ ...s, [id]: { status: "error", msg: "Enter a valid email address" } }));
      return;
    }
    setSendState(s => ({ ...s, [id]: { status: "sending" } }));
    try {
      const res = await fetch(`/api/outreach/prospects/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setSendState(s => ({ ...s, [id]: { status: "sent" } }));
    } catch (err) {
      setSendState(s => ({ ...s, [id]: { status: "error", msg: (err as Error).message } }));
    }
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [s, p, e] = await Promise.all([
          fetch("/api/outreach/stats").then(r => r.json()),
          fetch("/api/outreach/prospects").then(r => r.json()),
          fetch("/api/outreach/events?limit=50").then(r => r.json()),
        ]);
        if (!alive) return;
        setStats(s);
        setProspects(p);
        setEvents(e);
        setLoadError(false);
      } catch {
        if (alive) setLoadError(true);
      }
    };
    void load();
    const iv = setInterval(() => void load(), 5000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const drafts = prospects.filter(p => p.stage === "composed");
  const fresh = prospects.filter(p => p.stage === "discovered");

  return (
    <DashboardLayout>
      <div style={{ fontFamily: MONO, padding: "28px 32px", maxWidth: 1400 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 8, color: "#5B6480", letterSpacing: "0.22em", marginBottom: 8 }}>
            AUTONOMOUS OPERATIONS · LIVE MARKET INTELLIGENCE
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8E9F0", letterSpacing: "0.02em", margin: 0 }}>
            Outreach Ops — <span style={{ color: GOLD }}>dAIsy is hunting real leads.</span>
          </h1>
          <div style={{ fontSize: 10, color: "#7B869A", marginTop: 10, lineHeight: 1.7, maxWidth: 780 }}>
            dAIsy haMINJA scans live public forums — Hacker News, Stack Exchange — for real people actively
            asking about problems the SolveX catalog solves. Every lead below is a genuine post with a real
            source link. She composes a tailored reply for each, ready to transmit the moment a delivery
            channel is connected.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", border: `1px solid ${GREEN}44`, background: `${GREEN}0D` }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN, boxShadow: `0 0 8px ${GREEN}`, display: "inline-block" }} />
              <span style={{ fontSize: 8, color: GREEN, letterSpacing: "0.16em", fontWeight: 700 }}>HUNT ENGINE LIVE — SCANNING HN + STACK EXCHANGE</span>
            </div>
            {stats && !stats.channelConnected && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", border: `1px solid ${AMBER}44`, background: `${AMBER}0D` }}>
                <span style={{ fontSize: 8, color: AMBER, letterSpacing: "0.16em", fontWeight: 700 }}>
                  ⚠ DELIVERY CHANNEL: NOT CONNECTED — drafts queue until email / platform account is linked
                </span>
              </div>
            )}
            {stats?.channelConnected && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", border: `1px solid ${GREEN}44`, background: `${GREEN}0D` }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN, boxShadow: `0 0 8px ${GREEN}`, display: "inline-block" }} />
                <span style={{ fontSize: 8, color: GREEN, letterSpacing: "0.16em", fontWeight: 700 }}>
                  EMAIL CHANNEL: CONNECTED (GMAIL) — add a recipient address on any draft to send it
                </span>
              </div>
            )}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", border: `1px solid ${AMBER}44`, background: `${AMBER}0D` }}>
              <span style={{ fontSize: 8, color: AMBER, letterSpacing: "0.16em", fontWeight: 700 }}>
                REDDIT: NOT CONNECTED — forum replies remain manual (copy the draft to the source thread)
              </span>
            </div>
          </div>
        </div>

        {loadError && (
          <div style={{ marginBottom: 18, padding: "10px 14px", border: `1px solid ${RED}55`, background: `${RED}0D`, fontSize: 9, color: RED, letterSpacing: "0.08em" }}>
            ⚠ TELEMETRY LINK INTERRUPTED — retrying automatically…
          </div>
        )}

        {/* Stats bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2, marginBottom: 26 }}>
          {[
            { l: "REAL LEADS FOUND", v: stats ? String(stats.total) : "—", c: "#E8E9F0" },
            { l: "AWAITING DRAFT", v: stats ? String(stats.newLeads) : "—", c: BLUE },
            { l: "DRAFTS READY", v: stats ? String(stats.draftsReady) : "—", c: GOLD },
            { l: "DELIVERED", v: stats ? String(stats.delivered) : "—", c: GREEN },
            { l: "REPLIES", v: stats ? String(stats.replies) : "—", c: PURPLE },
          ].map(s => (
            <div key={s.l} style={{ border: "1px solid #141A2E", background: "rgba(7,9,26,0.7)", padding: "16px 18px" }}>
              <div style={{ fontSize: 7, color: "#3D4560", letterSpacing: "0.18em", marginBottom: 8 }}>{s.l}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: s.c, letterSpacing: "0.02em" }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          {/* Left: real leads with drafts */}
          <div style={{ flex: 1.25, minWidth: 0 }}>
            <div style={{ border: "1px solid #141A2E", background: "rgba(5,8,15,0.85)" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid #141A2E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 9, color: GOLD, letterSpacing: "0.18em", fontWeight: 700 }}>
                  REAL LEADS &amp; COMPOSED REPLIES ({drafts.length + fresh.length})
                </span>
                <span style={{ fontSize: 7.5, color: "#3D4560", letterSpacing: "0.1em" }}>CLICK A LEAD TO VIEW DRAFT</span>
              </div>
              <div style={{ maxHeight: 680, overflowY: "auto" }}>
                {drafts.length + fresh.length === 0 && (
                  <div style={{ padding: 24, fontSize: 9, color: "#5B6480", letterSpacing: "0.1em" }}>
                    First hunt cycle in progress — real leads land within one or two cycles…
                  </div>
                )}
                {[...drafts, ...fresh].map(p => {
                  const meta = STAGE_META[p.stage] ?? { label: p.stage.toUpperCase(), color: "#9CA3AF" };
                  const badge = platformBadge(p.platform);
                  const open = expanded === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setExpanded(open ? null : p.id)}
                      style={{ padding: "14px 20px", borderBottom: "1px solid #0D1222", cursor: "pointer", background: open ? "rgba(212,175,55,0.03)" : "transparent" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 7, fontWeight: 800, letterSpacing: "0.1em", color: badge.color,
                          border: `1px solid ${badge.color}55`, padding: "2px 7px", background: `${badge.color}0D`,
                        }}>{badge.label}</span>
                        <span style={{ fontSize: 9.5, color: "#E8E9F0", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {p.sourceTitle ?? p.company}
                        </span>
                        <span style={{ fontSize: 7, color: meta.color, letterSpacing: "0.12em", fontWeight: 800 }}>{meta.label}</span>
                      </div>
                      <div style={{ fontSize: 8, color: "#5B6480", marginBottom: 4 }}>
                        by {p.sourceAuthor ?? "unknown"} · {p.platform} · FIT {p.fitScore}/100
                        {p.postedAt && <> · posted {timeAgo(p.postedAt)}</>}
                      </div>
                      <div style={{ fontSize: 8, color: "#7B869A" }}>
                        {p.sector}{p.productName && <span style={{ color: GOLD }}> → {p.productName}</span>}
                      </div>
                      {p.sourceUrl && (
                        <a
                          href={p.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: 8, color: BLUE, textDecoration: "none", display: "inline-block", marginTop: 4 }}
                        >
                          ↗ {p.sourceUrl}
                        </a>
                      )}
                      {open && p.draftMessage && (
                        <div style={{ marginTop: 10, padding: "10px 14px", border: `1px solid ${GOLD}33`, background: "rgba(212,175,55,0.04)" }}>
                          <div style={{ fontSize: 7, color: GOLD, letterSpacing: "0.16em", marginBottom: 6, fontWeight: 700 }}>
                            {p.stage === "delivered" ? "REPLY DELIVERED VIA EMAIL" : "COMPOSED REPLY — QUEUED FOR DELIVERY"}
                          </div>
                          <div style={{ fontSize: 9.5, color: "#C8C9D0", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{p.draftMessage}</div>
                          {p.stage === "composed" && stats?.channelConnected && (
                            <div onClick={e => e.stopPropagation()} style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <input
                                type="email"
                                placeholder="recipient@company.com"
                                value={emailInputs[p.id] ?? ""}
                                onChange={e => setEmailInputs(s => ({ ...s, [p.id]: e.target.value }))}
                                style={{
                                  fontFamily: MONO, fontSize: 9, color: "#E8E9F0", background: "rgba(7,9,26,0.9)",
                                  border: "1px solid #2A3350", padding: "7px 10px", outline: "none", flex: 1, minWidth: 200,
                                }}
                              />
                              <button
                                onClick={() => void sendDraft(p.id)}
                                disabled={sendState[p.id]?.status === "sending" || sendState[p.id]?.status === "sent"}
                                style={{
                                  fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: "0.14em",
                                  color: sendState[p.id]?.status === "sent" ? GREEN : "#07091A",
                                  background: sendState[p.id]?.status === "sent" ? "transparent" : GREEN,
                                  border: `1px solid ${GREEN}`, padding: "7px 14px",
                                  cursor: sendState[p.id]?.status === "sending" ? "wait" : "pointer",
                                }}
                              >
                                {sendState[p.id]?.status === "sending" ? "SENDING…" : sendState[p.id]?.status === "sent" ? "✓ SENT" : "SEND VIA GMAIL"}
                              </button>
                              {sendState[p.id]?.status === "error" && (
                                <span style={{ fontSize: 8, color: RED }}>{sendState[p.id]?.msg}</span>
                              )}
                              <div style={{ fontSize: 7.5, color: "#5B6480", width: "100%", lineHeight: 1.6 }}>
                                Forum posts don't expose email addresses — enter one only if you've found the author's
                                real contact. Otherwise reply directly on the source thread using this draft.
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {open && !p.draftMessage && (
                        <div style={{ marginTop: 8, fontSize: 8.5, color: BLUE }}>↳ Draft composition queued — next engine cycle</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: live transmission log */}
          <div style={{ flex: 1, border: "1px solid #141A2E", background: "rgba(5,8,15,0.85)", minWidth: 0 }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #141A2E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9, color: PURPLE, letterSpacing: "0.18em", fontWeight: 700 }}>LIVE HUNT LOG</span>
              <span style={{ fontSize: 7.5, color: "#3D4560", letterSpacing: "0.1em" }}>AUTO-REFRESH 5s</span>
            </div>
            <div style={{ maxHeight: 680, overflowY: "auto" }}>
              {events.length === 0 && (
                <div style={{ padding: 24, fontSize: 9, color: "#5B6480", letterSpacing: "0.1em" }}>
                  Engine warming up — first hunt cycle lands within 60s…
                </div>
              )}
              {events.map(ev => {
                const meta = EVENT_META[ev.type] ?? { tag: ev.type.toUpperCase(), color: "#9CA3AF" };
                return (
                  <div key={ev.id} style={{ padding: "14px 20px", borderBottom: "1px solid #0D1222" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                      <span style={{
                        fontSize: 7, fontWeight: 800, letterSpacing: "0.14em", color: meta.color,
                        border: `1px solid ${meta.color}55`, padding: "2px 8px", background: `${meta.color}0D`,
                      }}>{meta.tag}</span>
                      <span style={{ fontSize: 9, color: "#C8C9D0", fontWeight: 700 }}>{ev.company}</span>
                      <span style={{ fontSize: 7.5, color: "#3D4560", marginLeft: "auto" }}>{timeAgo(ev.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 9.5, color: "#8B94A8", lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{ev.message}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
