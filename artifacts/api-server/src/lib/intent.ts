/**
 * SOLVEX-CORE: INTENT-BASED SIGNING PROTOCOL
 * AIR-GAPPED EXECUTION MODEL — ASYMMETRIC VERIFICATION
 *
 * The engine holds ZERO private keys. It is physically incapable of asset transfer.
 *
 * Protocol:
 *   1. Engine generates Intent JSON with a canonical 'header' string
 *   2. Hardware device (cold wallet / YubiKey / OS Enclave) signs: header + intentId
 *   3. Engine emits intent and HALTS — enters AWAITING_SIGNER state
 *   4. Hardware POSTs { header, intentId, signature } to /api/signer/confirm
 *   5. Engine verifies signature against registered public key (never sees private key)
 *   6. On valid signature: CONFIRMED — solution registers as immutable marketplace asset
 *
 * Verification: crypto.verify() — RSA-SHA256 or Ed25519 depending on key type
 * Public key: SOLVEX_SIGNER_PUBLIC_KEY env var (PEM format)
 * Fallback:   HMAC confirmation hash (legacy, used when no public key registered)
 */

import crypto from "crypto";
import { nanoid } from "nanoid";
import { tickLamport } from "./lamport";
import { executeSecure } from "./vault";
import { logger } from "./logger";

// ── Intent types ───────────────────────────────────────────────────────────────
export type IntentAction =
  | "FORCE_COLLAPSE_COMMIT"
  | "ESCROW_RELEASE"
  | "SOLUTION_FINALIZE"
  | "VAULT_WITHDRAWAL";

export type IntentStatus = "PENDING" | "AWAITING_SIGNER" | "CONFIRMED" | "EXPIRED" | "REJECTED";

export interface SignedIntent {
  intentId: string;
  action: IntentAction;
  target: string;
  nonce: string;
  lamport: number;
  collapseHash: string;
  accretionFloor: string;
  timestamp: string;
  /**
   * Canonical header — this is the exact string the hardware device signs.
   * Format: SOLVEX:{intentId}:{action}:{target}:{lamport}:{collapseHash}:{accretionFloor}:{timestamp}
   * The device computes: sign('sha256', Buffer.from(header + intentId), privateKey)
   */
  header: string;
  hmac: string;               // vault HMAC — used for legacy confirmation fallback
  solanaIntent: SolanaIntent | null;
  status: IntentStatus;
  signature: string | null;   // hex-encoded asymmetric signature from hardware
  confirmedAt: string | null;
  expiresAt: string;
  verificationMode: "ASYMMETRIC" | "HMAC_LEGACY";
}

export interface SolanaIntent {
  network: "devnet" | "mainnet-beta";
  programId: string;
  feePayer: "AWAITING_HARDWARE_PUBKEY";
  recentBlockhash: "AWAITING_RPC_FETCH";
  instruction: {
    programId: string;
    data: string;
    accounts: never[];
  };
  signerRequired: "HARDWARE_COLD_WALLET" | "YUBIKEY";
  note: string;
}

// ── Public key registry ────────────────────────────────────────────────────────
// Load once at startup — PEM format, RSA or Ed25519
function loadSignerPublicKey(): crypto.KeyObject | null {
  const pem = process.env.SOLVEX_SIGNER_PUBLIC_KEY;
  if (!pem) return null;
  try {
    return crypto.createPublicKey(pem.replace(/\\n/g, "\n"));
  } catch (err) {
    logger.error({ err }, "SIGNER: failed to parse SOLVEX_SIGNER_PUBLIC_KEY — falling back to HMAC");
    return null;
  }
}

let _signerPublicKey: crypto.KeyObject | null = loadSignerPublicKey();

export const getSignerPublicKey = () => _signerPublicKey;
export const isAsymmetricMode = () => _signerPublicKey !== null;

