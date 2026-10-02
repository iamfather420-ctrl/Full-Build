import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, paradoxProductsTable, vaultEntriesTable, auditLogTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { requireOwner } from "../middlewares/requireOwner";

const WALLET_ADDRESSES: Record<string, string> = {
  eth:  process.env.WALLET_ETH  ?? "0x742d35Cc6634C0532925a3b8D4C9C3a4b0f4b1E",
  usdc: process.env.WALLET_USDC ?? "0x892d45Cc6634C0532925a3b8D4C9C3a4b0f4b1E",
  btc:  process.env.WALLET_BTC  ?? "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
};

const HOLD_HOURS = 72;

const router = Router();

router.post("/orders", async (req, res) => {
  try {
    const { productId, paymentMethod } = req.body;
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: "Authentication required" }); return; }
    if (!productId || !paymentMethod) {
      res.status(400).json({ error: "productId and paymentMethod required" });
      return;
    }
    const [product] = await db.select().from(paradoxProductsTable).where(eq(paradoxProductsTable.id, productId)).limit(1);
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }

    const priceMap: Record<string, string> = { eth: product.priceEth, usdc: product.priceUsdc, btc: product.priceBtc };
    const amount = priceMap[paymentMethod];
    if (!amount) { res.status(400).json({ error: "Invalid payment method" }); return; }

    const orderId = nanoid();
    const holdUntil = new Date(Date.now() + HOLD_HOURS * 60 * 60 * 1000);
    const walletAddress = WALLET_ADDRESSES[paymentMethod] ?? WALLET_ADDRESSES.eth;

    await db.insert(ordersTable).values({ id: orderId, userId, productId, status: "pending", paymentMethod, amount, walletAddress });
    await db.insert(vaultEntriesTable).values({ id: nanoid(), orderId, userId, amount, paymentMethod, status: "pending", holdUntil });
    await db.insert(auditLogTable).values({ id: nanoid(), eventType: "order_created", userId, orderId, details: JSON.stringify({ productId, paymentMethod, amount }), status: "success" });

    res.status(201).json({ orderId, walletAddress, amount, paymentMethod, holdUntil: holdUntil.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create order");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/mine", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.json([]); return; }
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, userId)).orderBy(desc(ordersTable.createdAt));
    res.json(orders);
  } catch (err) {
    req.log.error({ err }, "Failed to get orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/all", requireOwner, async (req, res) => {
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    res.json(orders);
  } catch (err) {
    req.log.error({ err }, "Failed to get all orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(order);
  } catch (err) {
    req.log.error({ err }, "Failed to get order");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders/:id/confirm", async (req, res) => {
  try {
    const { transactionHash } = req.body;
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    // Generate real cryptographic license key: SHA-256 of orderId + productId + nonce
    const licenseNonce = crypto.randomBytes(16).toString("hex");
    const licenseKey = crypto
      .createHash("sha256")
      .update(`${order.id}:${order.productId}:${licenseNonce}:${Date.now()}`)
      .digest("hex")
      .toUpperCase()
      .match(/.{1,8}/g)!
      .join("-"); // Format: XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX

    await db.update(ordersTable).set({ status: "confirmed", transactionHash, confirmedAt: new Date(), licenseKey }).where(eq(ordersTable.id, order.id));
    await db.update(vaultEntriesTable).set({ status: "held" }).where(eq(vaultEntriesTable.orderId, order.id));

    const [prod] = await db.select().from(paradoxProductsTable).where(eq(paradoxProductsTable.id, order.productId)).limit(1);
    if (prod) {
      await db.update(paradoxProductsTable).set({ salesCount: prod.salesCount + 1 }).where(eq(paradoxProductsTable.id, order.productId));
    }

    await db.insert(auditLogTable).values({ id: nanoid(), eventType: "order_confirmed", userId: order.userId, orderId: order.id, details: JSON.stringify({ transactionHash, licenseKey }), status: "success" });
    res.json({ success: true, message: "Order confirmed", licenseKey });
  } catch (err) {
    req.log.error({ err }, "Failed to confirm order");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
