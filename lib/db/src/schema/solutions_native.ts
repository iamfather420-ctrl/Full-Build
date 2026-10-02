import { pgTable, serial, text, varchar, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const solutionsTable = pgTable("solutions", {
  id: serial("id").primaryKey(),
  problemId: integer("problem_id").notNull(),
  solverId: varchar("solver_id").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"),
  verificationScore: numeric("verification_score", { precision: 5, scale: 2 }),
  verificationNotes: text("verification_notes"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSolutionSchema = createInsertSchema(solutionsTable).omit({ id: true, status: true, verificationScore: true, verificationNotes: true, verifiedAt: true, createdAt: true, updatedAt: true });
export type InsertSolution = z.infer<typeof insertSolutionSchema>;
export type Solution = typeof solutionsTable.$inferSelect;
