import { eq, and, gte, desc } from "drizzle-orm";
import {
  solutionAccessTokens,
  auditLog,
  ownerSettings,
  subscriptions,
  paymentNotifications,
  systemStats,
  orders,
  vaultLedger,
  nodes,
  devices,
  nodePurchases,
  userEnterpriseSettings,
  deviceAccessLogs,
  nodePricing,
} from "../drizzle/schema";
import { getDb } from "./db";
import { nanoid } from "nanoid";
import { randomBytes } from "crypto";
import { asc } from "drizzle-orm";

// ============ SOLUTION ACCESS TOKENS ============
export async function createSolutionAccessToken(
  purchaseId: string,
  userId: number,
  paradoxId: string,
  expiresAt?: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const token = randomBytes(32).toString("hex");
  const tokenId = nanoid();

  await db.insert(solutionAccessTokens).values({
    id: tokenId,
    purchaseId,
    userId,
    paradoxId,
    token,
    isActive: true,
    accessCount: 0,
    expiresAt,
  });

  return { tokenId, token };
}

export async function validateSolutionAccessToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(solutionAccessTokens)
    .where(eq(solutionAccessTokens.token, token))
    .limit(1);

  if (result.length === 0) return null;

  const tokenRecord = result[0];

  // Check if token is active
  if (!tokenRecord.isActive) return null;

  // Check if token has expired
  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
    return null;
  }

  return tokenRecord;
}

export async function incrementTokenAccessCount(tokenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const current = await db
    .select()
    .from(solutionAccessTokens)
    .where(eq(solutionAccessTokens.id, tokenId))
    .limit(1);

  if (current.length === 0) return;

  await db
    .update(solutionAccessTokens)
    .set({
      accessCount: (current[0].accessCount || 0) + 1,
      lastAccessedAt: new Date(),
    })
    .where(eq(solutionAccessTokens.id, tokenId));
}

export async function deactivateSolutionAccessToken(tokenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(solutionAccessTokens)
    .set({ isActive: false })
    .where(eq(solutionAccessTokens.id, tokenId));
}

// ============ AUDIT LOGGING ============
export async function logAuditEvent(
  eventType: string,
  status: "success" | "failed" | "pending",
  details: Record<string, any>,
  userId?: number,
  orderId?: string,
  purchaseId?: string,
  vaultEntryId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const eventId = nanoid();

  await db.insert(auditLog).values({
    id: eventId,
    eventType,
    userId,
    orderId,
    purchaseId,
    vaultEntryId,
    details: JSON.stringify(details),
    ipAddress,
    userAgent,
    status,
  });

  return eventId;
}

export async function getAuditLog(
  limit: number = 100,
  offset: number = 0,
  eventType?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query: any = db.select().from(auditLog);

  if (eventType) {
    query = query.where(eq(auditLog.eventType, eventType));
  }

  const results = await query
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((log: any) => ({
    ...log,
    details: JSON.parse(log.details),
  }));
}

// ============ OWNER SETTINGS ============
export async function getOwnerSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(ownerSettings).limit(1);
  return result[0] || null;
}

export async function updateOwnerSettings(updates: {
  withdrawalAddress?: string;
  systemStatus?: "active" | "maintenance" | "paused";
  enableAutoPaymentDetection?: boolean;
  enableAutoDelivery?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const settings = await getOwnerSettings();
  if (!settings) {
    // Create default settings if they don't exist
    await db.insert(ownerSettings).values({
      withdrawalAddress: updates.withdrawalAddress,
      systemStatus: updates.systemStatus || "active",
      enableAutoPaymentDetection: updates.enableAutoPaymentDetection !== false,
      enableAutoDelivery: updates.enableAutoDelivery !== false,
    });
  } else {
    await db.update(ownerSettings).set(updates).where(eq(ownerSettings.id, settings.id));
  }
}

export async function updateOwnerTotalWithdrawn(amount: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const settings = await getOwnerSettings();
  if (!settings) return;

  const currentTotal = parseFloat(settings.totalWithdrawn.toString());
  const newTotal = (currentTotal + parseFloat(amount)).toFixed(8);

  await db
    .update(ownerSettings)
    .set({
      totalWithdrawn: newTotal,
      lastWithdrawalAt: new Date(),
    })
    .where(eq(ownerSettings.id, settings.id));
}

// ============ PAYMENT NOTIFICATIONS ============
export async function createPaymentNotification(
  orderId: string,
  notificationType:
    | "payment_received"
    | "payment_confirmed"
    | "hold_expiring"
    | "hold_expired"
    | "solution_delivered"
    | "payment_failed"
    | "access_attempted"
    | "access_denied",
  message: string,
  vaultEntryId?: string,
  metadata?: Record<string, any>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const notificationId = nanoid();

  await db.insert(paymentNotifications).values({
    id: notificationId,
    orderId,
    vaultEntryId,
    notificationType,
    message,
    isRead: false,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });

  return notificationId;
}

export async function getPaymentNotifications(unreadOnly: boolean = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query: any = db.select().from(paymentNotifications);

  if (unreadOnly) {
    query = query.where(eq(paymentNotifications.isRead, false));
  }

  const results = await query.orderBy(desc(paymentNotifications.createdAt));

  return results.map((notif: any) => ({
    ...notif,
    metadata: notif.metadata ? JSON.parse(notif.metadata) : null,
  }));
}

export async function markNotificationAsRead(notificationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(paymentNotifications)
    .set({ isRead: true })
    .where(eq(paymentNotifications.id, notificationId));
}

export async function markAllNotificationsAsRead() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(paymentNotifications).set({ isRead: true });
}

