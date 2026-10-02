import { Router } from "express";
import { db } from "@workspace/db";
import { vaultEntriesTable, vaultConfigTable, ownerSettingsTable, auditLogTable, userPurchasesTable, ordersTable } from "@workspace/db";
import { eq, and, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireOwner } from "../middlewares/requireOwner";

const router = Router();

router.get("/vault/config", async (req, res) => {
  try {
    const [cfg] = await db.select().from(vaultConfigTable).limit(1);
    res.json(cfg ?? { id: 1, holdPeriodHours: 72 });
  } catch (err) {
    req.log.error({ err }, "vault config error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/vault/entries", requireOwner, async (req, res) => {
  try {
    const entries = await db.select().from(vaultEntriesTable);
    res.json(entries);
  } catch (err) {
    req.log.error({ err }, "vault entries error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/vault/available-funds", async (req, res) => {
  try {
    const now = new Date();
    const entries = await db.select().from(vaultEntriesTable)
      .where(and(eq(vaultEntriesTable.status, "held"), lte(vaultEntriesTable.holdUntil, now)));
    const total = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    res.json({ total: total.toFixed(8), count: entries.length, entries });
  } catch (err) {
    req.log.error({ err }, "available funds error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/vault/withdraw", requireOwner, async (req, res) => {
  try {
    const { entryIds, withdrawalAddress } = req.body;
    if (!entryIds?.length || !withdrawalAddress) {
      res.status(400).json({ error: "entryIds and withdrawalAddress required" });
      return;
    }
    let total = 0;
    for (const id of entryIds) {
      const [entry] = await db.select().from(vaultEntriesTable).where(eq(vaultEntriesTable.id, id)).limit(1);
      if (entry && entry.status === "available") {
        await db.update(vaultEntriesTable).set({ status: "withdrawn", withdrawnAt: new Date() }).where(eq(vaultEntriesTable.id, id));
        total += parseFloat(entry.amount);
        await db.insert(auditLogTable).values({ id: nanoid(), eventType: "vault_withdrawal", details: JSON.stringify({ entryId: id, withdrawalAddress, amount: entry.amount }), status: "success" });
      }
    }
    res.json({ success: true, count: entryIds.length, totalAmount: total.toFixed(8) });
  } catch (err) {
    req.log.error({ err }, "vault withdraw error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/vault/process", requireOwner, async (req, res) => {
  try {
    const now = new Date();
    const expiredEntries = await db.select().from(vaultEntriesTable)
      .where(and(eq(vaultEntriesTable.status, "held"), lte(vaultEntriesTable.holdUntil, now)));
    for (const entry of expiredEntries) {
      await db.update(vaultEntriesTable).set({ status: "available" }).where(eq(vaultEntriesTable.id, entry.id));
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, entry.orderId)).limit(1);
      if (order) {
        await db.update(ordersTable).set({ status: "delivered", deliveredAt: now }).where(eq(ordersTable.id, order.id));
        const existingPurchase = await db.select().from(userPurchasesTable).where(eq(userPurchasesTable.orderId, order.id)).limit(1);
        if (existingPurchase.length === 0) {
          await db.insert(userPurchasesTable).values({ id: nanoid(), userId: order.userId, productId: order.productId, orderId: order.id, unlockedAt: now });
        }
      }
    }
    res.json({ success: true, processed: expiredEntries.length });
  } catch (err) {
    req.log.error({ err }, "vault process error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
