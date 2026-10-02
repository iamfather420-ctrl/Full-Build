import { pgTable, serial, text, varchar, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vaultConfigTable = pgTable("vault_config", {
  id: serial("id").primaryKey(),
  holdPeriodHours: integer("hold_period_hours").notNull().default(72),
  withdrawalAddress: text("withdrawal_address"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const vaultEntriesTable = pgTable("vault_entries", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  userId: varchar("user_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("pending"),
  holdUntil: timestamp("hold_until", { withTimezone: true }).notNull(),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVaultEntrySchema = createInsertSchema(vaultEntriesTable).omit({ createdAt: true });
export type InsertVaultEntry = z.infer<typeof insertVaultEntrySchema>;
export type VaultEntry = typeof vaultEntriesTable.$inferSelect;

export const ownerSettingsTable = pgTable("owner_settings", {
  id: serial("id").primaryKey(),
  withdrawalAddress: text("withdrawal_address"),
  totalWithdrawn: numeric("total_withdrawn", { precision: 18, scale: 8 }).notNull().default("0"),
  systemStatus: text("system_status").notNull().default("active"),
  enableAutoDelivery: boolean("enable_auto_delivery").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