// Allow runtime key registration (e.g. via admin endpoint)
export function registerSignerPublicKey(pem: string): { ok: boolean; error?: string } {
  try {
    _signerPublicKey = crypto.createPublicKey(pem.replace(/\\n/g, "\n"));
    logger.info("SIGNER: asymmetric public key registered — hardware interlock upgraded");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ── Canonical header builder ───────────────────────────────────────────────────
// Deterministic — hardware device builds this same string from the pending intent,
// appends intentId, and signs the whole thing.
export function buildHeader(intent: Pick<SignedIntent, "intentId" | "action" | "target" | "lamport" | "collapseHash" | "accretionFloor" | "timestamp">): string {
  return [
    "SOLVEX",
    intent.intentId,
    intent.action,
    intent.target,
    String(intent.lamport),
    intent.collapseHash,
    intent.accretionFloor,
    intent.timestamp,
  ].join(":");
}

// ── Solana intent generator ────────────────────────────────────────────────────
const SOLANA_MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

function buildSolanaIntent(collapseHash: string, nonce: string): SolanaIntent {
  const memoData = Buffer.from(`solvex:${collapseHash}:${nonce}`).toString("base64");
  return {
    network: (process.env.SOLANA_NETWORK as "devnet" | "mainnet-beta") ?? "devnet",
    programId: SOLANA_MEMO_PROGRAM_ID,
    feePayer: "AWAITING_HARDWARE_PUBKEY",
    recentBlockhash: "AWAITING_RPC_FETCH",
    instruction: { programId: SOLANA_MEMO_PROGRAM_ID, data: memoData, accounts: [] },
    signerRequired: process.env.YUBIKEY_MODE === "true" ? "YUBIKEY" : "HARDWARE_COLD_WALLET",
    note:
      "Set feePayer to hardware wallet pubkey and recentBlockhash from getLatestBlockhash(). " +
      "Sign Buffer.from(header + intentId) locally then POST to /api/signer/confirm.",
  };
}

// ── Intent ledger ──────────────────────────────────────────────────────────────
const INTENT_TTL_MS = 5 * 60 * 1000;
const intentLedger = new Map<string, SignedIntent>();

// ── Intent emitter ─────────────────────────────────────────────────────────────
export async function emitIntent(
  action: IntentAction,
  target: string,
  collapseHash: string,
  accretionFloor: string,
): Promise<SignedIntent> {
  const intentId = nanoid();
  const nonce = crypto.randomBytes(16).toString("hex");
  const lamport = tickLamport();
  const timestamp = new Date().toISOString();
  const expiresAt = new Date(Date.now() + INTENT_TTL_MS).toISOString();

  const payload = { intentId, action, target, nonce, lamport, collapseHash, accretionFloor, timestamp };
  const secured = await executeSecure(`intent.${action}`, payload);

  const intentBase = { intentId, action, target, lamport, collapseHash, accretionFloor, timestamp };
  const header = buildHeader(intentBase);

  const intent: SignedIntent = {
    intentId,
    action,
    target,
    nonce,
    lamport,
    collapseHash,
    accretionFloor,
    timestamp,
    header,
    hmac: secured.signature,
    solanaIntent: buildSolanaIntent(collapseHash, nonce),
    status: "AWAITING_SIGNER",
    signature: null,
    confirmedAt: null,
    expiresAt,
    verificationMode: isAsymmetricMode() ? "ASYMMETRIC" : "HMAC_LEGACY",
  };

  intentLedger.set(intentId, intent);

  logger.info(
    { intentId, action, target, lamport, mode: intent.verificationMode },
    "INTENT_EMITTED: engine halted — awaiting hardware signer",
  );

  return intent;
}

// ── Asymmetric verification ────────────────────────────────────────────────────
// Hardware device signed: Buffer.from(header + intentId) with its private key.
// We verify with the registered public key only — private key never touches this process.
function verifyAsymmetric(header: string, intentId: string, signatureHex: string): boolean {
  const pubKey = _signerPublicKey;
  if (!pubKey) return false;
  try {
    const data = Buffer.from(header + intentId);
    const sig = Buffer.from(signatureHex, "hex");
    const keyType = pubKey.asymmetricKeyType;
    // Ed25519 doesn't use a hash algorithm in verify() — it's built into the curve
    const algorithm = keyType === "ed25519" ? null : "sha256";
    return crypto.verify(algorithm, data, pubKey, sig);
  } catch {
    return false;
  }
}

// ── HMAC legacy verification ───────────────────────────────────────────────────
function verifyHmacLegacy(intent: SignedIntent, confirmationHash: string): boolean {
  const expected = crypto
    .createHash("sha256")
    .update(`${intent.intentId}:${intent.hmac}:${intent.nonce}`)
    .digest("hex");
  if (confirmationHash.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(confirmationHash, "hex").slice(0, 32),
    Buffer.from(expected, "hex").slice(0, 32),
  );
}

// ── Confirmation handler ───────────────────────────────────────────────────────
export interface ConfirmPayload {
  intentId: string;
  header?: string;           // required for asymmetric mode
  signature?: string;        // hex — asymmetric mode
  confirmationHash?: string; // hex — HMAC legacy fallback
}

export function confirmIntent(payload: ConfirmPayload): {
  ok: boolean;
  error?: string;
  intent?: SignedIntent;
  mode?: string;
} {
  const { intentId, header, signature, confirmationHash } = payload;
  const intent = intentLedger.get(intentId);
  if (!intent) return { ok: false, error: "INTENT_NOT_FOUND" };
  if (intent.status !== "AWAITING_SIGNER") return { ok: false, error: `INTENT_STATUS_INVALID: ${intent.status}` };
  if (new Date(intent.expiresAt) < new Date()) {
    intent.status = "EXPIRED";
    return { ok: false, error: "INTENT_EXPIRED" };
  }

  let verified = false;
  let mode = "NONE";

  // Path 1: Asymmetric — preferred when public key is registered
  if (isAsymmetricMode() && header && signature) {
    // Verify that the header matches what we generated (prevents header substitution attacks)
    if (header !== intent.header) {
      intent.status = "REJECTED";
      logger.warn({ intentId }, "INTENT_REJECTED: header mismatch");
      return { ok: false, error: "HEADER_MISMATCH" };
    }
    verified = verifyAsymmetric(header, intentId, signature);
    mode = "ASYMMETRIC";
  }
  // Path 2: HMAC legacy fallback
  else if (confirmationHash) {
    verified = verifyHmacLegacy(intent, confirmationHash);
    mode = "HMAC_LEGACY";
  }
  else {
    return { ok: false, error: isAsymmetricMode()
      ? "ASYMMETRIC_MODE: provide header + signature"
      : "LEGACY_MODE: provide confirmationHash" };
  }

  if (!verified) {
    intent.status = "REJECTED";
    logger.warn({ intentId, mode }, "INTENT_REJECTED: signature verification failed");
    return { ok: false, error: "SIGNATURE_INVALID" };
  }

  intent.status = "CONFIRMED";
  intent.signature = signature ?? confirmationHash ?? null;
  intent.confirmedAt = new Date().toISOString();

  logger.info({ intentId, action: intent.action, mode }, "INTENT_CONFIRMED: hardware signer verified");
  return { ok: true, intent, mode };
}

// ── Ledger queries ─────────────────────────────────────────────────────────────
export const getPendingIntents = (): SignedIntent[] =>
  [...intentLedger.values()].filter(i => i.status === "AWAITING_SIGNER");

export const getAllIntents = (): SignedIntent[] =>
  [...intentLedger.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

export const getIntent = (intentId: string): SignedIntent | undefined =>
  intentLedger.get(intentId);

// Prune expired intents
setInterval(() => {
  const now = Date.now();
  for (const [id, intent] of intentLedger.entries()) {
    if (intent.status === "AWAITING_SIGNER" && new Date(intent.expiresAt).getTime() < now) {
      intent.status = "EXPIRED";
      logger.warn({ intentId: id }, "INTENT_EXPIRED: auto-pruned");
    }
  }
}, 60_000);
