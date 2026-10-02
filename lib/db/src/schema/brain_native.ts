/**
 * dAIsy haMINJA BRAIN — PROPRIETARY KNOWLEDGE ACCUMULATOR
 *
 * Every paradox resolved by the Heuristic Kernel is stored here.
 * The HOW (resolution vector, execution path, directive, rationale) is kept
 * entirely internal — never exposed via public API.
 *
 * The marketplace only receives a sanitized proof bundle (collapseHash + resolutionType).
 * The brain accumulates intelligence with every collapse cycle.
 */

import { pgTable, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const daisyBrainTable = pgTable("daisy_brain", {
  brainId: text("brain_id").primaryKey(),

  // Paradox context
  paradoxId: integer("paradox_id").notNull(),
  paradoxTitle: text("paradox_title").notNull(),
  paradoxCategory: text("paradox_category").notNull(),
  paradoxPaymentOffer: text("paradox_payment_offer"),

  // Resolution vector — PROPRIETARY, never returned via public API
  resolutionType: text("resolution_type").notNull(),
  executionPath: text("execution_path").notNull(),   // JSON array
  directive: text("directive").notNull(),             // internal heuristic directive
  rationale: text("rationale").notNull(),             // internal rationale
  confidence: numeric("confidence", { precision: 5, scale: 2 }).notNull(),
  lamportWeight: integer("lamport_weight").notNull(),

  // Cryptographic proof — safe to expose as proof of resolution
  collapseHash: text("collapse_hash").notNull().unique(),
  lamport: integer("lamport").notNull(),
  entropy: numeric("entropy", { precision: 8, scale: 6 }).notNull(),
  nodeId: integer("node_id").notNull(),
  consensusRound: integer("consensus_round").notNull(),

  // Intent link
  intentId: text("intent_id"),
  intentStatus: text("intent_status"),

  // Lifecycle
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DaisyBrainEntry = typeof daisyBrainTable.$inferSelect;
