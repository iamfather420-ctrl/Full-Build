import { Router } from "express";
import { db } from "@workspace/db";
import { paradoxProductsTable } from "@workspace/db";
import { eq, ilike, desc, asc, sql } from "drizzle-orm";

const router = Router();

router.get("/products", async (req, res) => {
  try {
    const { category, search, sortBy } = req.query as Record<string, string>;
    let query = db.select().from(paradoxProductsTable);
    const conditions: any[] = [];
    if (category) conditions.push(eq(paradoxProductsTable.category, category));
    if (search) conditions.push(ilike(paradoxProductsTable.name, `%${search}%`));
    let results = await db.select().from(paradoxProductsTable);
    if (category) results = results.filter((p) => p.category === category);
    if (search) results = results.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
    if (sortBy === "price_asc") results.sort((a, b) => parseFloat(a.priceUsdc) - parseFloat(b.priceUsdc));
    else if (sortBy === "price_desc") results.sort((a, b) => parseFloat(b.priceUsdc) - parseFloat(a.priceUsdc));
    else if (sortBy === "name") results.sort((a, b) => a.name.localeCompare(b.name));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Failed to list products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/products/stats", async (req, res) => {
  try {
    const products = await db.select().from(paradoxProductsTable);
    const totalSales = products.reduce((sum, p) => sum + p.salesCount, 0);
    const totalRevenue = products.reduce((sum, p) => sum + p.salesCount * parseFloat(p.priceUsdc), 0);
    const byCategory = products.reduce((acc: Record<string, number>, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});
    res.json({ totalProducts: products.length, totalSales, totalRevenue: totalRevenue.toFixed(2), byCategory });
  } catch (err) {
    req.log.error({ err }, "Failed to get product stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const [product] = await db.select().from(paradoxProductsTable).where(eq(paradoxProductsTable.id, req.params.id)).limit(1);
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(product);
  } catch (err) {
    req.log.error({ err }, "Failed to get product");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
