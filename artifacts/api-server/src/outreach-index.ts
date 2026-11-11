import express from "express";
import cors from "cors";
import { desc, sql } from "drizzle-orm";
import { db, outreachProspects, outreachEvents } from "@workspace/db";
import { logger } from "./lib/logger";
import { startOutreachEngine } from "./lib/outreach";

function safeDatabaseTarget() {
  const raw = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
  if (!raw) return { configured: false };
  try {
    const parsed = new URL(raw);
    return {
      configured: true,
      host: parsed.hostname,
      user: decodeURIComponent(parsed.username),
      database: parsed.pathname.replace(/^\\//, "").split("/")[0] || "default",
    };
  } catch {
    return { configured: true, parseable: false };
  }
}

const app = express();
const port = Number(process.env.PORT ?? 8080);
app.use(cors({ origin: process.env.APP_ORIGIN ?? false }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "solvex-outreach", database: "configured" }));
app.get("/api/outreach/stats", async (_req, res) => {
  try {
    const [row] = await db.select({
      total: sql<number>`count(*)::int`,
      newLeads: sql<number>`count(*) filter (where ${outreachProspects.stage} = 'discovered')::int`,
      draftsReady: sql<number>`count(*) filter (where ${outreachProspects.stage} = 'composed')::int`,
      delivered: sql<number>`count(*) filter (where ${outreachProspects.stage} = 'delivered')::int`,
      replies: sql<number>`count(*) filter (where ${outreachProspects.stage} = 'replied')::int`,
      unanswered: sql<number>`count(*) filter (where ${outreachProspects.unanswered})::int`,
    }).from(outreachProspects);
    res.json({ ...row, channelConnected: false });
  } catch (err) { logger.error({ err }, "outreach stats query failed"); res.status(503).json({ error: "Outreach database query failed" }); }
});
app.get("/api/outreach/prospects", async (_req, res) => {
  try { res.json(await db.select().from(outreachProspects).orderBy(desc(outreachProspects.updatedAt)).limit(60)); }
  catch (err) { logger.error({ err }, "outreach prospects query failed"); res.status(503).json({ error: "Outreach database query failed" }); }
});
app.get("/api/outreach/events", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "40"), 10) || 40, 200);
    res.json(await db.select().from(outreachEvents).orderBy(desc(outreachEvents.createdAt)).limit(limit));
  } catch (err) { logger.error({ err }, "outreach events query failed"); res.status(503).json({ error: "Outreach database query failed" }); }
});
app.listen(port, () => { logger.info({ port, databaseTarget: safeDatabaseTarget() }, "SolveX outreach API listening"); startOutreachEngine(); });
