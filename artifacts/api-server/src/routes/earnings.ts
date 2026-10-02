import { Router } from "express";
import { db } from "@workspace/db";
import { earningsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/earnings", async (req, res) => {
  try {
    const earnings = await db.select().from(earningsTable).orderBy(desc(earningsTable.createdAt));
    res.json(earnings);
  } catch (err) {
    req.log.error({ err }, "list earnings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/earnings/stats", async (req, res) => {
  try {
    const earnings = await db.select().from(earningsTable);
    const totalEarned = earnings.reduce((s, e) => s + parseFloat(e.amount), 0);
    const pending = earnings.filter((e) => e.status === "pending").reduce((s, e) => s + parseFloat(e.amount), 0);
    const paid = earnings.filter((e) => e.status === "paid").reduce((s, e) => s + parseFloat(e.amount), 0);
    res.json({ totalEarned: totalEarned.toFixed(2), pending: pending.toFixed(2), paid: paid.toFixed(2), count: earnings.length });
  } catch (err) {
    req.log.error({ err }, "earning stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
