import { Router } from "express";
import { collapseAll } from "../lib/kinetic";
import { bridgeAll, getEvidenceBundle } from "../lib/vault-bridge";

const router = Router();

router.post("/kinetic/collapse-all", async (req, res) => {
  try {
    req.log.warn("KINETIC: bulk collapse-all requested");
    const result = await collapseAll();
    res.json({ success: true, ...result });
  } catch (err: any) {
    req.log.error({ err }, "kinetic/collapse-all error");
    res.status(500).json({ error: err.message });
  }
});

router.post("/kinetic/bridge-all", async (req, res) => {
  try {
    req.log.warn("KINETIC: bulk bridge-all requested");
    const result = await bridgeAll();
    res.json({ success: true, ...result });
  } catch (err: any) {
    req.log.error({ err }, "kinetic/bridge-all error");
    res.status(500).json({ error: err.message });
  }
});

router.get("/brain/:paradoxId/bridge", async (req, res) => {
  try {
    const paradoxId = parseInt(req.params.paradoxId, 10);
    if (isNaN(paradoxId)) {
      res.status(400).json({ error: "paradoxId must be an integer" });
      return;
    }
    const bundle = await getEvidenceBundle(paradoxId);
    if (bundle.length === 0) {
      res.status(404).json({ error: "No bridge manifest found for this paradox" });
      return;
    }
    res.json({ paradoxId, manifests: bundle });
  } catch (err: any) {
    req.log.error({ err }, "brain/:paradoxId/bridge error");
    res.status(500).json({ error: err.message });
  }
});

export default router;
