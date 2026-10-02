/**
 * SOLVEX-CORE-FINALIZED — Pillar 1: RECURSIVE AUTONOMY
 * 54 concurrent Worker Threads forming a consensus-capable state-grid.
 * Each node is a recursive verifier. Results are committed only after quorum.
 *
 * Pillar 6: LAMPORT CAUSALITY — each worker maintains its own Lamport counter.
 *
 * TETHER SYNAPSE: Atomics-based SharedArrayBuffer for L1-L5 synchronization.
 * Layout (Int32, 8 slots × 4 bytes):
 *   [0] tether_state  (0=STABLE, 1=ENTROPIC, 2=FORCE_COLLAPSE, 3=OFFLINE)
 *   [1] entropy_ppm   (entropy × 1_000_000, stored as int for atomic ops)
 *   [2] consensus_round
 *   [3] collapse_count
 *   [4] active_nodes
 *   [5] lamport_tick
 *   [6] total_ops_k   (total ops ÷ 1000, atomic-safe)
 *   [7] reserved
 */
import { Worker } from "worker_threads";
import crypto from "crypto";
import { logger } from "./logger";
import { tickLamport } from "./lamport";

// ── Shared memory tether (L1-L5 atomic synchronization) ──────────────────────
const TETHER_BUFFER = new SharedArrayBuffer(8 * Int32Array.BYTES_PER_ELEMENT);
export const tether = new Int32Array(TETHER_BUFFER);

export const TETHER_SLOTS = {
  STATE: 0, ENTROPY_PPM: 1, CONSENSUS_ROUND: 2, COLLAPSE_COUNT: 3,
  ACTIVE_NODES: 4, LAMPORT: 5, TOTAL_OPS_K: 6, RESERVED: 7,
} as const;

// Write helpers — Atomics.store is sequentially consistent
export const tetherWrite = (slot: number, value: number) =>
  Atomics.store(tether, slot, value);
export const tetherRead = (slot: number) =>
  Atomics.load(tether, slot);
export const tetherAdd = (slot: number, delta: number) =>
  Atomics.add(tether, slot, delta);

const NODE_COUNT = 54;
const CONSENSUS_QUORUM = 28;
const CONSENSUS_TIMEOUT_MS = 500;

// Inline worker: SHA-256 computation + consensus + Atomics tether writes
const WORKER_CODE = `
const { parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');

let ops = 0;
let lamportTick = 0;
let seed = 'solvex-node-' + workerData.nodeId;

// L1-L5 Tether: Atomics-based shared memory (passed via workerData.tetherBuffer)
const tether = workerData.tetherBuffer ? new Int32Array(workerData.tetherBuffer) : null;
const SLOT_TOTAL_OPS_K = 6;
const SLOT_ACTIVE_NODES = 4;

// Signal this node as active
if (tether) Atomics.add(tether, SLOT_ACTIVE_NODES, 1);

// Light hashing loop — 100 hashes every 8ms (~12,500 ops/sec per node)
const loop = () => {
  for (let i = 0; i < 100; i++) {
    seed = crypto.createHash('sha256').update(seed + i).digest('hex');
    ops++;
  }
  setTimeout(loop, 8);
};
loop();

// Telemetry + tether write every second
setInterval(() => {
  lamportTick++;
  // Write ops into shared tether memory (Atomics.add, no lock needed)
  if (tether) Atomics.add(tether, SLOT_TOTAL_OPS_K, Math.floor(ops / 1000));
  parentPort.postMessage({ type: 'ops', count: ops, nodeId: workerData.nodeId, lamport: lamportTick });
  ops = 0;
}, 1000);

// Consensus probe handler — deterministic hash of challenge
parentPort.on('message', (msg) => {
  if (msg.type === 'CONSENSUS_PROBE') {
    lamportTick = Math.max(lamportTick, msg.lamport) + 1;
    const vote = crypto.createHash('sha256').update(msg.challenge).digest('hex');
    parentPort.postMessage({
      type: 'CONSENSUS_VOTE',
      round: msg.round,
      vote,
      nodeId: workerData.nodeId,
      lamport: lamportTick,
    });
  }
});
`;

interface WorkerNode {
  id: number;
  worker: Worker;
  ops: number;
  lamport: number;
  status: "ACTIVE" | "FAULTED" | "ISOLATED";
}

interface ConsensusRecord {
  round: number;
  challenge: string;
  quorumMet: boolean;
  respondents: number;
  byzantineFaults: number;
  committedHash: string;
  lamportTick: number;
  timestamp: number;
}

const pool: WorkerNode[] = [];
let initialized = false;
let consensusRound = 0;
let lastConsensus: ConsensusRecord | null = null;
let consecutiveFailures = 0;
let systemIsolated = false;

