import { pgTable, serial, text, varchar, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("general"),
  status: text("status").notNull().default("open"),
  source: text("source").notNull().default("manual"),
  sourceUrl: text("source_url"),
  paymentOffer: numeric("payment_offer", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  deadline: text("deadline"),
  clientId: varchar("client_id"),
  tags: text("tags"),
  viewCount: integer("view_count").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProblemSchema = createInsertSchema(problemsTable).omit({ id: true, viewCount: true, isVerified: true, createdAt: true, updatedAt: true });
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Problem = typeof problemsTable.$inferSelect;
