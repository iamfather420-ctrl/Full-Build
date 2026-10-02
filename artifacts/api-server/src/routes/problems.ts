import { Router } from "express";
import { db } from "@workspace/db";
import { problemsTable, solutionsTable, escrowTable } from "@workspace/db";
import { eq, desc, ilike, sql } from "drizzle-orm";

const router = Router();

router.get("/problems", async (req, res) => {
  try {
    const { category, status, search, limit = "20", offset = "0" } = req.query as Record<string, string>;
    let problems = await db.select().from(problemsTable).orderBy(desc(problemsTable.createdAt));
    if (category) problems = problems.filter((p) => p.category === category);
    if (status) problems = problems.filter((p) => p.status === status);
    if (search) problems = problems.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
    res.json(problems.slice(parseInt(offset), parseInt(offset) + parseInt(limit)));
  } catch (err) {
    req.log.error({ err }, "list problems error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/problems/stats", async (req, res) => {
  try {
    const problems = await db.select().from(problemsTable);
    const total = problems.length;
    const open = problems.filter((p) => p.status === "open").length;
    const solved = problems.filter((p) => p.status === "solved").length;
    const inProgress = problems.filter((p) => p.status === "in_review" || p.status === "solution_submitted" || p.status === "verifying").length;
    const totalValue = problems.reduce((sum, p) => sum + parseFloat(p.paymentOffer), 0);
    const byCategory = problems.reduce((acc: Record<string, number>, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {});
    res.json({ total, open, solved, inProgress, totalValue: totalValue.toFixed(2), byCategory });
  } catch (err) {
    req.log.error({ err }, "problem stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/problems/mine", async (req, res) => {
  try {
    const userId = req.user?.id ?? null;
    if (!userId) { res.json([]); return; }
    const problems = await db.select().from(problemsTable).where(eq(problemsTable.clientId, userId)).orderBy(desc(problemsTable.createdAt));
    res.json(problems);
  } catch (err) {
    req.log.error({ err }, "my problems error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/problems/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, id)).limit(1);
    if (!problem) { res.status(404).json({ error: "Problem not found" }); return; }
    await db.update(problemsTable).set({ viewCount: problem.viewCount + 1 }).where(eq(problemsTable.id, id));
    const solutions = await db.select().from(solutionsTable).where(eq(solutionsTable.problemId, id));
    const [escrow] = await db.select().from(escrowTable).where(eq(escrowTable.problemId, id)).limit(1);
    res.json({ problem: { ...problem, viewCount: problem.viewCount + 1 }, solutions, escrow: escrow ?? null });
  } catch (err) {
    req.log.error({ err }, "get problem error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/problems", async (req, res) => {
  try {
    const userId = req.user?.id ?? null;
    const { title, description, category, paymentOffer, deadline, tags } = req.body;
    if (!title || !description || !category || !paymentOffer) {
      res.status(400).json({ error: "title, description, category, paymentOffer required" });
      return;
    }
    const [problem] = await db.insert(problemsTable).values({
      title,
      description,
      category,
      paymentOffer: String(paymentOffer),
      clientId: userId,
      deadline: deadline ?? null,
      tags: tags ? JSON.stringify(tags) : null,
      source: "manual",
    }).returning();
    res.status(201).json(problem);
  } catch (err) {
    req.log.error({ err }, "create problem error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/problems/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!status) { res.status(400).json({ error: "status required" }); return; }
    await db.update(problemsTable).set({ status }).where(eq(problemsTable.id, id));
    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    req.log.error({ err }, "update problem status error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
