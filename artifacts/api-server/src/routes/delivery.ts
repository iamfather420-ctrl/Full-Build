import { Router } from "express";
import { db, deliveryArtifactsTable, outreachLogTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";
import { generateArtifact, generateOutreach, autoConvert } from "../lib/artifact-engine";

const router = Router();

/**
 * POST /api/delivery/generate
 * Compile a signed, watermarked delivery artifact for a specific paradox + buyer.
 */
router.post("/delivery/generate", async (req, res) => {
  const { paradoxId, productId, buyerId, institution, tier, domain } = req.body ?? {};

  if (!paradoxId || !buyerId || !institution) {
    res.status(400).json({ error: "paradoxId, buyerId, and institution are required" });
    return;
  }

  try {
    const result = await generateArtifact({
      paradoxId: parseInt(paradoxId, 10),
      productId,
      buyer: { buyerId, institution, tier: tier ?? "TIER_1", domain },
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    req.log.error({ err }, "delivery/generate error");
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/delivery/pipeline-stats
 * Live stats for the delivery pipeline dashboard.
 * MUST be registered before /delivery/:artifactId to avoid prefix collision.
 */
router.get("/delivery/pipeline-stats", async (req, res) => {
  try {
    const [compiled] = await db.select({ count: count() }).from(deliveryArtifactsTable).where(eq(deliveryArtifactsTable.status, "COMPILED"));
    const [delivered] = await db.select({ count: count() }).from(deliveryArtifactsTable).where(eq(deliveryArtifactsTable.status, "DELIVERED"));
    const [verified] = await db.select({ count: count() }).from(deliveryArtifactsTable).where(eq(deliveryArtifactsTable.status, "VERIFIED"));
    const [outreachTotal] = await db.select({ count: count() }).from(outreachLogTable);
    const recent = await db
      .select({
        artifactId: deliveryArtifactsTable.artifactId,
        productName: deliveryArtifactsTable.productName,
        paradoxTitle: deliveryArtifactsTable.paradoxTitle,
        resolutionType: deliveryArtifactsTable.resolutionType,
        buyerInstitution: deliveryArtifactsTable.buyerInstitution,
        buyerTier: deliveryArtifactsTable.buyerTier,
        artifactSeal: deliveryArtifactsTable.artifactSeal,
        status: deliveryArtifactsTable.status,
        createdAt: deliveryArtifactsTable.createdAt,
      })
      .from(deliveryArtifactsTable)
      .orderBy(desc(deliveryArtifactsTable.createdAt))
      .limit(10);

    res.json({
      stats: {
        compiled: Number(compiled?.count ?? 0),
        delivered: Number(delivered?.count ?? 0),
        verified: Number(verified?.count ?? 0),
        outreach: Number(outreachTotal?.count ?? 0),
        total: Number(compiled?.count ?? 0) + Number(delivered?.count ?? 0) + Number(verified?.count ?? 0),
      },
      recent,
    });
  } catch (err: any) {
    req.log.error({ err }, "delivery/pipeline-stats error");
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/delivery/:artifactId
 * Retrieve a compiled artifact by its ID — includes full evidence chain.
 */
router.get("/delivery/:artifactId", async (req, res) => {
  try {
    const [artifact] = await db
      .select()
      .from(deliveryArtifactsTable)
      .where(eq(deliveryArtifactsTable.artifactId, req.params.artifactId))
      .limit(1);

    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    res.json({
      artifactId: artifact.artifactId,
      productId: artifact.productId,
      productName: artifact.productName,
      paradoxTitle: artifact.paradoxTitle,
      resolutionType: artifact.resolutionType,
      buyerInstitution: artifact.buyerInstitution,
      buyerTier: artifact.buyerTier,
      buyerWatermark: artifact.buyerWatermark,
      artifactSeal: artifact.artifactSeal,
      lamport: artifact.lamport,
      status: artifact.status,
      createdAt: artifact.createdAt,
      bundle: JSON.parse(artifact.artifactBundle),
    });
  } catch (err: any) {
    req.log.error({ err }, "delivery/:artifactId error");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/delivery/verify/:artifactId
 * Mark artifact as delivered and verified — simulates settlement handshake.
 */
router.post("/delivery/verify/:artifactId", async (req, res) => {
  try {
    const [artifact] = await db
      .select()
      .from(deliveryArtifactsTable)
      .where(eq(deliveryArtifactsTable.artifactId, req.params.artifactId))
      .limit(1);

    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    const { sealProof } = req.body ?? {};
    if (sealProof && sealProof !== artifact.artifactSeal) {
      res.status(400).json({ error: "SEAL_MISMATCH — artifact tamper detected", expected: artifact.artifactSeal });
      return;
    }

    await db
      .update(deliveryArtifactsTable)
      .set({ status: "VERIFIED", verifiedAt: new Date(), deliveredAt: artifact.deliveredAt ?? new Date() })
      .where(eq(deliveryArtifactsTable.artifactId, req.params.artifactId));

    res.json({
      success: true,
      status: "VERIFIED",
      artifactSeal: artifact.artifactSeal,
      message: "SEAL_VERIFIED — smart contract settlement authorised",
    });
  } catch (err: any) {
    req.log.error({ err }, "delivery/verify error");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/outreach/generate
 * Generate hyper-personalised institutional outreach for a paradox resolution.
 */
router.post("/outreach/generate", async (req, res) => {
  const { paradoxId, targetDomain, targetTier } = req.body ?? {};

  if (!paradoxId) {
    res.status(400).json({ error: "paradoxId is required" });
    return;
  }

  try {
    const result = await generateOutreach({
      paradoxId: parseInt(paradoxId, 10),
      targetDomain,
      targetTier: targetTier ?? "TIER_1",
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    req.log.error({ err }, "outreach/generate error");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/delivery/auto-convert
 * Full autonomous pipeline: outreach + artifact compilation in one call.
 * Discovery → Outreach → Artifact → Closing Protocol.
 */
router.post("/delivery/auto-convert", async (req, res) => {
  const { paradoxId, productId, buyerId, institution, tier, domain } = req.body ?? {};

  if (!paradoxId || !buyerId || !institution) {
    res.status(400).json({ error: "paradoxId, buyerId, and institution are required" });
    return;
  }

  try {
    req.log.warn({ paradoxId, buyerId, institution }, "AUTO_CONVERT: pipeline initiated");
    const result = await autoConvert({
      paradoxId: parseInt(paradoxId, 10),
      productId,
      buyer: { buyerId, institution, tier: tier ?? "TIER_1", domain },
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    req.log.error({ err }, "delivery/auto-convert error");
    res.status(500).json({ error: err.message });
  }
});

export default router;
