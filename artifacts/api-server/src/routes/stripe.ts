import { Router } from "express";
import { stripeService } from "../lib/stripeService";
import { stripeStorage } from "../lib/stripeStorage";
import { db } from "@workspace/db";
import { ordersTable, paradoxProductsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/stripe/checkout", async (req: any, res) => {
  try {
    const { productId } = req.body;
    if (!productId) { res.status(400).json({ error: "productId required" }); return; }

    const [product] = await db.select().from(paradoxProductsTable).where(eq(paradoxProductsTable.id, productId));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }

    const userId = (req.session as any)?.userId ?? "1";
    const email = (req.session as any)?.email ?? "guest@solvex.io";

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const { url, orderId } = await stripeService.createCheckoutSession({
      userId,
      email,
      productId,
      productName: product.name,
      amountUsd: parseFloat(product.priceUsdc),
      successUrl: `${baseUrl}/?checkout=success&orderId=${"{CHECKOUT_SESSION_ID}"}`,
      cancelUrl: `${baseUrl}/?checkout=cancel`,
    });

    res.json({ url, orderId });
  } catch (err: any) {
    req.log.error({ err }, "Stripe checkout error");
    res.status(500).json({ error: err.message });
  }
});

router.get("/stripe/session/:sessionId", async (req: any, res) => {
  try {
    const session = await stripeService.getCheckoutSession(req.params.sessionId);
    res.json({
      status: session.payment_status,
      orderId: session.metadata?.orderId,
      productId: session.metadata?.productId,
      amountTotal: session.amount_total,
      currency: session.currency,
    });
  } catch (err: any) {
    req.log.error({ err }, "Stripe session lookup error");
    res.status(500).json({ error: err.message });
  }
});

router.get("/stripe/orders", async (req: any, res) => {
  try {
    const userId = (req.session as any)?.userId ?? "1";
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, userId));
    res.json(orders.filter((o) => o.paymentMethod === "stripe"));
  } catch (err: any) {
    req.log.error({ err }, "Stripe orders error");
    res.status(500).json({ error: err.message });
  }
});

router.get("/stripe/products", async (_req: any, res) => {
  try {
    const products = await stripeStorage.listProductsWithPrices();
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
