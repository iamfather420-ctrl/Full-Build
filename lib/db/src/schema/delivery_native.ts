/**
 * DELIVERY ARTIFACTS — Signed, Watermarked Institutional Packages
 *
 * Every vault product delivery is a signed manifest bundle:
 * - Buyer-specific watermark (SHA-256 of buyerId + productId + lamport)
 * - Full compliance evidence chain (brain → vault bridge → artifact)
 * - Anti-tamper seal (hash of all fields concatenated)
 * - Immutable audit trail reference
 *
 * The artifact IS the delivery — enterprise software licensing at institutional grade.
 */

import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const deliveryArtifactsTable = pgTable("delivery_artifacts", {
  artifactId: text("artifact_id").primaryKey(),

  // Source chain
  brainId: text("brain_id").notNull(),
  manifestId: text("manifest_id").notNull(),   // FK → vault_bridge
  paradoxId: integer("paradox_id").notNull(),
  paradoxTitle: text("paradox_title").notNull(),
  resolutionType: text("resolution_type").notNull(),

  // Vault product being delivered
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),

  // Buyer profile (institutional, not PII)
  buyerId: text("buyer_id").notNull(),
  buyerInstitution: text("buyer_institution").notNull(),
  buyerTier: text("buyer_tier").notNull().default("TIER_1"),

  // Delivery payload — the signed artifact bundle (JSON)
  artifactBundle: text("artifact_bundle").notNull(),

  // Cryptographic proofs
  buyerWatermark: text("buyer_watermark").notNull(),     // SHA-256(buyerId+productId+lamport)
  artifactSeal: text("artifact_seal").notNull().unique(), // SHA-256(all fields) — tamper seal
  lamport: integer("lamport").notNull(),

  // Delivery state
  status: text("status").notNull().default("COMPILED"),  // COMPILED | DELIVERED | VERIFIED
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const outreachLogTable = pgTable("outreach_log", {
  outreachId: text("outreach_id").primaryKey(),

  // Context
  paradoxId: integer("paradox_id").notNull(),
  paradoxTitle: text("paradox_title").notNull(),
  resolutionType: text("resolution_type").notNull(),
  primaryProductId: text("primary_product_id").notNull(),

  // Generated outreach
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  complianceHook: text("compliance_hook").notNull(),

  // Target
  targetTier: text("target_tier").notNull().default("TIER_1"),
  targetDomain: text("target_domain"),

  lamport: integer("lamport").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DeliveryArtifact = typeof deliveryArtifactsTable.$inferSelect;
export type OutreachLog = typeof outreachLogTable.$inferSelect;
