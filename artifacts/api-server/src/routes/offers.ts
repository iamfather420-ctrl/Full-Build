import { Router } from "express";
import { db } from "@workspace/db";
import { offersTable, notificationsTable, problemsTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";

const router = Router();

router.post("/offers", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: "Authentication required" }); return; }
    const { problemId, amount, message, expiresAt } = req.body;
    if (!problemId || !amount) { res.status(400).json({ error: "problemId and amount required" }); return; }
    const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, problemId)).limit(1);
    if (!problem) { res.status(404).json({ error: "Problem not found" }); return; }
    const toUserId = problem.clientId ?? userId;
    const [offer] = await db.insert(offersTable).values({ problemId, fromUserId: userId, toUserId, amount: String(amount), message: message ?? null, expiresAt: expiresAt ? new Date(expiresAt) : null }).returning();
    if (problem.clientId) {
      await db.insert(notificationsTable).values({ userId: problem.clientId, type: "new_offer", title: "New Offer Received", message: `A solver made an offer of $${amount} for: ${problem.title}`, problemId });
    }
    res.status(201).json(offer);
  } catch (err) {
    req.log.error({ err }, "create offer error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/offers/mine", async (req, res) => {
  try {
    const userId = req.user?.id ?? null;
    if (!userId) { res.json([]); return; }
    const { type = "received" } = req.query as { type?: string };
    let offers;
    if (type === "sent") {
      offers = await db.select().from(offersTable).where(eq(offersTable.fromUserId, userId)).orderBy(desc(offersTable.createdAt));
    } else {
      offers = await db.select().from(offersTable).where(eq(offersTable.toUserId, userId)).orderBy(desc(offersTable.createdAt));
    }
    res.json(offers);
  } catch (err) {
    req.log.error({ err }, "my offers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/offers/problem/:problemId", async (req, res) => {
  try {
    const problemId = parseInt(req.params.problemId);
    const offers = await db.select().from(offersTable).where(eq(offersTable.problemId, problemId)).orderBy(desc(offersTable.createdAt));
    res.json(offers);
  } catch (err) {
    req.log.error({ err }, "offers by problem error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/offers/:id/counter", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: "Authentication required" }); return; }
    const id = parseInt(req.params.id);
    const { amount, message } = req.body;
    const [original] = await db.select().from(offersTable).where(eq(offersTable.id, id)).limit(1);
    if (!original) { res.status(404).json({ error: "Offer not found" }); return; }
    await db.update(offersTable).set({ status: "countered" }).where(eq(offersTable.id, id));
    const [counter] = await db.insert(offersTable).values({ problemId: original.problemId, fromUserId: userId, toUserId: original.fromUserId, amount: String(amount), message: message ?? null, counterOfferId: id }).returning();
    await db.insert(notificationsTable).values({ userId: original.fromUserId, type: "counter_offer", title: "Counter-Offer Received", message: `A counter-offer of $${amount} was made`, problemId: original.problemId });
    res.json(counter);
  } catch (err) {
    req.log.error({ err }, "counter offer error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/offers/:id/accept", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, id)).limit(1);
    if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
    await db.update(offersTable).set({ status: "accepted" }).where(eq(offersTable.id, id));
    await db.insert(notificationsTable).values({ userId: offer.fromUserId, type: "offer_accepted", title: "Offer Accepted", message: `Your offer of $${offer.amount} was accepted!`, problemId: offer.problemId });
    res.json({ success: true, message: "Offer accepted" });
  } catch (err) {
    req.log.error({ err }, "accept offer error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/offers/:id/reject", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, id)).limit(1);
    if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
    await db.update(offersTable).set({ status: "rejected" }).where(eq(offersTable.id, id));
    await db.insert(notificationsTable).values({ userId: offer.fromUserId, type: "offer_rejected", title: "Offer Rejected", message: `Your offer of $${offer.amount} was declined`, problemId: offer.problemId });
    res.json({ success: true, message: "Offer rejected" });
  } catch (err) {
    req.log.error({ err }, "reject offer error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
