import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/notifications", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.json([]); return; }
    const notifications = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, userId)).orderBy(desc(notificationsTable.createdAt));
    res.json(notifications);
  } catch (err) {
    req.log.error({ err }, "notifications error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/notifications/unread-count", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.json({ count: 0 }); return; }
    const all = await db.select().from(notificationsTable).where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
    res.json({ count: all.length });
  } catch (err) {
    req.log.error({ err }, "unread count error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/:id/read", async (req, res) => {
  try {
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, parseInt(req.params.id)));
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    req.log.error({ err }, "mark read error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/mark-all-read", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.json({ success: true }); return; }
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, userId));
    res.json({ success: true, message: "All marked as read" });
  } catch (err) {
    req.log.error({ err }, "mark all read error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
