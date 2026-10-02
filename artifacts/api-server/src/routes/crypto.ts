import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, paradoxProductsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const router = Router();

const CRYPTO_ADDRESSES: Record<string, string> = {
  eth:  process.env.ETH_WALLET_ADDRESS  ?? "",
  usdc: process.env.USDC_WALLET_ADDRESS ?? process.env.ETH_WALLET_ADDRESS ?? "",
  base: process.env.BASE_WALLET_ADDRESS ?? process.env.ETH_WALLET_ADDRESS ?? "",
  sol:  process.env.SOL_WALLET_ADDRESS  ?? "",
  btc:  process.env.BTC_WALLET_ADDRESS  ?? "",
};

const VALID_CURRENCIES = ["eth", "usdc", "base", "sol", "btc"];

router.post("/crypto/payment-intent", async (req: any, res) => {
  try {
    const { productId, currency } = req.body;
    if (!productId || !currency) { res.status(400).json({ error: "productId and currency required" }); return; }

    const curr = (currency as string).toLowerCase();
    if (!VALID_CURRENCIES.includes(curr)) {
      res.status(400).json({ error: `currency must be one of: ${VALID_CURRENCIES.join(", ")}` }); return;
    }

    const walletAddress = CRYPTO_ADDRESSES[curr];
    if (!walletAddress) {
      res.status(503).json({
        error: `${curr.toUpperCase()} wallet not configured`,
        hint: `Set ${curr.toUpperCase()}_WALLET_ADDRESS in environment secrets`,
      }); return;
    }

    const [product] = await db.select().from(paradoxProductsTable).where(eq(paradoxProductsTable.id, productId));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }

    const usdAmount = parseFloat(product.priceUsdc);
    // ETH and BASE share the same price, USDC and SOL use USDC equivalent
    const cryptoAmount = (curr === "eth" || curr === "base")
      ? product.priceEth
      : curr === "btc"
        ? product.priceBtc
        : product.priceUsdc; // usdc, sol
    const userId = (req.session as any)?.userId ?? "1";
    const orderId = nanoid();

    await db.insert(ordersTable).values({
      id: orderId,
      userId,
      productId,
      status: "awaiting_payment",
      paymentMethod: curr,
      amount: cryptoAmount,
      walletAddress,
    });

    res.json({
      orderId,
      currency: curr.toUpperCase(),
      amount: cryptoAmount,
      walletAddress,
      productName: product.name,
      usdEquivalent: usdAmount,
      instructions: [
        `Send exactly ${cryptoAmount} ${curr.toUpperCase()} to the address above`,
        "Include your Order ID in the transaction memo if supported",
        "Payment is typically confirmed within 1-3 network confirmations",
        "Your license will be delivered once payment is verified",
      ],
      rateNote: (curr === "usdc" || curr === "sol") ? "1:1 USD peg (USDC equivalent)" : `≈ $${usdAmount.toLocaleString()} USD`,
    });
  } catch (err: any) {
    req.log.error({ err }, "Crypto payment intent error");
    res.status(500).json({ error: err.message });
  }
});

router.post("/crypto/verify/:orderId", async (req: any, res) => {
  try {
    const { txHash } = req.body;
    const { orderId } = req.params;

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    await db
      .update(ordersTable)
      .set({
        transactionHash: txHash,
        status: "payment_submitted",
        confirmedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId));

    res.json({
      orderId,
      status: "payment_submitted",
      txHash,
      message: "Transaction hash recorded. Owner will verify and release your license.",
    });
  } catch (err: any) {
    req.log.error({ err }, "Crypto verify error");
    res.status(500).json({ error: err.message });
  }
});

router.get("/crypto/order/:orderId", async (req: any, res) => {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.orderId));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(order);
  } catch (err: any) {
    req.log.error({ err }, "Crypto order lookup error");
    res.status(500).json({ error: err.message });
  }
});

router.get("/crypto/addresses", (_req: any, res) => {
  res.json({
    eth: CRYPTO_ADDRESSES.eth || null,
    usdc: CRYPTO_ADDRESSES.usdc || null,
    btc: CRYPTO_ADDRESSES.btc || null,
    configured: {
      eth: !!CRYPTO_ADDRESSES.eth,
      usdc: !!CRYPTO_ADDRESSES.usdc,
      btc: !!CRYPTO_ADDRESSES.btc,
    },
  });
});

export default router;
