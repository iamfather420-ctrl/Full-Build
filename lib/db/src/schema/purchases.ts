import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userPurchasesTable = pgTable("user_purchases", {
  id: text("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  productId: text("product_id").notNull(),
  orderId: text("order_id").notNull(),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPurchaseSchema = createInsertSchema(userPurchasesTable).omit({ purchasedAt: true });
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type UserPurchase = typeof userPurchasesTable.$inferSelect;

export const auditLogTable = pgTable("audit_log", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  userId: varchar("user_id"),
  orderId: text("order_id"),
  details: text("details").notNull().default("{}"),
  status: text("status").notNull().default("success"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentNotificationsTable = pgTable("payment_notifications", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  notificationType: text("notification_type").notNull(),
  message: text("message").notNull(),
  isRead: text("is_read").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
