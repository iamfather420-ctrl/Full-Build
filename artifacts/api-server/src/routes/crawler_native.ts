import { Router } from "express";
import { db } from "@workspace/db";
import { crawledProblemsTable, problemsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { fetchHN, fetchReddit, fetchStackOverflow, runCrawl } from "../lib/crawler";

const router = Router();

router.post("/crawler/run", async (req, res) => {
  const { limit = 4 } = req.body;
  const result = await runCrawl(Math.min(Number(limit), 8)).catch(err => {
    req.log.error({ err }, "crawler/run error");
    return null;
  });
  if (!result) { res.status(500).json({ error: "Crawl failed" }); return; }
  res.json(result);
});

router.get("/crawler/crawled", async (req, res) => {
  try {
    const { platform, limit = "20", offset = "0" } = req.query as Record<string, string>;
    let crawled = await db.select().from(crawledProblemsTable).orderBy(desc(crawledProblemsTable.crawledAt));
    if (platform) crawled = crawled.filter((c) => c.platform === platform);
    res.json(crawled.slice(parseInt(offset), parseInt(offset) + parseInt(limit)));
  } catch (err) {
    req.log.error({ err }, "crawled problems error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/crawler/import", async (req, res) => {
  try {
    const { crawledId, paymentOffer } = req.body;
    if (!crawledId || !paymentOffer) { res.status(400).json({ error: "crawledId and paymentOffer required" }); return; }
    const [crawled] = await db.select().from(crawledProblemsTable).where(eq(crawledProblemsTable.id, crawledId)).limit(1);
    if (!crawled) { res.status(404).json({ error: "Crawled problem not found" }); return; }
    await db.insert(problemsTable).values({ title: crawled.title, description: crawled.description, category: crawled.suggestedCategory, paymentOffer: String(paymentOffer), source: crawled.platform, sourceUrl: crawled.sourceUrl });
    await db.update(crawledProblemsTable).set({ isImported: true }).where(eq(crawledProblemsTable.id, crawledId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "import crawled error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Expose fetchers directly for diagnostics
router.get("/crawler/sources", (_req, res) => {
  res.json({
    sources: [
      "hackernews",
      "reddit/cscareerquestions",
      "stackoverflow/architecture",
    ],
    challengePlatforms: [
      "challenge-gov",
      "xprize",
      "wazoku",
      "brightidea",
      "hackerone",
      "nasa-ctl",
    ],
    autonomousMode: true,
    intervalMs: 10 * 60 * 1000,
    perSourceLimit: 8,
    challengeScanIntervalMs: 24 * 60 * 60 * 1000,
  });
});

export default router;
