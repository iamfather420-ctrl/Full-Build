import { Router } from "express";
import { db } from "@workspace/db";
import { ownerSettingsTable, auditLogTable, vaultEntriesTable, ordersTable, problemsTable, earningsTable, paradoxProductsTable, paymentNotificationsTable } from "@workspace/db";
import { eq, and, lte, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { seedProducts } from "../seed";
import { requireOwner } from "../middlewares/requireOwner";

const router = Router();

router.use("/owner", requireOwner);

router.get("/owner/settings", async (req, res) => {
  try {
    const [settings] = await db.select().from(ownerSettingsTable).limit(1);
    if (!settings) {
      await db.insert(ownerSettingsTable).values({ withdrawalAddress: null, totalWithdrawn: "0", systemStatus: "active", enableAutoDelivery: true });
      const [created] = await db.select().from(ownerSettingsTable).limit(1);
      res.json(created);
      return;
    }
    res.json(settings);
  } catch (err) {
    req.log.error({ err }, "owner settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/owner/audit-log", async (req, res) => {
  try {
    const { limit = "100", offset = "0", eventType } = req.query as Record<string, string>;
    let entries = await db.select().from(auditLogTable).orderBy(desc(auditLogTable.createdAt));
    if (eventType) entries = entries.filter((e) => e.eventType === eventType);
    res.json(entries.slice(parseInt(offset), parseInt(offset) + parseInt(limit)));
  } catch (err) {
    req.log.error({ err }, "audit log error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/owner/system-stats", async (req, res) => {
  try {
    const orders = await db.select().from(ordersTable);
    const vaultEntries = await db.select().from(vaultEntriesTable);
    const problems = await db.select().from(problemsTable);
    const earnings = await db.select().from(earningsTable);
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.amount), 0).toFixed(8);
    const vaultBalance = vaultEntries.filter((e) => e.status === "held" || e.status === "available").reduce((s, e) => s + parseFloat(e.amount), 0).toFixed(8);
    const totalProblems = problems.length;
    const solvedProblems = problems.filter((p) => p.status === "solved").length;
    const totalEarnings = earnings.reduce((s, e) => s + parseFloat(e.amount), 0).toFixed(2);
    res.json({ totalOrders, totalRevenue, vaultBalance, activeSubscriptions: 0, totalProblems, solvedProblems, totalEarnings });
  } catch (err) {
    req.log.error({ err }, "system stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/owner/payment-notifications", async (req, res) => {
  try {
    const notifications = await db.select().from(paymentNotificationsTable).orderBy(desc(paymentNotificationsTable.createdAt));
    res.json(notifications.map((n) => ({ ...n, isRead: n.isRead === "1" })));
  } catch (err) {
    req.log.error({ err }, "payment notifications error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/owner/withdraw", async (req, res) => {
  try {
    const { entryIds, withdrawalAddress } = req.body;
    if (!entryIds?.length || !withdrawalAddress) { res.status(400).json({ error: "entryIds and withdrawalAddress required" }); return; }
    let total = 0;
    for (const id of entryIds) {
      const [entry] = await db.select().from(vaultEntriesTable).where(eq(vaultEntriesTable.id, id)).limit(1);
      if (entry) {
        await db.update(vaultEntriesTable).set({ status: "withdrawn", withdrawnAt: new Date() }).where(eq(vaultEntriesTable.id, id));
        total += parseFloat(entry.amount);
      }
    }
    const [settings] = await db.select().from(ownerSettingsTable).limit(1);
    if (settings) {
      const newTotal = (parseFloat(settings.totalWithdrawn) + total).toFixed(8);
      await db.update(ownerSettingsTable).set({ totalWithdrawn: newTotal, withdrawalAddress }).where(eq(ownerSettingsTable.id, settings.id));
    }
    await db.insert(auditLogTable).values({ id: nanoid(), eventType: "owner_withdrawal", details: JSON.stringify({ withdrawalAddress, entryIds, totalAmount: total.toFixed(8) }), status: "success" });
    res.json({ success: true, totalAmount: total.toFixed(8), entryCount: entryIds.length });
  } catch (err) {
    req.log.error({ err }, "owner withdraw error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/owner/seed-products", async (req, res) => {
  try {
    const result = await seedProducts();
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "seed products error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
