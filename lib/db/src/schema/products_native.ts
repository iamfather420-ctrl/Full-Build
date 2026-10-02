import { pgTable, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paradoxProductsTable = pgTable("paradox_products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("fundamental"),
  description: text("description").notNull(),
  solution: text("solution"),
  impact: text("impact"),
  priceEth: numeric("price_eth", { precision: 18, scale: 8 }).notNull(),
  priceUsdc: numeric("price_usdc", { precision: 18, scale: 2 }).notNull(),
  priceBtc: numeric("price_btc", { precision: 18, scale: 8 }).notNull(),
  salesCount: integer("sales_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(paradoxProductsTable).omit({ salesCount: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ParadoxProduct = typeof paradoxProductsTable.$inferSelect;
