import { Router } from "express";
import { db } from "@workspace/db";
import { escrowTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/escrow", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: "Authentication required" }); return; }
    const { problemId, amount } = req.body;
    if (!problemId || !amount) { res.status(400).json({ error: "problemId and amount required" }); return; }
    const [escrow] = await db.insert(escrowTable).values({ problemId, clientId: userId, amount: String(amount), currency: "USD", status: "pending" }).returning();
    res.status(201).json(escrow);
  } catch (err) {
    req.log.error({ err }, "create escrow error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/escrow/payment-intent", async (req, res) => {
  try {
    const { problemId, amount } = req.body;
    if (!problemId || !amount) { res.status(400).json({ error: "problemId and amount required" }); return; }
    const clientSecret = `pi_${Date.now()}_secret_${Math.random().toString(36).slice(2)}`;
    const paymentIntentId = `pi_${Date.now()}`;
    res.json({ clientSecret, paymentIntentId });
  } catch (err) {
    req.log.error({ err }, "payment intent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/escrow/problem/:problemId", async (req, res) => {
  try {
    const problemId = parseInt(req.params.problemId);
    const [escrow] = await db.select().from(escrowTable).where(eq(escrowTable.problemId, problemId)).limit(1);
    if (!escrow) { res.status(404).json({ error: "Escrow not found" }); return; }
    res.json(escrow);
  } catch (err) {
    req.log.error({ err }, "get escrow error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
