import { pgTable, serial, text, timestamp, numeric, integer, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const outreachProspects = pgTable("outreach_prospects", {
  id: serial("id").primaryKey(),
  company: text("company").notNull(),
  sector: text("sector").notNull(),
  region: text("region").notNull(),
  contactRole: text("contact_role").notNull(),
  stage: text("stage").notNull().default("discovered"),
  platform: text("platform"),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  sourceAuthor: text("source_author"),
  snippet: text("snippet"),
  draftMessage: text("draft_message"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  unanswered: boolean("unanswered").notNull().default(false),
  productId: text("product_id"),
  productName: text("product_name"),
  listPriceEth: numeric("list_price_eth"),
  proposedPriceEth: numeric("proposed_price_eth"),
  negotiationRounds: integer("negotiation_rounds").notNull().default(0),
  fitScore: integer("fit_score").notNull().default(0),
  lastAction: text("last_action"),
  closedReason: text("closed_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex("outreach_prospects_source_url_idx").on(table.sourceUrl),
  index("outreach_prospects_stage_idx").on(table.stage),
  index("outreach_prospects_updated_at_idx").on(table.updatedAt),
]);

export const outreachEvents = pgTable("outreach_events", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").notNull(),
  company: text("company").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("outreach_events_created_at_idx").on(table.createdAt),
]);

export const insertOutreachProspectSchema = createInsertSchema(outreachProspects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertOutreachEventSchema = createInsertSchema(outreachEvents).omit({
  id: true,
  createdAt: true,
});

export type OutreachProspect = typeof outreachProspects.$inferSelect;
export type InsertOutreachProspect = z.infer<typeof insertOutreachProspectSchema>;
export type OutreachEvent = typeof outreachEvents.$inferSelect;
export type InsertOutreachEvent = z.infer<typeof insertOutreachEventSchema>;
