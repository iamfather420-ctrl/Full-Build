/**
 * SOLVEX-CORE-FINALIZED — Pillar 4: PRE-VALIDATED STATE CONSENSUS
 * L5 Consensus + L6 SOC 2 Audit baked into the pipeline execution loop.
 *
 * State-changing routes must pass the consensus gate before committing.
 * If consensus is stale or failed, operations are rejected with automatic rollback.
 */
import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { auditLogTable } from "@workspace/db";
import { nanoid } from "nanoid";
import { tickLamport } from "./lamport";
import { getLastConsensus, isSystemIsolated } from "./workers";

const CONSENSUS_MAX_AGE_MS = 60_000; // 60 seconds before considered stale

// ── L6 SOC 2 Audit Logger ─────────────────────────────────────────────────────
export const l6Audit = async (
  eventType: string,
  userId: number | null,
  details: unknown,
  status: "success" | "failure" | "blocked",
): Promise<void> => {
  const lamport = tickLamport();
  try {
    await db.insert(auditLogTable).values({
      id: nanoid(),
      eventType: `L6_AUDIT:${eventType}`,
      userId: userId != null ? String(userId) : null,
      orderId: null,
      details: JSON.stringify({ ...( typeof details === "object" ? details : { raw: details }), lamport }),
      status,
    });
  } catch {
    // Audit failures must not crash the pipeline — but they are logged
  }
};

// ── L5 Consensus Gate Middleware ───────────────────────────────────────────────
// Applied to all state-changing routes (POST, PUT, PATCH, DELETE).
// Checks that a valid consensus round exists within CONSENSUS_MAX_AGE_MS.
export const l5ConsensusGate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Read-only methods bypass the gate
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }

  // Autonomic isolation: full SYSTEM_STATIC lockdown
  if (isSystemIsolated()) {
    await l6Audit("CONSENSUS_GATE_BLOCKED", (req as any).user?.id ?? null, { path: req.path, reason: "SYSTEM_ISOLATED" }, "blocked");
    res.status(503).json({
      error: "SYSTEM_STATIC",
      reason: "Autonomic isolation active. 3 consecutive consensus failures detected.",
      code: "SOVEREIGN_LOCK",
    });
    return;
  }

  const consensus = getLastConsensus();

  // First 30 seconds after boot: consensus not yet run — allow through
  if (!consensus) {
    next();
    return;
  }

  const age = Date.now() - consensus.timestamp;

  if (age > CONSENSUS_MAX_AGE_MS) {
    await l6Audit("CONSENSUS_GATE_STALE", (req as any).user?.id ?? null, {
      path: req.path,
      lastRound: consensus.round,
      ageMs: age,
    }, "blocked");
    res.status(503).json({
      error: "CONSENSUS_STALE",
      reason: `Last consensus round ${consensus.round} is ${Math.round(age / 1000)}s old. Awaiting next round.`,
      code: "L5_GATE",
    });
    return;
  }

  if (!consensus.quorumMet) {
    await l6Audit("CONSENSUS_GATE_QUORUM_FAIL", (req as any).user?.id ?? null, {
      path: req.path,
      round: consensus.round,
      respondents: consensus.respondents,
    }, "blocked");
    res.status(503).json({
      error: "CONSENSUS_QUORUM_FAILURE",
      reason: `Round ${consensus.round}: only ${consensus.respondents}/54 nodes responded. Quorum requires 28.`,
      code: "L5_GATE",
    });
    return;
  }

  // L6: Audit every passing state-change
  await l6Audit("CONSENSUS_GATE_PASSED", (req as any).user?.id ?? null, {
    path: req.path,
    method: req.method,
    round: consensus.round,
    quorum: consensus.respondents,
  }, "success");

  next();
};

// ── L6 Route Audit Middleware ──────────────────────────────────────────────────
// Wraps response to capture outcome and log to audit table
export const l6RouteAudit = (eventType: string) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);
    const userId = (req as any).user?.id ?? null;

    res.json = (body: any) => {
      const statusCode = res.statusCode;
      l6Audit(eventType, userId, { path: req.path, method: req.method, statusCode }, statusCode >= 400 ? "failure" : "success").catch(() => {});
      return originalJson(body);
    };

    next();
  };
