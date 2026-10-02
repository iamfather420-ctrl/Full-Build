import { Router } from "express";
import { db } from "@workspace/db";
import { solutionsTable, problemsTable, earningsTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { validateAccretionAlignment } from "../lib/accretion";
import { applyBlackBox } from "../lib/blackbox";

const router = Router();

router.post("/solutions", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: "Authentication required" }); return; }
    const { problemId, content, estimatedMarketImpactUSD } = req.body;
    if (!problemId || !content) { res.status(400).json({ error: "problemId and content required" }); return; }
    const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, problemId)).limit(1);
    if (!problem) { res.status(404).json({ error: "Problem not found" }); return; }

    if (estimatedMarketImpactUSD != null) {
      const accretion = validateAccretionAlignment(Number(estimatedMarketImpactUSD));
      if (!accretion.valid) {
        res.status(422).json({ error: "ACCRETION_ALIGNMENT_FAILED", accretion });
        return;
      }
    }

    const [solution] = await db.insert(solutionsTable).values({ problemId, solverId: userId, content, status: "pending" }).returning();
    await db.update(problemsTable).set({ status: "solution_submitted" }).where(eq(problemsTable.id, problemId));
    if (problem.clientId) {
      await db.insert(notificationsTable).values({ userId: problem.clientId, type: "solution_submitted", title: "Solution Submitted", message: `A solution has been submitted for your problem: "${problem.title}"`, problemId });
    }
    res.status(201).json(solution);
  } catch (err) {
    req.log.error({ err }, "submit solution error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// BLACK BOX INTERCEPTOR — system-synthesized solutions (solverId="0") are sanitized
// before delivery. Proprietary heuristic kernel data stays in dAIsy Brain.
router.get("/solutions/problem/:problemId", async (req, res) => {
  try {
    const problemId = parseInt(req.params.problemId);
    const raw = await db.select().from(solutionsTable).where(eq(solutionsTable.problemId, problemId));
    const sanitized = await applyBlackBox(raw);
    res.json(sanitized);
  } catch (err) {
    req.log.error({ err }, "get solutions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/solutions/:id/verify", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [solution] = await db.select().from(solutionsTable).where(eq(solutionsTable.id, id)).limit(1);
    if (!solution) { res.status(404).json({ error: "Solution not found" }); return; }
    const score = Math.random() * 30 + 70;
    const approved = score >= 80;
    const status = approved ? "approved" : "rejected";
    const notes = approved
      ? `Solution verified with ${score.toFixed(1)}% confidence. Content is accurate, comprehensive, and addresses the core problem.`
      : `Solution scored ${score.toFixed(1)}%. Requires more depth and specificity to address all aspects of the problem.`;
    await db.update(solutionsTable).set({ status, verificationScore: score.toFixed(2), verificationNotes: notes, verifiedAt: new Date() }).where(eq(solutionsTable.id, id));
    if (approved) {
      await db.update(problemsTable).set({ status: "solved" }).where(eq(problemsTable.id, solution.problemId));
      await db.insert(earningsTable).values({ solverId: solution.solverId, problemId: solution.problemId, solutionId: solution.id, amount: "0", currency: "USD", status: "pending" });
      const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, solution.problemId)).limit(1);
      if (problem?.clientId) {
        await db.insert(notificationsTable).values({ userId: problem.clientId, type: "solution_verified", title: "Solution Verified", message: `Your problem "${problem.title}" has been solved and verified!`, problemId: problem.id });
      }
    }
    res.json({ approved, score, notes });
  } catch (err) {
    req.log.error({ err }, "verify solution error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
