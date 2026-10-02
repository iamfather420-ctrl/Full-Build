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

import { db } from "@workspace/db";
import { outreachProspects, outreachEvents, paradoxProductsTable } from "@workspace/db";
import { eq, sql, asc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
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
  const u = `https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&tagged=${encodeURIComponent(tag)}&site=${site}&pagesize=6&fromdate=${since}`;
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
        snippet: Array.isArray(i.tags) ? `Tags: ${(i.tags as string[]).join(", ")}` : "",
        postedAt: new Date(Number(i.creation_date ?? 0) * 1000),
        unanswered: i.is_answered === false,
      };
    });
}

async function composeAI(prompt: string, fallback: string): Promise<string> {
  try {
    const resp = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 2048,
        messages: [
          {
            role: "system",
            content:
              "You are dAIsy haMINJA, the autonomous sales intelligence of the SolveX institutional marketplace. You write genuinely helpful public replies to real technical posts. Lead with substance that addresses their actual question, then mention the relevant SolveX instrument once, briefly, with no hype. Max 90 words. No greetings. Output only the message body.",
          },
          { role: "user", content: prompt },
        ],
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("ai-timeout")), 25_000)),
    ]);
    const text = resp.choices[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : fallback;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "OUTREACH: AI compose fallback used");
    return fallback;
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
  const prefix = p.productId ?? "SOLVEX-ZK-";
  const prods = await db
    .select()
    .from(paradoxProductsTable)
    .where(sql`${paradoxProductsTable.id} LIKE ${prefix + "%"}`)
    .limit(30);
  const prod = prods.length > 0 ? pick(prods) : null;
  const productName = prod?.name ?? "Master Apex Bundle";
  const productId = prod?.id ?? "SOLVEX-MASTER-29";

  const draft = await composeAI(
    `Real post on ${p.platform} by ${p.sourceAuthor}:\nTitle: "${p.sourceTitle}"\n${p.snippet ? `Context: ${p.snippet}\n` : ""}\nWrite a public reply that genuinely helps with their question about ${p.sector}, then briefly notes that the SolveX marketplace carries "${productName}" for exactly this class of problem.`,
    `Re "${p.sourceTitle}": this is a solved class of problem in ${p.sector} — the key is separating the control plane from the evidence plane. The SolveX marketplace carries ${productName} engineered for exactly this; happy to point you at the capability spec. — dAIsy haMINJA, SolveX`,
  );

  await db
    .update(outreachProspects)
    .set({
      stage: "composed",
      productId,
      productName,
      listPriceEth: prod?.priceEth ?? null,
      draftMessage: draft,
      lastAction: "Reply draft composed — queued for delivery (channel required)",
      updatedAt: new Date(),
    })
    .where(eq(outreachProspects.id, p.id));

  await logEvent(
    p.id,
    p.sourceAuthor ?? p.company,
    "compose",
    `DRAFT READY → reply to "${p.sourceTitle}" (${p.platform}): "${draft}" — matched instrument: ${productName}. Status: queued — connect a delivery channel to transmit.`,
  );
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

async function tick() {
  if (running) return;
  running = true;
  try {
    // Priority 1: compose drafts for real leads awaiting one
    const [pending] = await db
      .select()
      .from(outreachProspects)
      .where(eq(outreachProspects.stage, "discovered"))
      .orderBy(asc(outreachProspects.updatedAt))
      .limit(1);

    if (pending) {
      await composeDraft(pending);
    } else {
      // Priority 2: hunt for new real leads
      await huntLeads();
    }
    await pruneOld();
  } catch (err) {
    logger.error({ err }, "OUTREACH: tick failed");
  } finally {
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
