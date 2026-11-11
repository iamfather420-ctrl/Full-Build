import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { outreachProspects, outreachEvents } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { gmailConnected, sendEmail } from "../lib/gmail";
import { executeClaimedOutreachDelivery } from "../lib/outreachDelivery";
import { requireOwner } from "../middlewares/requireOwner";

const router: IRouter = Router();

let channelCache: { connected: boolean; at: number } | null = null;

async function emailChannelConnected(): Promise<boolean> {
  if (channelCache && Date.now() - channelCache.at < 60_000) return channelCache.connected;
  const connected = await gmailConnected();
  channelCache = { connected, at: Date.now() };
  return connected;
}

router.get("/outreach/stats", requireOwner, async (_req, res) => {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      newLeads: sql<number>`count(*) filter (where ${outreachProspects.stage} = 'discovered')::int`,
      draftsReady: sql<number>`count(*) filter (where ${outreachProspects.stage} = 'composed')::int`,
      delivered: sql<number>`count(*) filter (where ${outreachProspects.stage} = 'delivered')::int`,
      replies: sql<number>`count(*) filter (where ${outreachProspects.stage} = 'replied')::int`,
      unanswered: sql<number>`count(*) filter (where ${outreachProspects.unanswered})::int`,
    })
    .from(outreachProspects);
  const channelConnected = await emailChannelConnected();
  res.json({ ...row, channelConnected });
});

router.get("/outreach/prospects", requireOwner, async (_req, res) => {
  const rows = await db
    .select()
    .from(outreachProspects)
    .orderBy(desc(outreachProspects.updatedAt))
    .limit(60);
  res.json(rows);
});

router.get("/outreach/events", requireOwner, async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "40"), 10) || 40, 200);
  const rows = await db
    .select()
    .from(outreachEvents)
    .orderBy(desc(outreachEvents.createdAt))
    .limit(limit);
  res.json(rows);
});

const noCrlf = (v: string) => !/[\r\n]/.test(v);

const sendSchema = z.object({
  to: z.email().refine(noCrlf, "Invalid characters in address"),
  subject: z.string().min(1).max(200).refine(noCrlf, "Invalid characters in subject").optional(),
});

router.post("/outreach/prospects/:id/send", requireOwner, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid prospect id" });
    return;
  }
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid recipient email address is required" });
    return;
  }

  const [draft] = await db.select().from(outreachProspects).where(eq(outreachProspects.id, id)).limit(1);
  if (!draft || !draft.draftMessage || draft.stage !== "composed") {
    res.status(409).json({ error: "No composed draft available for this prospect" });
    return;
  }

  const subject =
    parsed.data.subject ??
    `Re: ${(draft.sourceTitle ?? "your post").replace(/[\\r\\n]+/g, " ").slice(0, 150)} — a possible solution`;
  const body =
    `${draft.draftMessage}\\n\\n` +
    `—\\nThis message references your public post: ${draft.sourceUrl ?? "(source unavailable)"}\\n` +
    `Sent via SolveX outreach.`;

  const outcome = await executeClaimedOutreachDelivery({
    claim: async () => {
      const claimed = await db
        .update(outreachProspects)
        .set({ stage: "sending", updatedAt: new Date() })
        .where(and(eq(outreachProspects.id, id), eq(outreachProspects.stage, "composed")))
        .returning({ id: outreachProspects.id });
      return claimed.length > 0;
    },
    send: () => sendEmail(parsed.data.to, subject, body),
    recordDelivered: async (messageId) => {
      await db.insert(outreachEvents).values({
        prospectId: id,
        company: draft.company,
        type: "deliver",
        message: `EMAIL SENT → "${subject}" delivered to ${parsed.data.to} via Gmail. Gmail message id: ${messageId}.`,
      });
    },
    markDelivered: async (messageId) => {
      await db
        .update(outreachProspects)
        .set({
          stage: "delivered",
          lastAction: `Draft emailed to ${parsed.data.to} via Gmail (message ${messageId})`,
          updatedAt: new Date(),
        })
        .where(eq(outreachProspects.id, id));
    },
    recordUnknown: async () => {
      await db.insert(outreachEvents).values({
        prospectId: id,
        company: draft.company,
        type: "delivery_unknown",
        message: "Delivery outcome is unknown after a Gmail transport error. Do not retry until the Gmail Sent folder is checked and the result is reconciled.",
      });
    },
    recordPersistenceIncomplete: async (messageId) => {
      await db.insert(outreachEvents).values({
        prospectId: id,
        company: draft.company,
        type: "delivery_unknown",
        message: `Gmail returned message ID ${messageId}, but delivery-state persistence failed. Delivery is confirmed; reconcile the prospect record manually and do not retry.`,
      });
    },
  });

  if (outcome === "not_claimed") {
    res.status(409).json({ error: "No composed draft available for this prospect (already sent or not ready)" });
    return;
  }
  if (outcome === "delivery_unknown") {
    req.log.error({ prospectId: id }, "OUTREACH: delivery outcome requires reconciliation");
    res.status(502).json({ error: "Delivery outcome requires reconciliation; do not retry until Gmail is checked." });
    return;
  }
  if (outcome === "persistence_incomplete") {
    req.log.error({ prospectId: id }, "OUTREACH: Gmail confirmed delivery but state persistence requires reconciliation");
    res.status(502).json({ error: "Gmail confirmed delivery, but state persistence requires reconciliation; do not retry." });
    return;
  }
  res.json({ success: true });
});

export default router;
