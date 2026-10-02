/**
 * VAULT BRIDGE — Brain-to-Product Resolution Manifest
 *
 * Every dAIsy Brain resolution is linked to specific vault products here.
 * Mapping is deterministic: same ResolutionType + primaryKey always produces
 * the same product recommendations.
 *
 * Each manifest is hash-locked (SHA-256 of brainId + productIds + lamport)
 * and carries institutional compliance anchors (NIST SP 800-53 / SOC2 / ISO 27001).
 */

import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const vaultBridgeTable = pgTable("vault_bridge", {
  manifestId: text("manifest_id").primaryKey(),

  // Brain link
  brainId: text("brain_id").notNull(),
  paradoxId: integer("paradox_id").notNull(),
  paradoxTitle: text("paradox_title").notNull(),
  resolutionType: text("resolution_type").notNull(),

  // Vault product recommendations (up to 3, primary always set)
  primaryProductId: text("primary_product_id").notNull(),
  primaryProductName: text("primary_product_name").notNull(),
  secondaryProductId: text("secondary_product_id"),
  secondaryProductName: text("secondary_product_name"),
  tertiaryProductId: text("tertiary_product_id"),
  tertiaryProductName: text("tertiary_product_name"),

  // Institutional rationale for the product recommendation
  institutionalRationale: text("institutional_rationale").notNull(),

  // Compliance evidence layer
  complianceFrameworks: text("compliance_frameworks").notNull(), // JSON: string[]
  nistControls: text("nist_controls").notNull(),                 // JSON: string[]
  soc2Controls: text("soc2_controls").notNull(),                 // JSON: string[]
  isoControls: text("iso_controls").notNull(),                   // JSON: string[]

  // Cryptographic proof of bridge integrity
  manifestHash: text("manifest_hash").notNull().unique(),
  lamport: integer("lamport").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VaultBridgeEntry = typeof vaultBridgeTable.$inferSelect;
