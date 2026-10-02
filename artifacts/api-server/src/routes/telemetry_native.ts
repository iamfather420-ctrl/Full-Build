import { Router } from "express";
import { db } from "@workspace/db";
import { problemsTable, solutionsTable } from "@workspace/db";
import { getTelemetry } from "../lib/telemetry";
import { currentTick } from "../lib/lamport";
import { getPublicKey } from "../lib/signing";
import { getAggregatedOps, getWorkerStatus, getPhysicalNodeCount, getLastConsensus, isSystemIsolated } from "../lib/workers";
import { executeSecure, getSidecarStatus } from "../lib/vault";
import { getAccretionStatus } from "../lib/accretion";
import { getKineticState } from "../lib/kinetic";

const router = Router();

router.get("/telemetry", async (req, res) => {
  const t = getTelemetry();
  const tick = currentTick();
  const workerOps = getAggregatedOps();
  const consensus = getLastConsensus();

  // Homeostasis: live DB ratio
  let homeostasis = "0.00";
  try {
    const paradoxes = await db.select().from(problemsTable);
    const resolved = await db.select().from(solutionsTable);
    const p = paradoxes.length || 1;
    homeostasis = Math.min((resolved.length / p) * 100, 100).toFixed(2);
  } catch { /* DB unavailable */ }

  const secured = await executeSecure("telemetry.read", { tick });
  const accretion = getAccretionStatus();

  res.json({
    // Core identity
    systemId: "SOLVEX-CORE-FINALIZED",
    mode: isSystemIsolated() ? "SYSTEM-STATIC" : t.systemStatic ? "SYSTEM-STATIC" : "SOVEREIGN OPERATING MODE",

    // Pillar 2: Homeostasis
    homeostasis,
    eventLoopLagMs: t.eventLoopLagMs,
    heapUsedMB: t.heapUsedMB,
    heapTotalMB: t.heapTotalMB,
    rssMB: t.rssMB,
    uptimeSec: t.uptimeSec,
    systemStatic: t.systemStatic || isSystemIsolated(),

    // Pillar 1: 54-node worker grid
    opsPerSec: workerOps,
    physicalNodes: getPhysicalNodeCount(),
    logicalNodes: 54,
    workerStatus: getWorkerStatus(),

    // Pillar 4: L5 Consensus state
    consensus: consensus
      ? {
          round: consensus.round,
          quorumMet: consensus.quorumMet,
          respondents: consensus.respondents,
          byzantineFaults: consensus.byzantineFaults,
          committedHash: consensus.committedHash,
          lamportTick: consensus.lamportTick,
          ageMs: Date.now() - consensus.timestamp,
        }
      : { round: 0, quorumMet: false, respondents: 0, byzantineFaults: 0, status: "AWAITING_FIRST_ROUND" },

    // Pillar 5: Vault sidecar
    vaultSidecar: {
      status: getSidecarStatus(),
      keyless: getSidecarStatus() === "ACTIVE",
    },

    // Pillar 6: Lamport causality
    lamportTick: tick,

    // Pillar 3: Accretion model
    accretion,

    // Kinetic Resolver state
    kinetic: getKineticState(),

    // Cryptographic proof
    signature: secured.signature,
    digest: secured.digest,
    nonce: secured.nonce,
    timestamp: secured.timestamp,
    publicKey: getPublicKey(),
  });
});

export default router;
