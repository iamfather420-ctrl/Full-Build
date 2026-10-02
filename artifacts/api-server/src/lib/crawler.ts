/**
 * SOLVEX-CORE: AUTONOMOUS PARADOX CRAWLER
 * Continuously ingests unsolved problems from HN / Reddit / StackOverflow.
 * New problems are written directly into problemsTable so the Kinetic Resolver
 * can act on them immediately when entropy rises above 0.85.
 *
 * Cycle: every 10 minutes (600,000ms)
 * Per cycle: up to 8 problems per source (24 max)
 * Dedup: externalId checked before insert — idempotent
 */

import { db } from "@workspace/db";
import { crawledProblemsTable, problemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const CRAWL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const PER_SOURCE_LIMIT = 8;

// ── Fetchers ───────────────────────────────────────────────────────────────────
export async function fetchHN(limit: number) {
  const res = await fetch("https://hacker-news.firebaseio.com/v0/askstories.json");
  const ids = (await res.json()) as number[];
  const top = ids.slice(0, limit * 3);
  const items = await Promise.all(
    top.map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json()))
  );
  return items
    .filter((i: any) => i && i.title && i.score > 5 && !i.deleted)
    .slice(0, limit)
    .map((i: any) => ({
      externalId: `hn-${i.id}`,
      platform: "hackernews",
      title: i.title,
      description: i.text?.replace(/<[^>]+>/g, "").slice(0, 800) || `Ask HN: ${i.title}`,
      sourceUrl: i.url || `https://news.ycombinator.com/item?id=${i.id}`,
      suggestedCategory: "technical",
      suggestedPayment: String(Math.max(500, Math.min(i.score * 10, 5000))),
      aiSummary: `HN Ask thread with ${i.score} points and ${i.descendants || 0} comments. Community-validated unsolved problem.`,
      upvotes: i.score,
    }));
}

export async function fetchReddit(subreddit: string, limit: number) {
  const res = await fetch(
    `https://www.reddit.com/r/${subreddit}/top.json?limit=${limit}&t=week`,
    { headers: { "User-Agent": "SolveX-Crawler/1.0" } }
  );
  const json: any = await res.json();
  return (json?.data?.children || [])
    .map((c: any) => c.data)
    .filter((p: any) => p.selftext && p.selftext.length > 50 && !p.is_video)
    .slice(0, limit)
    .map((p: any) => ({
      externalId: `reddit-${p.id}`,
      platform: "reddit",
      title: p.title,
      description: p.selftext.slice(0, 800),
      sourceUrl: `https://reddit.com${p.permalink}`,
      suggestedCategory: subreddit.includes("finance") || subreddit.includes("invest") ? "financial" : "technical",
      suggestedPayment: String(Math.max(300, Math.min(p.score * 5, 3000))),
      aiSummary: `r/${subreddit} post with ${p.score} upvotes and ${p.num_comments} comments. Active community problem.`,
      upvotes: p.score,
    }));
}

export async function fetchStackOverflow(limit: number) {
  const res = await fetch(
    `https://api.stackexchange.com/2.3/questions?order=desc&sort=votes&tagged=architecture&site=stackoverflow&pagesize=${limit}&filter=withbody`,
  );
  const json: any = await res.json();
  return (json?.items || [])
    .filter((q: any) => !q.is_answered && q.score > 2)
    .slice(0, limit)
    .map((q: any) => ({
      externalId: `so-${q.question_id}`,
      platform: "stackoverflow",
      title: q.title,
      description: q.body?.replace(/<[^>]+>/g, "").slice(0, 800) || q.title,
      sourceUrl: q.link,
      suggestedCategory: "technical",
      suggestedPayment: String(Math.max(400, Math.min(q.score * 15, 4000))),
      aiSummary: `Unanswered SO question with ${q.score} votes and ${q.view_count} views. High-value unsolved technical problem.`,
      upvotes: q.score,
    }));
}

// ── Core crawl + auto-import ───────────────────────────────────────────────────
export interface CrawlResult {
  crawled: number;
  imported: number;
  skipped: number;
  errors: string[];
}

export async function runCrawl(limitPerSource = PER_SOURCE_LIMIT): Promise<CrawlResult> {
  const errors: string[] = [];
  const n = Math.min(limitPerSource, 10);

  const [hn, reddit, so] = await Promise.all([
    fetchHN(n).catch(e => { errors.push(`HN: ${e.message}`); return [] as any[]; }),
    fetchReddit("cscareerquestions", n).catch(e => { errors.push(`Reddit: ${e.message}`); return [] as any[]; }),
    fetchStackOverflow(n).catch(e => { errors.push(`SO: ${e.message}`); return [] as any[]; }),
  ]);

  const all = [...hn, ...reddit, ...so];
  let crawled = 0;
  let imported = 0;
  let skipped = 0;

  for (const item of all) {
    try {
      // Dedup check against crawledProblemsTable
      const existing = await db
        .select()
        .from(crawledProblemsTable)
        .where(eq(crawledProblemsTable.externalId, item.externalId))
        .limit(1);

      if (existing.length > 0) { skipped++; continue; }

      // Write to crawled staging table
      const [crawledRow] = await db.insert(crawledProblemsTable).values(item).returning();
      crawled++;

      // Auto-import directly into problemsTable so Kinetic Resolver can act on it
      await db.insert(problemsTable).values({
        title: crawledRow.title,
        description: crawledRow.description,
        category: crawledRow.suggestedCategory,
        paymentOffer: crawledRow.suggestedPayment ?? "500",
        source: crawledRow.platform,
        sourceUrl: crawledRow.sourceUrl,
      });
      await db.update(crawledProblemsTable).set({ isImported: true }).where(eq(crawledProblemsTable.id, crawledRow.id));
      imported++;
    } catch {
      skipped++;
    }
  }

  return { crawled, imported, skipped, errors };
}

// ── Autonomous scheduled loop ──────────────────────────────────────────────────
export function startAutonomousCrawler(): void {
  // Fire immediately on boot, then every 10 minutes
  const tick = async () => {
    try {
      const result = await runCrawl();
      logger.info(
        result,
        `AUTONOMOUS_CRAWLER: cycle complete — ${result.imported} new paradoxes imported into problem pool`,
      );
    } catch (err) {
      logger.error({ err }, "AUTONOMOUS_CRAWLER: cycle error");
    }
  };

  // First crawl 5s after boot (let DB settle)
  setTimeout(tick, 5_000);

  // Subsequent crawls every 10 minutes
  setInterval(tick, CRAWL_INTERVAL_MS);

  logger.info(
    { intervalMs: CRAWL_INTERVAL_MS, perSource: PER_SOURCE_LIMIT },
    "AUTONOMOUS_CRAWLER: started — HN + Reddit + StackOverflow",
  );
}
