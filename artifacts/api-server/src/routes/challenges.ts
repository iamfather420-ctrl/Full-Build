import { Router } from "express";
import { db, challengeHubTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import {
  CHALLENGE_PLATFORMS,
  scanPlatform,
  scanAllPlatforms,
  runFeasibilityGate,
  generateComplianceDisclosure,
} from "../lib/challenge-hub";

const router = Router();

/**
 * GET /api/challenges
 * List all challenges from the challenge_hub table.
 */
router.get("/challenges", async (req, res) => {
  try {
    const { platform, status, limit = "50" } = req.query as Record<string, string>;
    let query = db.select().from(challengeHubTable).orderBy(desc(challengeHubTable.feasibilityScore));
    const rows = await query;
    let filtered = rows;
    if (platform) filtered = filtered.filter(r => r.platformId === platform);
    if (status) filtered = filtered.filter(r => r.submissionStatus === status);
    res.json(filtered.slice(0, parseInt(limit)));
  } catch (err: any) {
    req.log.error({ err }, "challenges list error");
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/challenges/platforms
 * List all monitored platforms with live stats.
 */
router.get("/challenges/platforms", async (req, res) => {
  try {
    const counts = await db
      .select({ platformId: challengeHubTable.platformId, count: count() })
      .from(challengeHubTable)
      .groupBy(challengeHubTable.platformId);

    const countMap: Record<string, number> = {};
    for (const row of counts) countMap[row.platformId] = Number(row.count);

    const platforms = CHALLENGE_PLATFORMS.map(p => ({
      ...p,
      challengeCount: countMap[p.id] ?? 0,
      lastScan: new Date().toISOString(),
      status: "MONITORING_ACTIVE",
    }));

    res.json(platforms);
  } catch (err: any) {
    req.log.error({ err }, "challenges/platforms error");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/challenges/scan
 * Trigger a platform scan — one or all platforms.
 */
router.post("/challenges/scan", async (req, res) => {
  const { platformId } = req.body as { platformId?: string };
  try {
    if (platformId) {
      const result = await scanPlatform(platformId);
      res.json(result);
    } else {
      const results = await scanAllPlatforms();
      res.json(results);
    }
  } catch (err: any) {
    req.log.error({ err }, "challenges/scan error");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/challenges/feasibility
 * Run the feasibility gate against a challenge (ad-hoc or from DB).
 */
router.post("/challenges/feasibility", async (req, res) => {
  const { challengeId, title, description, requirements, category } = req.body as {
    challengeId?: string;
    title?: string;
    description?: string;
    requirements?: string;
    category?: string;
  };

  try {
    let t = title ?? "", d = description ?? "", r = requirements ?? "", c = category ?? "regulatory";

    if (challengeId) {
      const [row] = await db.select().from(challengeHubTable)
        .where(eq(challengeHubTable.id, challengeId)).limit(1);
      if (!row) { res.status(404).json({ error: "Challenge not found" }); return; }
      t = row.title; d = row.description ?? ""; r = row.requirements ?? ""; c = row.category ?? "regulatory";
    }

    const result = await runFeasibilityGate(t, d, r, c);

    if (challengeId) {
      await db.update(challengeHubTable)
        .set({
          feasibilityScore: result.score,
          paradoxMatches: result.paradoxMatches,
          complianceFlags: result.complianceFlags,
          submissionStatus: result.score >= 80 ? "FEASIBLE" : "ANALYZING",
        })
        .where(eq(challengeHubTable.id, challengeId));
    }

    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "challenges/feasibility error");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/challenges/compliance-disclosure
 * Generate an automated compliance disclosure document.
 */
router.post("/challenges/compliance-disclosure", async (req, res) => {
  const { challengeId, platformName, challengeTitle, requirements, category } = req.body as {
    challengeId?: string;
    platformName?: string;
    challengeTitle?: string;
    requirements?: string;
    category?: string;
  };

  try {
    let pn = platformName ?? "Innovation Platform";
    let ct = challengeTitle ?? "Open Challenge";
    let r = requirements ?? "";
    let c = category ?? "regulatory";

    if (challengeId) {
      const [row] = await db.select().from(challengeHubTable)
        .where(eq(challengeHubTable.id, challengeId)).limit(1);
      if (row) { pn = row.platformName; ct = row.title; r = row.requirements ?? ""; c = row.category ?? "regulatory"; }
    }

    const feasibility = await runFeasibilityGate(ct, r, r, c);
    const disclosure = generateComplianceDisclosure(pn, ct, r, feasibility);
    res.json(disclosure);
  } catch (err: any) {
    req.log.error({ err }, "challenges/compliance-disclosure error");
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/challenges/:id/status
 * Update submission status for a challenge.
 */
router.patch("/challenges/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  try {
    await db.update(challengeHubTable)
      .set({ submissionStatus: status })
      .where(eq(challengeHubTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "challenges/status update error");
    res.status(500).json({ error: err.message });
  }
});

export default router;
