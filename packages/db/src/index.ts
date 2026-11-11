import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, bigserial, bigint, text, integer, boolean, timestamp, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL or NEON_DATABASE_URL must be configured for the outreach worker");

export const db = drizzle(neon(databaseUrl));

export const outreachProspects = pgTable("outreach_prospects", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  company: text("company").notNull(),
  sector: text("sector").notNull(),
  region: text("region").notNull(),
  contactRole: text("contact_role"),
  stage: text("stage").notNull().default("discovered"),
  platform: text("platform"),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  sourceAuthor: text("source_author"),
  snippet: text("snippet"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  unanswered: boolean("unanswered").notNull().default(false),
  fitScore: integer("fit_score").notNull().default(0),
  productId: text("product_id"),
  productName: text("product_name"),
  listPriceEth: numeric("list_price_eth", { precision: 18, scale: 8 }),
  draftMessage: text("draft_message"),
  lastAction: text("last_action"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sourceUrlUnique: uniqueIndex("outreach_prospects_source_url_key").on(t.sourceUrl),
  stageIdx: index("idx_outreach_prospects_stage").on(t.stage),
  updatedIdx: index("idx_outreach_prospects_updated").on(t.updatedAt),
}));

export const outreachEvents = pgTable("outreach_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  prospectId: bigint("prospect_id", { mode: "number" }).notNull(),
  company: text("company").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ createdIdx: index("idx_outreach_events_created").on(t.createdAt) }));
