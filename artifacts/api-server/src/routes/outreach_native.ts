import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { outreachProspects, outreachEvents } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { gmailConnected, sendEmail } from "../lib/gmail";
import { requireOwner } from "../middlewares/requireOwner";

const router: IRouter = Router();

let channelCache: { connected: boolean; at: number } | null = null;

async function emailChannelConnected(): Promise<boolean> {
  if (channelCache && Date.now() - channelCache.at < 60_000) return channelCache.connected;
  const connected = await gmailConnected();
  channelCache = { connected, at: Date.now() };
  return connected;
}

router.get("/outreach/stats", async (_req, res) => {
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

router.get("/outreach/prospects", async (_req, res) => {
  const rows = await db
    .select()
    .from(outreachProspects)
    .orderBy(desc(outreachProspects.updatedAt))
    .limit(60);
  res.json(rows);
});

router.get("/outreach/events", async (req, res) => {
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

  // Atomically claim the prospect so concurrent requests can't double-send
  const claimed = await db
    .update(outreachProspects)
    .set({ stage: "sending", updatedAt: new Date() })
    .where(and(eq(outreachProspects.id, id), eq(outreachProspects.stage, "composed")))
    .returning();
  const p = claimed[0];
  if (!p) {
    res.status(409).json({ error: "No composed draft available for this prospect (already sent or not ready)" });
    return;
  }
  if (!p.draftMessage) {
    await db
      .update(outreachProspects)
      .set({ stage: "composed", updatedAt: new Date() })
      .where(eq(outreachProspects.id, id));
    res.status(409).json({ error: "No composed draft available for this prospect" });
    return;
  }

  const subject =
    parsed.data.subject ??
    `Re: ${(p.sourceTitle ?? "your post").replace(/[\r\n]+/g, " ").slice(0, 150)} — a possible solution`;
  const body =
    `${p.draftMessage}\n\n` +
    `—\nThis message references your public post: ${p.sourceUrl ?? "(source unavailable)"}\n` +
    `Sent via SolveX outreach.`;

  try {
    const result = await sendEmail(parsed.data.to, subject, body);
    await db
      .update(outreachProspects)
      .set({
        stage: "delivered",
        lastAction: `Draft emailed to ${parsed.data.to} via Gmail (message ${result.id})`,
        updatedAt: new Date(),
      })
      .where(eq(outreachProspects.id, id));
    await db.insert(outreachEvents).values({
      prospectId: id,
      company: p.company,
      type: "deliver",
      message: `EMAIL SENT → "${subject}" delivered to ${parsed.data.to} via Gmail. Gmail message id: ${result.id}.`,
    });
    res.json({ success: true, messageId: result.id });
  } catch (err) {
    // Release the claim so the draft can be retried — it was NOT delivered
    await db
      .update(outreachProspects)
      .set({ stage: "composed", updatedAt: new Date() })
      .where(and(eq(outreachProspects.id, id), eq(outreachProspects.stage, "sending")));
    req.log.error({ err, prospectId: id }, "OUTREACH: email send failed");
    res.status(502).json({ error: (err as Error).message });
  }
});

export default router;
