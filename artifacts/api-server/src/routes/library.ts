import { Router } from "express";
import { db } from "@workspace/db";
import { userPurchasesTable, paradoxProductsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/library", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.json([]); return; }
    const purchases = await db.select().from(userPurchasesTable).where(eq(userPurchasesTable.userId, userId));
    const result = await Promise.all(purchases.map(async (p) => {
      const [product] = await db.select().from(paradoxProductsTable).where(eq(paradoxProductsTable.id, p.productId)).limit(1);
      return { ...p, product: product ?? null };
    }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "library error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/library/:productId/check", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.json({ purchased: false }); return; }
    const purchase = await db.select().from(userPurchasesTable)
      .where(and(eq(userPurchasesTable.userId, userId), eq(userPurchasesTable.productId, req.params.productId)))
      .limit(1);
    res.json({ purchased: purchase.length > 0 });
  } catch (err) {
    req.log.error({ err }, "library check error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
