/**
 * SOLVEX-CORE: AUTONOMOUS OUTREACH ENGINE — REAL LEAD HUNTING
 *
 * dAIsy haMINJA hunts REAL prospects: actual posts by real people on
 * Hacker News (Algolia API) and Stack Exchange (public API) who are actively
 * asking about problems the SolveX catalog solves (ZK/privacy, key management,
 * HFT latency, IAM, AI governance).
 *
 * Pipeline per lead:
 *   discovered  — real post found, deduped by URL, fit-scored
 *   composed    — gpt-5.4 wrote a tailored public reply / contact draft
 *   delivered   — draft actually sent (requires a connected delivery channel:
 *                 email service or platform account credentials). Until a
 *                 channel is connected, drafts stay queued — the engine never
 *                 fakes a send, a reply, or revenue.
 *
 * All activity is persisted to outreach_prospects / outreach_events and
 * exposed via /api/outreach/* for the live Outreach Ops console.
 */

import { randomUUID } from "node:crypto";
import { db, outreachProspects, outreachEvents } from "@workspace/db";
import { eq, sql, asc } from "drizzle-orm";
import { logger } from "./logger";

const TICK_MS = 40_000; // one autonomous action every 40s
const HUNT_COOLDOWN_MS = 5 * 60_000; // min gap between hunts per source (API quota respect)
const MAX_LEADS_PER_HUNT = 2;
const LOOKBACK_DAYS = 120; // only posts fresh enough to still be "actively searching"

interface Hunt {
  category: string;
  sectorLabel: string;
  productPrefix: string;
  queries: string[]; // Hacker News full-text queries
  seSite: string; // Stack Exchange site
  seTags: string[]; // Stack Exchange tags (one picked per hunt)
}

const HUNTS: Hunt[] = [
  {
    category: "zk",
    sectorLabel: "ZK Privacy / Confidential Compliance",
    productPrefix: "SOLVEX-ZK-",
    queries: ["zero knowledge", "homomorphic encryption", "MPC custody", "confidential computing"],
    seSite: "crypto",
    seTags: ["zero-knowledge-proofs", "homomorphic-encryption", "secure-multiparty-computation", "protocol-design"],
  },
  {
    category: "sec",
    sectorLabel: "Key Management / Cryptographic Security",
    productPrefix: "SOLVEX-SEC-",
    queries: ["key management", "HSM", "post quantum cryptography", "secrets management"],
    seSite: "security",
    seTags: ["key-management", "hsm", "encryption", "cryptography"],
  },
  {
    category: "hft",
    sectorLabel: "Low-Latency Trading Infrastructure",
    productPrefix: "SOLVEX-HFT-",
    queries: ["low latency trading", "market data feed", "order execution", "exchange infrastructure"],
    seSite: "quant",
    seTags: ["high-frequency-trading", "market-microstructure", "order-execution", "market-data"],
  },
  {
    category: "iam",
    sectorLabel: "Identity & Access Management",
    productPrefix: "SOLVEX-IAM-",
    queries: ["zero trust", "passwordless authentication", "identity management", "SSO enterprise"],
    seSite: "security",
    seTags: ["authentication", "access-control", "single-sign-on", "passwords"],
  },
  {
    category: "gov",
    sectorLabel: "AI Governance / Model Compliance",
    productPrefix: "SOLVEX-GOV-",
    queries: ["AI governance", "LLM security", "AI compliance", "model risk"],
    seSite: "ai",
    seTags: ["machine-learning", "large-language-models", "ai-safety", "neural-networks"],
  },
];

interface RawLead {
  platform: string;
  url: string;
  title: string;
  author: string;
  snippet: string;
  postedAt: Date;
  unanswered: boolean;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
}

function fitScore(lead: RawLead, terms: string[], tagged: boolean): number {
  let score = 50;
  const ageDays = (Date.now() - lead.postedAt.getTime()) / 86_400_000;
  score += Math.max(0, Math.round(20 * (1 - ageDays / LOOKBACK_DAYS)));
  if (lead.unanswered) score += 10;
  if (tagged) score += 10; // tag-matched results are inherently on-topic
  const text = `${lead.title} ${lead.snippet}`.toLowerCase();
  const hits = terms
    .flatMap(t => t.toLowerCase().split(/[\s-]+/))
    .filter(w => w.length > 2 && text.includes(w)).length;
  score += Math.min(15, hits * 5);
  return Math.min(99, score);
}

