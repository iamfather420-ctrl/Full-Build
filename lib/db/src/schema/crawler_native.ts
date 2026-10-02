import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const crawledProblemsTable = pgTable("crawled_problems", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull(),
  platform: text("platform").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sourceUrl: text("source_url").notNull(),
  suggestedCategory: text("suggested_category").notNull().default("general"),
  suggestedPayment: text("suggested_payment"),
  isImported: boolean("is_imported").notNull().default(false),
  aiSummary: text("ai_summary"),
  upvotes: integer("upvotes"),
  crawledAt: timestamp("crawled_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCrawledProblemSchema = createInsertSchema(crawledProblemsTable).omit({ id: true, isImported: true, crawledAt: true });
export type InsertCrawledProblem = z.infer<typeof insertCrawledProblemSchema>;
export type CrawledProblem = typeof crawledProblemsTable.$inferSelect;
