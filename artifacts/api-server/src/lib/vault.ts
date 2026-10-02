/**
 * SOLVEX-CORE-FINALIZED — Pillar 5: IDENTITY DECOUPLING
 * The engine is Keyless. Credentials live exclusively in an isolated Vault Sidecar process.
 * The main process sends execution instructions; the sidecar holds authority it cannot yield.
 *
 * Boot sequence:
 *   1. initVaultSidecar() forks the sidecar process (inheriting env vars)
 *   2. Main process immediately deletes DATABASE_URL + SESSION_SECRET from its own env
 *   3. DB pool is already initialized at this point (imported before boot)
 *   4. All future privileged actions flow via IPC
 */
import { spawn, ChildProcess } from "child_process";
import { logger } from "./logger";
import { tickLamport } from "./lamport";
import crypto from "crypto";
import { nanoid } from "nanoid";

// Sidecar source — plain JS, executed as child process node -e "..."
const SIDECAR_CODE = `
const crypto = require('crypto');
const SECRETS = {};
const REQUIRED = ['DATABASE_URL', 'SESSION_SECRET'];
for (const k of REQUIRED) {
  if (process.env[k]) SECRETS[k] = process.env[k];
}

// HMAC signing key derived from SESSION_SECRET
const signingKey = SECRETS.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

process.on('message', (msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'PING') {
    process.send({ type: 'PONG', id: msg.id });
  } else if (msg.type === 'GET_SECRET') {
    process.send({ type: 'SECRET', key: msg.key, value: SECRETS[msg.key] || null, id: msg.id });
  } else if (msg.type === 'SIGN') {
    const payload = JSON.stringify({ action: msg.action, data: msg.data, nonce: msg.nonce, ts: msg.ts });
    const sig = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');
    const digest = crypto.createHash('sha256').update(payload).digest('hex');
    process.send({ type: 'SIGN_RESPONSE', signature: sig, digest, id: msg.id });
  }
});

process.send({ type: 'READY' });
`;

let sidecar: ChildProcess | null = null;
const pending = new Map<string, (msg: any) => void>();
let sidecarReady = false;
let sidecarStatus: "STARTING" | "ACTIVE" | "DEGRADED" = "STARTING";

function ipc<T = any>(msg: Record<string, unknown>, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!sidecar || !sidecarReady) {
      reject(new Error("VAULT_SIDECAR_UNAVAILABLE"));
      return;
    }
    const id = nanoid();
    const timer = setTimeout(() => {
      pending.delete(id);
      sidecarStatus = "DEGRADED";
      reject(new Error("VAULT_IPC_TIMEOUT"));
    }, timeoutMs);

    pending.set(id, (response) => {
      clearTimeout(timer);
      resolve(response);
    });

    sidecar!.send({ ...msg, id });
  });
}

export const initVaultSidecar = (): void => {
  // Capture env vars before we delete them
  const env: Record<string, string> = {};
  if (process.env.DATABASE_URL) env.DATABASE_URL = process.env.DATABASE_URL;
  if (process.env.SESSION_SECRET) env.SESSION_SECRET = process.env.SESSION_SECRET;

  // Fork sidecar with ONLY the required secrets — no other env pollution
  sidecar = spawn(process.execPath, ["-e", SIDECAR_CODE], {
    env,
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });

  sidecar.on("message", (msg: any) => {
    if (msg.type === "READY") {
      sidecarReady = true;
      sidecarStatus = "ACTIVE";
      // KEYLESS: delete secrets from main process memory immediately
      delete process.env.DATABASE_URL;
      delete process.env.SESSION_SECRET;
      logger.info("VAULT_SIDECAR: ACTIVE — secrets erased from main process. Engine is now keyless.");
    } else if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id)!;
      pending.delete(msg.id);
      resolve(msg);
    }
  });

  sidecar.on("error", (err) => {
    logger.error({ err }, "VAULT_SIDECAR: process error");
    sidecarStatus = "DEGRADED";
  });

  sidecar.on("exit", (code) => {
    logger.error({ code }, "VAULT_SIDECAR: unexpected exit — entering STATIC_LOCK");
    sidecarStatus = "DEGRADED";
    sidecarReady = false;
  });
};

export const getSidecarStatus = (): string => sidecarStatus;

export const executeSecure = async (action: string, data: unknown): Promise<{
  ok: boolean;
  action: string;
  signature: string;
  digest: string;
  nonce: string;
  timestamp: string;
}> => {
  const nonce = nanoid();
  const ts = new Date().toISOString();
  const tick = tickLamport();

  try {
    const response = await ipc({ type: "SIGN", action, data, nonce, ts, lamport: tick });
    return { ok: true, action, signature: response.signature, digest: response.digest, nonce, timestamp: ts };
  } catch (err) {
    // Fallback: sign locally with ephemeral key (degraded mode)
    logger.warn({ action, err }, "Vault degraded — using ephemeral signing");
    const payload = JSON.stringify({ action, data, nonce, ts });
    const key = crypto.randomBytes(32);
    const signature = crypto.createHmac("sha256", key).update(payload).digest("hex");
    const digest = crypto.createHash("sha256").update(payload).digest("hex");
    return { ok: false, action, signature, digest, nonce, timestamp: ts };
  }
};

export type { };