async function fetchJson(url: string): Promise<unknown> {
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(12_000),
    headers: { "User-Agent": "solvex-market-research/1.0", Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${new URL(url).hostname}`);
  return resp.json();
}

async function huntHackerNews(query: string): Promise<RawLead[]> {
  const since = Math.floor((Date.now() - LOOKBACK_DAYS * 86_400_000) / 1000);
  const u = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=(story,ask_hn)&numericFilters=created_at_i>${since}&hitsPerPage=6`;
  const data = (await fetchJson(u)) as { hits?: Array<Record<string, unknown>> };
  return (data.hits ?? [])
    .filter(h => typeof h.title === "string" && h.objectID)
    .map(h => ({
      platform: "Hacker News",
      url: `https://news.ycombinator.com/item?id=${String(h.objectID)}`,
      title: String(h.title),
      author: String(h.author ?? "unknown"),
      snippet: stripHtml(String(h.story_text ?? "")).slice(0, 400),
      postedAt: new Date(Number(h.created_at_i ?? 0) * 1000),
      unanswered: Number(h.num_comments ?? 0) === 0,
    }));
}

async function huntStackExchange(tag: string, site: string): Promise<RawLead[]> {
  const since = Math.floor((Date.now() - LOOKBACK_DAYS * 86_400_000) / 1000);
  const u = `https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&tagged=${encodeURIComponent(tag)}&site=${site}&pagesize=6&fromdate=${since}&filter=withbody`;
  const data = (await fetchJson(u)) as { items?: Array<Record<string, unknown>> };
  return (data.items ?? [])
    .filter(i => typeof i.link === "string" && typeof i.title === "string")
    .map(i => {
      const owner = (i.owner ?? {}) as Record<string, unknown>;
      return {
        platform: `Stack Exchange (${site})`,
        url: String(i.link),
        title: stripHtml(String(i.title)),
        author: String(owner.display_name ?? "unknown"),
        snippet: stripHtml(String(i.body ?? "")).slice(0, 1800) || (Array.isArray(i.tags) ? `Tags: ${(i.tags as string[]).join(", ")}` : ""),
        postedAt: new Date(Number(i.creation_date ?? 0) * 1000),
        unanswered: i.is_answered === false,
      };
    });
}

async function composeAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const model = process.env.OUTREACH_AI_MODEL ?? "gpt-4o-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_completion_tokens: 350,
        store: false,
        messages: [
          {
            role: "system",
            content: [
              "You are dAIsy haMINJA, a careful technical community outreach writer for SolveX.",
              "Write a useful, specific public reply to the supplied post. Address the author's actual question or problem before mentioning SolveX.",
              "Use only facts supported by the supplied post and generally established technical knowledge. Never claim SolveX has solved, deployed, certified, benchmarked, or guarantees something unless the supplied context explicitly proves it.",
              "If the post lacks enough detail for a substantive answer, ask one relevant clarifying question instead of inventing an answer.",
              "Mention SolveX at most once, briefly and accurately; do not use hype, fake familiarity, or pressure.",
              "Maximum 90 words. No greeting, no fabricated capability spec, no generic control-plane/evidence-plane slogan. Output only the reply body."
            ].join(" ")
          },
          { role: "user", content: prompt }
        ]
      })
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      let detail = body.slice(0, 500);
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string; code?: string } };
        detail = parsed.error?.message ?? parsed.error?.code ?? detail;
      } catch {}
      throw new Error(`OpenAI HTTP ${response.status}: ${detail || "request rejected"}`);
    }
    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
      error?: { message?: string };
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 20) throw new Error("OpenAI returned an empty or unusably short draft");
    if (/this is a solved class of problem|separating the control plane from the evidence plane/i.test(text)) {
      throw new Error("Generated draft failed the anti-boilerplate quality check");
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function validateDraft(draft: string, p: typeof outreachProspects.$inferSelect): void {
  const words = draft.trim().split(/\s+/).filter(Boolean);
  if (words.length < 8 || words.length > 100) {
    throw new Error(`Draft quality check failed: expected 8–100 words, received ${words.length}`);
  }
  if (/\b(this is a solved class of problem|happy to point you at|capability spec|engineered for this class|unlock the power|cutting[- ]edge|revolutionary|world[- ]class|game[- ]changing|seamlessly transform)\b/i.test(draft)) {
    throw new Error("Draft quality check failed: generic promotional or boilerplate language");
  }
  if (/\bSolveX\s+(?:has|have|is|was|provides|offers|delivers|guarantees|certifies|certified|proves|proven|deployed|built|solved|eliminates|prevents|ensures|supports|can)\b/i.test(draft)) {
    throw new Error("Draft quality check failed: unsupported capability claim about SolveX");
  }
  const solvexMentions = (draft.match(/\bSolveX\b/gi) ?? []).length;
  if (solvexMentions > 1) {
    throw new Error("Draft quality check failed: repeated brand promotion");
  }
  const context = `${p.sourceTitle ?? ""} ${p.snippet ?? ""}`.toLowerCase();
  const stop = new Set(["about", "after", "again", "against", "being", "could", "does", "from", "have", "into", "more", "other", "should", "their", "there", "these", "they", "this", "those", "through", "under", "using", "what", "when", "where", "which", "while", "with", "would", "your", "question", "problem"]);
  const keywords = [...new Set((context.match(/[a-z0-9-]{4,}/g) ?? []).filter(w => !stop.has(w)))];
  const lowerDraft = draft.toLowerCase();
  const relevantHits = keywords.filter(w => lowerDraft.includes(w)).length;
  const requiredHits = keywords.length >= 2 ? 2 : 1;
  if (keywords.length > 0 && relevantHits < requiredHits) {
    throw new Error("Draft quality check failed: reply does not sufficiently reference the source post");
  }
}

async function logEvent(prospectId: number, company: string, type: string, message: string) {
  await db.insert(outreachEvents).values({ prospectId, company, type, message });
}

const lastHuntAt: Record<string, number> = {};

async function huntLeads(): Promise<number> {
  const hunt = pick(HUNTS);
  const source = Math.random() < 0.5 ? "hn" : "se";
  const query = source === "hn" ? pick(hunt.queries) : pick(hunt.seTags);
  const now = Date.now();
  if (now - (lastHuntAt[source] ?? 0) < HUNT_COOLDOWN_MS) return 0;
  lastHuntAt[source] = now;

  let leads: RawLead[] = [];
  try {
    leads = source === "hn" ? await huntHackerNews(query) : await huntStackExchange(query, hunt.seSite);
  } catch (err) {
    logger.warn({ err: (err as Error).message, source, query }, "OUTREACH: hunt failed");
    return 0;
  }

  let inserted = 0;
  for (const lead of leads) {
    if (inserted >= MAX_LEADS_PER_HUNT) break;

    const score = fitScore(lead, [query, hunt.sectorLabel], source === "se");
    if (score < 55) continue;

    const rows = await db
      .insert(outreachProspects)
      .values({
        company: lead.author,
        sector: hunt.sectorLabel,
        region: lead.platform,
        contactRole: "Post author",
        stage: "discovered",
        platform: lead.platform,
        sourceUrl: lead.url,
        sourceTitle: lead.title,
        sourceAuthor: lead.author,
        snippet: lead.snippet,
        postedAt: lead.postedAt,
        unanswered: lead.unanswered,
        fitScore: score,
        productId: hunt.productPrefix, // category prefix; resolved to a product at compose time
        lastAction: `Real lead found via search: "${query}"`,
      })
      .onConflictDoNothing({ target: outreachProspects.sourceUrl })
      .returning();
    if (rows.length === 0) continue; // already known lead (deduped by unique source_url)
    const p = rows[0];
    inserted++;

    await logEvent(
      p.id,
      lead.author,
      "lead",
      `REAL LEAD [${lead.platform}] "${lead.title}" by ${lead.author} — posted ${lead.postedAt.toISOString().slice(0, 10)}, fit ${score}/100${lead.unanswered ? ", still unanswered" : ""}. Source: ${lead.url}`,
    );
  }

  if (inserted === 0) {
    await logEvent(0, "MARKET SCAN", "scan", `Hunt cycle [${source === "hn" ? "Hacker News" : `Stack Exchange (${hunt.seSite})`}] ${source === "hn" ? "query" : "tag"} "${query}" — no new qualifying leads this pass (dedupe + fit threshold 55).`);
  }
  return inserted;
}

async function composeDraft(p: typeof outreachProspects.$inferSelect) {
  const productName = "SolveX institutional solution";
  const productId = p.productId ?? "SOLVEX-MASTER";
  const prompt = [
    `Platform: ${p.platform}`,
    `Author: ${p.sourceAuthor ?? "unknown"}`,
    `Sector matched by discovery: ${p.sector}`,
    `Post title: "${p.sourceTitle ?? "Untitled"}"`,
    p.snippet ? `Post body/context: ${p.snippet}` : "Post body/context: not available; do not infer details beyond the title.",
    `Source URL: ${p.sourceUrl ?? "not available"}`,
    "",
    "Write a reply that is useful to this author, not a generic sales pitch."
  ].join("\n");
  const draft = await composeAI(prompt);
  validateDraft(draft, p);
  await db.update(outreachProspects).set({
    stage: "composed", productId, productName, draftMessage: draft,
    lastAction: "AI-generated reply draft composed — queued for human review; not sent",
    updatedAt: new Date(),
  }).where(eq(outreachProspects.id, p.id));
  await logEvent(p.id, p.sourceAuthor ?? p.company, "compose",
    `AI DRAFT READY [${process.env.OUTREACH_AI_MODEL ?? "gpt-4o-mini"}] → reply to "${p.sourceTitle}" (${p.platform}): "${draft}" — matched instrument: ${productName}. Status: queued for review; not sent.`);
}

const EVENT_RETENTION_DAYS = 30;
const MAX_EVENTS = 1000;
let lastPruneAt = 0;

async function pruneOld() {
  const now = Date.now();
  if (now - lastPruneAt < 6 * 3600_000) return; // prune at most every 6h
  lastPruneAt = now;
  await db.execute(sql`DELETE FROM outreach_events WHERE created_at < now() - interval '${sql.raw(String(EVENT_RETENTION_DAYS))} days'`);
  await db.execute(sql`DELETE FROM outreach_events WHERE id NOT IN (SELECT id FROM outreach_events ORDER BY id DESC LIMIT ${sql.raw(String(MAX_EVENTS))})`);
  await db.execute(sql`DELETE FROM outreach_prospects WHERE stage = 'discovered' AND created_at < now() - interval '${sql.raw(String(EVENT_RETENTION_DAYS * 3))} days'`);
}

let running = false;
const composeRetryAfter = new Map<number, number>();

// Neon HTTP is stateless between requests, so use an atomic lease row in the
// existing events table rather than a session-scoped advisory lock. ID -1 is
// reserved exclusively for this lock and filtered out of the public events API.
const WORKER_LOCK_ID = -1;
const WORKER_LOCK_TTL_SECONDS = 120;

async function acquireWorkerLease(token: string): Promise<boolean> {
  const result = await db.execute(sql`
    INSERT INTO outreach_events (id, prospect_id, company, type, message, created_at)
    VALUES (${WORKER_LOCK_ID}, 0, 'SOLVEX_WORKER', 'worker_lock', ${token}, now())
    ON CONFLICT (id) DO UPDATE
      SET message = EXCLUDED.message, created_at = now()
      WHERE outreach_events.created_at < now() - interval '120 seconds'
    RETURNING id
  `);
  return result.rows.length > 0;
}

async function releaseWorkerLease(token: string): Promise<void> {
  await db.execute(sql`
    DELETE FROM outreach_events
    WHERE id = ${WORKER_LOCK_ID}
      AND company = 'SOLVEX_WORKER'
      AND type = 'worker_lock'
      AND message = ${token}
  `);
}

async function tick() {
  if (running) return;
  running = true;
  const leaseToken = randomUUID();
  let leaseAcquired = false;
  try {
    leaseAcquired = await acquireWorkerLease(leaseToken);
    if (!leaseAcquired) {
      logger.info({ hostname: process.env.FLY_MACHINE_ID ?? process.env.HOSTNAME ?? "unknown" }, "OUTREACH: another Fly machine owns the worker lease; skipping this cycle");
      return;
    }
    logger.info({ hostname: process.env.FLY_MACHINE_ID ?? process.env.HOSTNAME ?? "unknown" }, "OUTREACH: worker lease acquired; this machine owns the current cycle");
    const aiConfigured = Boolean(process.env.OPENAI_API_KEY);
    if (!aiConfigured) {
      // Continue discovering prospects, but never disguise a canned fallback as AI output.
      await huntLeads();
    } else {
      const pendingRows = await db
        .select()
        .from(outreachProspects)
        .where(eq(outreachProspects.stage, "discovered"))
        .orderBy(asc(outreachProspects.updatedAt))
        .limit(25);
      const now = Date.now();
      const pending = pendingRows.find(p => (composeRetryAfter.get(p.id) ?? 0) <= now);
      if (pending) {
        try {
          await composeDraft(pending);
          composeRetryAfter.delete(pending.id);
        } catch (err) {
          composeRetryAfter.set(pending.id, now + 5 * 60_000);
          const message = (err as Error).message;
          logger.error({ prospectId: pending.id, error: message }, "OUTREACH: AI composition or quality check failed; prospect remains undispatched");
          await logEvent(pending.id, pending.sourceAuthor ?? pending.company, "compose_error",
            `AI composition/quality check failed; no draft was approved or sent. Retry in 5 minutes. Reason: ${message.slice(0, 350)}`);
        }
      } else if (pendingRows.length === 0) {
        await huntLeads();
      }
    }
    await pruneOld();
  } catch (err) {
    logger.error({ err }, "OUTREACH: tick failed");
  } finally {
    if (leaseAcquired) {
      try {
        await releaseWorkerLease(leaseToken);
      } catch (err) {
        logger.error({ err, leaseToken }, "OUTREACH: worker lease release failed; lease expires automatically");
      }
    }
    running = false;
  }
}

let started = false;

export function startOutreachEngine() {
  if (started) return;
  started = true;
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), TICK_MS);
  }, 8_000);
  logger.info({ tickMs: TICK_MS, lookbackDays: LOOKBACK_DAYS }, "AUTONOMOUS OUTREACH ENGINE: armed — hunting real leads on HN + Stack Exchange");
}