// ============ SUBSCRIPTIONS ============
export async function createSubscription(
  userId: number,
  paradoxId: string,
  accessLevel: "view" | "download" | "none" = "view",
  maxAccessCount?: number,
  expiresAt?: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const subscriptionId = nanoid();

  await db.insert(subscriptions).values({
    id: subscriptionId,
    userId,
    paradoxId,
    status: "active",
    accessLevel,
    maxAccessCount,
    currentAccessCount: 0,
    expiresAt,
  });

  return subscriptionId;
}

export async function getSubscriptionByUserAndParadox(userId: number, paradoxId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.paradoxId, paradoxId)))
    .limit(1);

  return result[0] || null;
}

export async function getUserSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
}

export async function updateSubscriptionAccessCount(subscriptionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (sub.length === 0) return;

  const newCount = (sub[0].currentAccessCount || 0) + 1;

  await db
    .update(subscriptions)
    .set({ currentAccessCount: newCount })
    .where(eq(subscriptions.id, subscriptionId));
}

export async function cancelSubscription(subscriptionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(subscriptions)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId));
}

// ============ SYSTEM STATS ============
export async function createSystemStatsSnapshot() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate current stats
  const allOrders = await db.select().from(orders);
  const allVaultEntries = await db.select().from(vaultLedger);
  const allSubscriptions = await db.select().from(subscriptions);

  const totalOrders = allOrders.length;
  const totalRevenue = allOrders
    .reduce((sum, order) => sum + parseFloat(order.amount.toString()), 0)
    .toFixed(8);

  const totalWithdrawals = allVaultEntries
    .filter((entry) => entry.status === "withdrawn")
    .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0)
    .toFixed(8);

  const vaultBalance = allVaultEntries
    .filter((entry) => entry.status === "available" || entry.status === "held")
    .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0)
    .toFixed(8);

  const activeSubscriptions = allSubscriptions.filter((sub) => sub.status === "active").length;
  const failedPayments = allOrders.filter((order) => order.status === "failed").length;

  const statsId = nanoid();

  await db.insert(systemStats).values({
    id: statsId,
    snapshotDate: new Date(),
    totalOrders,
    totalRevenue,
    totalWithdrawals,
    vaultBalance,
    activeSubscriptions,
    failedPayments,
    accessAttempts: 0,
    deniedAccess: 0,
  });

  return statsId;
}

export async function getLatestSystemStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(systemStats)
    .orderBy(desc(systemStats.snapshotDate))
    .limit(1);

  return result[0] || null;
}

export async function getSystemStatsHistory(days: number = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await db
    .select()
    .from(systemStats)
    .where(gte(systemStats.snapshotDate, startDate))
    .orderBy(desc(systemStats.snapshotDate));
}

// ============ NODES & DEVICES ============

export async function createNode(userId: number, paradoxId: string, maxDevices: number = 1) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const nodeId = nanoid();
  const nodeKey = `node_${nanoid(32)}`;

  await db.insert(nodes).values({
    id: nodeId,
    userId,
    paradoxId,
    nodeKey,
    maxDevices,
  });

  return { id: nodeId, nodeKey };
}

export async function getUserNodes(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(nodes).where(eq(nodes.userId, userId));
}

