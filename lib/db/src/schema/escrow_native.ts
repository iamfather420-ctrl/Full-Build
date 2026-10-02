import { pgTable, serial, text, varchar, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const escrowTable = pgTable("escrow", {
  id: serial("id").primaryKey(),
  problemId: integer("problem_id").notNull(),
  clientId: varchar("client_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEscrowSchema = createInsertSchema(escrowTable).omit({ id: true, status: true, releasedAt: true, refundedAt: true, createdAt: true });
export type InsertEscrow = z.infer<typeof insertEscrowSchema>;
export type Escrow = typeof escrowTable.$inferSelect;
