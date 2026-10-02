import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * ============ SOLVEX MARKETPLACE DATABASE SCHEMA ============
 * Complete schema for autonomous payment vault, solution protection,
 * audit logging, and owner-only control system.
 * 
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Paradox products table - pre-packaged solutions for sale
 */
export const paradoxProducts = mysqlTable("paradox_products", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["fundamental", "ai", "operational"]).notNull(),
  description: text("description").notNull(),
  solution: text("solution").notNull(),
  impact: text("impact").notNull(), // JSON array stored as text
  priceEth: decimal("priceEth", { precision: 18, scale: 8 }).notNull(),
  priceUsdc: decimal("priceUsdc", { precision: 18, scale: 6 }).notNull(),
  priceBtc: decimal("priceBtc", { precision: 18, scale: 8 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ParadoxProduct = typeof paradoxProducts.$inferSelect;
export type InsertParadoxProduct = typeof paradoxProducts.$inferInsert;

/**
 * Orders table - tracks all purchases
 */
export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  paradoxId: varchar("paradoxId", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "delivered", "failed"]).default("pending").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["eth", "usdc", "btc"]).notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  walletAddress: varchar("walletAddress", { length: 255 }).notNull(),
  transactionHash: varchar("transactionHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
  deliveredAt: timestamp("deliveredAt"),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Payment vault ledger - tracks all incoming payments with hold periods
 */
export const vaultLedger = mysqlTable("vault_ledger", {
  id: varchar("id", { length: 64 }).primaryKey(),
  orderId: varchar("orderId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["eth", "usdc", "btc"]).notNull(),
  status: mysqlEnum("status", ["pending", "held", "available", "withdrawn"]).default("pending").notNull(),
  holdUntil: timestamp("holdUntil").notNull(), // When hold expires
  withdrawnAt: timestamp("withdrawnAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VaultLedger = typeof vaultLedger.$inferSelect;
export type InsertVaultLedger = typeof vaultLedger.$inferInsert;

/**
 * User purchases/library - tracks what users have purchased and unlocked
 */
export const userPurchases = mysqlTable("user_purchases", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  paradoxId: varchar("paradoxId", { length: 64 }).notNull(),
  orderId: varchar("orderId", { length: 64 }).notNull(),
  unlockedAt: timestamp("unlockedAt"),
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
});

export type UserPurchase = typeof userPurchases.$inferSelect;
export type InsertUserPurchase = typeof userPurchases.$inferInsert;

/**
 * Vault configuration - configurable hold periods
 */
export const vaultConfig = mysqlTable("vault_config", {
  id: int("id").autoincrement().primaryKey(),
  holdPeriodHours: int("holdPeriodHours").default(72).notNull(), // Default 3 days
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VaultConfig = typeof vaultConfig.$inferSelect;
export type InsertVaultConfig = typeof vaultConfig.$inferInsert;

/**
 * Solution access tokens - unique tokens for each purchased solution to prevent copying/resale
 */
export const solutionAccessTokens = mysqlTable("solution_access_tokens", {
  id: varchar("id", { length: 64 }).primaryKey(),
  purchaseId: varchar("purchaseId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  paradoxId: varchar("paradoxId", { length: 64 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(), // Cryptographic token
  isActive: boolean("isActive").default(true).notNull(),
  accessCount: int("accessCount").default(0).notNull(),
  lastAccessedAt: timestamp("lastAccessedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // Optional expiration
});

export type SolutionAccessToken = typeof solutionAccessTokens.$inferSelect;
export type InsertSolutionAccessToken = typeof solutionAccessTokens.$inferInsert;

/**
 * Audit log - complete record of all system events
 */
export const auditLog = mysqlTable("audit_log", {
  id: varchar("id", { length: 64 }).primaryKey(),
  eventType: varchar("eventType", { length: 64 }).notNull(), // payment_received, order_created, solution_accessed, withdrawal_initiated, etc.
  userId: int("userId"), // Null for system events
  orderId: varchar("orderId", { length: 64 }),
  purchaseId: varchar("purchaseId", { length: 64 }),
  vaultEntryId: varchar("vaultEntryId", { length: 64 }),
  details: text("details").notNull(), // JSON with event-specific data
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  status: mysqlEnum("status", ["success", "failed", "pending"]).default("success").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

/**
 * Owner settings - withdrawal address, system configuration
 */
export const ownerSettings = mysqlTable("owner_settings", {
  id: int("id").autoincrement().primaryKey(),
  withdrawalAddress: varchar("withdrawalAddress", { length: 255 }), // Crypto address for withdrawals
  totalWithdrawn: decimal("totalWithdrawn", { precision: 20, scale: 8 }).default("0").notNull(),
  lastWithdrawalAt: timestamp("lastWithdrawalAt"),
  systemStatus: mysqlEnum("systemStatus", ["active", "maintenance", "paused"]).default("active").notNull(),
  enableAutoPaymentDetection: boolean("enableAutoPaymentDetection").default(true).notNull(),
  enableAutoDelivery: boolean("enableAutoDelivery").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OwnerSettings = typeof ownerSettings.$inferSelect;
export type InsertOwnerSettings = typeof ownerSettings.$inferInsert;

/**
 * Subscription management - track active subscriptions and access control
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  paradoxId: varchar("paradoxId", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["active", "expired", "cancelled", "suspended"]).default("active").notNull(),
  accessLevel: mysqlEnum("accessLevel", ["view", "download", "none"]).default("view").notNull(),
  maxAccessCount: int("maxAccessCount"), // Null = unlimited
  currentAccessCount: int("currentAccessCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Payment notifications - autonomous system for tracking payment events
 */
export const paymentNotifications = mysqlTable("payment_notifications", {
  id: varchar("id", { length: 64 }).primaryKey(),
  orderId: varchar("orderId", { length: 64 }).notNull(),
  vaultEntryId: varchar("vaultEntryId", { length: 64 }),
  notificationType: mysqlEnum("notificationType", [
    "payment_received",
    "payment_confirmed",
    "hold_expiring",
    "hold_expired",
    "solution_delivered",
    "payment_failed",
    "access_attempted",
    "access_denied",
  ]).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: text("metadata"), // JSON with additional context
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaymentNotification = typeof paymentNotifications.$inferSelect;
export type InsertPaymentNotification = typeof paymentNotifications.$inferInsert;

/**
 * System stats snapshot - daily/hourly aggregated statistics
 */
export const systemStats = mysqlTable("system_stats", {
  id: varchar("id", { length: 64 }).primaryKey(),
  snapshotDate: timestamp("snapshotDate").notNull(),
  totalOrders: int("totalOrders").default(0).notNull(),
  totalRevenue: decimal("totalRevenue", { precision: 20, scale: 8 }).default("0").notNull(),
  totalWithdrawals: decimal("totalWithdrawals", { precision: 20, scale: 8 }).default("0").notNull(),
  vaultBalance: decimal("vaultBalance", { precision: 20, scale: 8 }).default("0").notNull(),
  activeSubscriptions: int("activeSubscriptions").default(0).notNull(),
  failedPayments: int("failedPayments").default(0).notNull(),
  accessAttempts: int("accessAttempts").default(0).notNull(),
  deniedAccess: int("deniedAccess").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SystemStats = typeof systemStats.$inferSelect;
export type InsertSystemStats = typeof systemStats.$inferInsert;

/**
 * Nodes - extend access across multiple devices
 * Each node is a license to access solutions on an additional device
 */
export const nodes = mysqlTable("nodes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  paradoxId: varchar("paradoxId", { length: 64 }).notNull(),
  nodeKey: varchar("nodeKey", { length: 255 }).notNull().unique(), // Unique identifier for the node
  status: mysqlEnum("status", ["active", "inactive", "revoked", "expired"]).default("active").notNull(),
  maxDevices: int("maxDevices").default(1).notNull(), // How many devices this node covers
  currentDeviceCount: int("currentDeviceCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Node = typeof nodes.$inferSelect;
export type InsertNode = typeof nodes.$inferInsert;

/**
 * Devices - track registered devices for multi-device access
 */
export const devices = mysqlTable("devices", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  nodeId: varchar("nodeId", { length: 64 }).notNull(),
  deviceName: varchar("deviceName", { length: 255 }).notNull(),
  deviceType: mysqlEnum("deviceType", ["desktop", "mobile", "tablet", "server"]).notNull(),
  deviceId: varchar("deviceId", { length: 255 }).notNull().unique(), // Hardware identifier
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  status: mysqlEnum("status", ["active", "inactive", "revoked"]).default("active").notNull(),
  lastAccessedAt: timestamp("lastAccessedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

/**
 * Node purchases - track node purchases and payments
 */
export const nodePurchases = mysqlTable("node_purchases", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  paradoxId: varchar("paradoxId", { length: 64 }).notNull(),
  nodeCount: int("nodeCount").notNull(), // Number of nodes purchased
  pricePerNode: decimal("pricePerNode", { precision: 18, scale: 8 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 18, scale: 8 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["eth", "usdc", "btc"]).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "delivered", "failed"]).default("pending").notNull(),
  transactionHash: varchar("transactionHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
  deliveredAt: timestamp("deliveredAt"),
});

export type NodePurchase = typeof nodePurchases.$inferSelect;
export type InsertNodePurchase = typeof nodePurchases.$inferInsert;

/**
 * User enterprise settings - per-user configuration
 */
export const userEnterpriseSettings = mysqlTable("user_enterprise_settings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull().unique(),
  companyName: varchar("companyName", { length: 255 }),
  maxDevicesPerNode: int("maxDevicesPerNode").default(1).notNull(),
  enableDeviceSync: boolean("enableDeviceSync").default(true).notNull(),
  enableOfflineAccess: boolean("enableOfflineAccess").default(false).notNull(),
  enableAuditLogging: boolean("enableAuditLogging").default(true).notNull(),
  enableIPRestriction: boolean("enableIPRestriction").default(false).notNull(),
  allowedIPs: text("allowedIPs"), // JSON array of allowed IPs
  enableTwoFactor: boolean("enableTwoFactor").default(false).notNull(),
  apiKeyEnabled: boolean("apiKeyEnabled").default(false).notNull(),
  apiKey: varchar("apiKey", { length: 255 }), // For programmatic access
  dataRetentionDays: int("dataRetentionDays").default(90).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserEnterpriseSettings = typeof userEnterpriseSettings.$inferSelect;
export type InsertUserEnterpriseSettings = typeof userEnterpriseSettings.$inferInsert;

/**
 * Device access logs - track all device access for audit trail
 */
export const deviceAccessLogs = mysqlTable("device_access_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  deviceId: varchar("deviceId", { length: 64 }).notNull(),
  nodeId: varchar("nodeId", { length: 64 }).notNull(),
  paradoxId: varchar("paradoxId", { length: 64 }).notNull(),
  accessType: mysqlEnum("accessType", ["view", "download", "sync", "export"]).notNull(),
  status: mysqlEnum("status", ["success", "failed", "denied"]).notNull(),
  reason: varchar("reason", { length: 255 }), // Reason for denied access
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeviceAccessLog = typeof deviceAccessLogs.$inferSelect;
export type InsertDeviceAccessLog = typeof deviceAccessLogs.$inferInsert;

/**
 * Node pricing - configurable pricing for different node quantities
 */
export const nodePricing = mysqlTable("node_pricing", {
  id: varchar("id", { length: 64 }).primaryKey(),
  paradoxId: varchar("paradoxId", { length: 64 }).notNull(),
  nodeQuantity: int("nodeQuantity").notNull(), // Number of nodes
  priceEth: decimal("priceEth", { precision: 18, scale: 8 }).notNull(),
  priceUsdc: decimal("priceUsdc", { precision: 18, scale: 6 }).notNull(),
  priceBtc: decimal("priceBtc", { precision: 18, scale: 8 }).notNull(),
  discount: int("discount").default(0).notNull(), // Percentage discount
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NodePricing = typeof nodePricing.$inferSelect;
export type InsertNodePricing = typeof nodePricing.$inferInsert;