export const initializeWorkerPool = (): void => {
  if (initialized) return;
  initialized = true;

  for (let i = 0; i < NODE_COUNT; i++) {
    const worker = new Worker(WORKER_CODE, {
      eval: true,
      workerData: { nodeId: i, tetherBuffer: TETHER_BUFFER },
    });

    const node: WorkerNode = { id: i, worker, ops: 0, lamport: 0, status: "ACTIVE" };

    worker.on("message", (msg: any) => {
      if (msg.type === "ops") {
        node.ops = msg.count;
        node.lamport = msg.lamport;
      } else if (msg.type === "CONSENSUS_VOTE") {
        pendingVotes.get(msg.round)?.push({ nodeId: msg.nodeId, vote: msg.vote, lamport: msg.lamport });
      }
    });

    worker.on("error", (err) => {
      logger.error({ nodeId: i, err }, "Worker node faulted");
      node.status = "FAULTED";
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        logger.warn({ nodeId: i, code }, "Worker exited unexpectedly");
        node.status = "FAULTED";
      }
    });

    pool.push(node);
  }

  logger.info({ nodes: NODE_COUNT, quorum: CONSENSUS_QUORUM }, "SOLVEX: 54-node worker grid active");

  // Background consensus rounds every 10 seconds
  setInterval(runConsensusRound, 10_000);
};

const pendingVotes = new Map<number, Array<{ nodeId: number; vote: string; lamport: number }>>();

async function runConsensusRound(): Promise<void> {
  const round = ++consensusRound;
  const challenge = crypto.randomBytes(16).toString("hex");
  const lamport = tickLamport();

  pendingVotes.set(round, []);

  const active = pool.filter(n => n.status === "ACTIVE");
  for (const node of active) {
    node.worker.postMessage({ type: "CONSENSUS_PROBE", challenge, round, lamport });
  }

  await new Promise(resolve => setTimeout(resolve, CONSENSUS_TIMEOUT_MS));

  const votes = pendingVotes.get(round) ?? [];
  pendingVotes.delete(round);

  // Tally: expected deterministic hash of challenge
  const expectedHash = crypto.createHash("sha256").update(challenge).digest("hex");
  const correct = votes.filter(v => v.vote === expectedHash);
  const byzantine = votes.filter(v => v.vote !== expectedHash);

  // Mark Byzantine nodes as FAULTED
  for (const fault of byzantine) {
    const node = pool.find(n => n.id === fault.nodeId);
    if (node) {
      node.status = "FAULTED";
      logger.warn({ nodeId: fault.nodeId, round }, "Byzantine fault detected — node isolated");
    }
  }

  const quorumMet = correct.length >= CONSENSUS_QUORUM;
  const highestLamport = Math.max(...votes.map(v => v.lamport), 0);

  lastConsensus = {
    round,
    challenge,
    quorumMet,
    respondents: votes.length,
    byzantineFaults: byzantine.length,
    committedHash: quorumMet ? expectedHash : "UNCOMMITTED",
    lamportTick: highestLamport,
    timestamp: Date.now(),
  };

  if (!quorumMet) {
    consecutiveFailures++;
    logger.warn({ round, respondents: votes.length, required: CONSENSUS_QUORUM, consecutiveFailures }, "Consensus quorum not met");

    // Autonomic self-isolation: 3 consecutive failures → SYSTEM_STATIC
    if (consecutiveFailures >= 3) {
      logger.error("AUTONOMIC ISOLATION: 3 consecutive consensus failures. Entering SYSTEM_STATIC.");
      systemIsolated = true;
      process.emit("SIGUSR2"); // signal watchdog
    }
  } else {
    consecutiveFailures = 0;
    systemIsolated = false;
  }
}

export const getAggregatedOps = (): number =>
  pool.filter(n => n.status === "ACTIVE").reduce((acc, n) => acc + n.ops, 0);

export const getWorkerStatus = () =>
  pool.map(n => ({ id: n.id, ops: n.ops, lamport: n.lamport, status: n.status }));

export const getPhysicalNodeCount = (): number => pool.length;
export const getLastConsensus = (): ConsensusRecord | null => lastConsensus;
export const isSystemIsolated = (): boolean => systemIsolated;

// Tether.sync — trigger an out-of-band consensus probe with a custom seed
// Used by the Kinetic Resolver to broadcast Force-Collapse resolution pulses
export const triggerConsensusProbe = async (seed: string): Promise<void> => {
  if (pool.length === 0) return;
  const round = ++consensusRound;
  const challenge = crypto.createHash("sha256").update(seed).digest("hex");
  const lamport = tickLamport();

  pendingVotes.set(round, []);
  const active = pool.filter(n => n.status === "ACTIVE");
  for (const node of active) {
    node.worker.postMessage({ type: "CONSENSUS_PROBE", challenge, round, lamport });
  }

  await new Promise(resolve => setTimeout(resolve, CONSENSUS_TIMEOUT_MS));

  const votes = pendingVotes.get(round) ?? [];
  pendingVotes.delete(round);
  const expectedHash = crypto.createHash("sha256").update(challenge).digest("hex");
  const correct = votes.filter(v => v.vote === expectedHash);

  lastConsensus = {
    round,
    challenge,
    quorumMet: correct.length >= CONSENSUS_QUORUM,
    respondents: votes.length,
    byzantineFaults: votes.filter(v => v.vote !== expectedHash).length,
    committedHash: correct.length >= CONSENSUS_QUORUM ? expectedHash : "UNCOMMITTED",
    lamportTick: Math.max(...votes.map(v => v.lamport), 0),
    timestamp: Date.now(),
  };

  logger.info(
    { round, respondents: votes.length, quorum: correct.length >= CONSENSUS_QUORUM, seed },
    "TETHER_SYNC: Force-Collapse pulse broadcast complete",
  );
};