export async function getNodeByKey(nodeKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(nodes).where(eq(nodes.nodeKey, nodeKey)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function registerDevice(
  userId: number,
  nodeId: string,
  deviceName: string,
  deviceType: "desktop" | "mobile" | "tablet" | "server",
  deviceId: string,
  ipAddress?: string,
  userAgent?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();

  await db.insert(devices).values({
    id,
    userId,
    nodeId,
    deviceName,
    deviceType,
    deviceId,
    ipAddress,
    userAgent,
  });

  return id;
}

export async function getNodeDevices(nodeId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(devices).where(eq(devices.nodeId, nodeId));
}

export async function getUserDevices(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(devices).where(eq(devices.userId, userId));
}

export async function updateDeviceLastAccess(deviceId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(devices).set({ lastAccessedAt: new Date() }).where(eq(devices.id, deviceId));
}

export async function revokeDevice(deviceId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(devices).set({ status: "revoked" }).where(eq(devices.id, deviceId));
}

// ============ NODE PURCHASES ============

export async function createNodePurchase(
  userId: number,
  paradoxId: string,
  nodeCount: number,
  pricePerNode: string,
  totalPrice: string,
  paymentMethod: "eth" | "usdc" | "btc"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();

  await db.insert(nodePurchases).values({
    id,
    userId,
    paradoxId,
    nodeCount,
    pricePerNode,
    totalPrice,
    paymentMethod,
  });

  return id;
}

export async function getUserNodePurchases(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(nodePurchases).where(eq(nodePurchases.userId, userId));
}

export async function confirmNodePurchase(purchaseId: string, transactionHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(nodePurchases)
    .set({
      status: "confirmed",
      transactionHash,
      confirmedAt: new Date(),
    })
    .where(eq(nodePurchases.id, purchaseId));
}

export async function deliverNodePurchase(purchaseId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const purchase = await db.select().from(nodePurchases).where(eq(nodePurchases.id, purchaseId)).limit(1);

  if (!purchase || purchase.length === 0) {
    throw new Error("Purchase not found");
  }

  const p = purchase[0];

  // Create nodes for the purchase
  for (let i = 0; i < p.nodeCount; i++) {
    await createNode(p.userId, p.paradoxId, 1);
  }

  // Mark purchase as delivered
  await db
    .update(nodePurchases)
    .set({
      status: "delivered",
      deliveredAt: new Date(),
    })
    .where(eq(nodePurchases.id, purchaseId));
}

// ============ ENTERPRISE SETTINGS ============

export async function getEnterpriseSettings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(userEnterpriseSettings).where(eq(userEnterpriseSettings.userId, userId)).limit(1);

  if (result.length === 0) {
    // Create default settings
    const id = nanoid();
    await db.insert(userEnterpriseSettings).values({
      id,
      userId,
    });
    return { id, userId };
  }

  return result[0];
}

export async function updateEnterpriseSettings(
  userId: number,
  updates: Partial<{
    companyName: string;
    maxDevicesPerNode: number;
    enableDeviceSync: boolean;
    enableOfflineAccess: boolean;
    enableAuditLogging: boolean;
    enableIPRestriction: boolean;
    allowedIPs: string;
    enableTwoFactor: boolean;
    apiKeyEnabled: boolean;
    dataRetentionDays: number;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(userEnterpriseSettings).set(updates).where(eq(userEnterpriseSettings.userId, userId));
}

export async function generateApiKey(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const apiKey = `sk_${nanoid(32)}`;

  await db
    .update(userEnterpriseSettings)
    .set({ apiKey, apiKeyEnabled: true })
    .where(eq(userEnterpriseSettings.userId, userId));

  return apiKey;
}

// ============ DEVICE ACCESS LOGS ============

export async function logDeviceAccess(
  userId: number,
  deviceId: string,
  nodeId: string,
  paradoxId: string,
  accessType: "view" | "download" | "sync" | "export",
  status: "success" | "failed" | "denied",
  reason?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();

  await db.insert(deviceAccessLogs).values({
    id,
    userId,
    deviceId,
    nodeId,
    paradoxId,
    accessType,
    status,
    reason,
    ipAddress,
    userAgent,
  });

  return id;
}

export async function getUserAccessLogs(userId: number, limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(deviceAccessLogs)
    .where(eq(deviceAccessLogs.userId, userId))
    .orderBy(desc(deviceAccessLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

// ============ NODE PRICING ============

export async function getNodePricing(paradoxId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(nodePricing).where(eq(nodePricing.paradoxId, paradoxId)).orderBy(asc(nodePricing.nodeQuantity));
}

export async function setNodePricing(
  paradoxId: string,
  nodeQuantity: number,
  priceEth: string,
  priceUsdc: string,
  priceBtc: string,
  discount: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();

  await db.insert(nodePricing).values({
    id,
    paradoxId,
    nodeQuantity,
    priceEth,
    priceUsdc,
    priceBtc,
    discount,
  });
}
