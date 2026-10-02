/**
 * SOLVEX-CORE: HARDWARE SIGNER INTERFACE
 *
 * POST /api/signer/confirm        — hardware posts signed intent; engine verifies + resumes
 * GET  /api/signer/pending        — list all intents awaiting hardware signature
 * GET  /api/signer/intent/:id     — inspect a specific intent (includes canonical header)
 * GET  /api/signer/status         — signer interface health + verification mode
 * POST /api/signer/register-key   — register hardware public key (PEM)
 *
 * ASYMMETRIC MODE (preferred — when SOLVEX_SIGNER_PUBLIC_KEY is set):
 *   Hardware signs:  Buffer.from(header + intentId)  with local private key
 *   POST payload:    { intentId, header, signature }   (signature = hex string)
 *
 * HMAC LEGACY MODE (fallback — no public key registered):
 *   POST payload:    { intentId, confirmationHash }
 *   confirmationHash = SHA-256(intentId:hmac:nonce)
 */

import { Router } from "express";
import {
  confirmIntent,
  getPendingIntents,
  getAllIntents,
  getIntent,
  registerSignerPublicKey,
  isAsymmetricMode,
  getSignerPublicKey,
} from "../lib/intent";
import { kernelStatus } from "../lib/heuristic-kernel";
import { getKineticState } from "../lib/kinetic";

const router = Router();

// ── Confirm intent (primary hardware endpoint) ─────────────────────────────────
router.post("/signer/confirm", async (req, res) => {
  const { intentId, header, signature, confirmationHash } = req.body;

  if (!intentId) {
    res.status(400).json({ error: "intentId required" });
    return;
  }

  // Asymmetric mode requires header + signature
  // Legacy mode requires confirmationHash
  if (!header && !signature && !confirmationHash) {
    res.status(400).json({
      error: isAsymmetricMode()
        ? "ASYMMETRIC_MODE: provide { intentId, header, signature }"
        : "LEGACY_MODE: provide { intentId, confirmationHash }",
      mode: isAsymmetricMode() ? "ASYMMETRIC" : "HMAC_LEGACY",
    });
    return;
  }

  const result = confirmIntent({ intentId, header, signature, confirmationHash });

  if (!result.ok) {
    const status = result.error === "INTENT_NOT_FOUND" ? 404
      : result.error === "INTENT_EXPIRED" ? 410
      : 422;
    res.status(status).json({ error: result.error });
    return;
  }

  res.json({ confirmed: true, mode: result.mode, intent: result.intent });
});

// ── Register hardware public key ───────────────────────────────────────────────
// One-time setup: POST the PEM public key from your cold wallet / YubiKey.
// After this, all confirmations require an asymmetric signature — HMAC fallback disabled.
router.post("/signer/register-key", (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey) { res.status(400).json({ error: "publicKey (PEM) required" }); return; }
  const result = registerSignerPublicKey(publicKey);
  if (!result.ok) { res.status(422).json({ error: result.error }); return; }
  res.json({
    registered: true,
    mode: "ASYMMETRIC",
    message: "Hardware public key registered. All future confirmations require asymmetric signature.",
  });
});

// ── Pending intents ────────────────────────────────────────────────────────────
router.get("/signer/pending", (_req, res) => {
  const pending = getPendingIntents();
  // Each pending intent includes header — hardware device signs: Buffer.from(header + intentId)
  res.json(pending);
});

// ── Full intent ledger ─────────────────────────────────────────────────────────
router.get("/signer/intents", (_req, res) => {
  res.json(getAllIntents());
});

// ── Inspect specific intent ────────────────────────────────────────────────────
router.get("/signer/intent/:id", (req, res) => {
  const intent = getIntent(req.params.id);
  if (!intent) { res.status(404).json({ error: "Intent not found" }); return; }
  res.json(intent);
});

// ── Signer interface status ────────────────────────────────────────────────────
router.get("/signer/status", (_req, res) => {
  const pending = getPendingIntents();
  const kinetic = getKineticState();
  const pubKey = getSignerPublicKey();

  res.json({
    signerInterface: isAsymmetricMode() ? "ASYMMETRIC_ACTIVE" : "AWAITING_HARDWARE_HOOK",
    verificationMode: isAsymmetricMode() ? "ASYMMETRIC" : "HMAC_LEGACY",
    publicKeyRegistered: isAsymmetricMode(),
    publicKeyType: pubKey?.asymmetricKeyType ?? null,
    pendingIntents: pending.length,
    hardwareMode: process.env.YUBIKEY_MODE === "true" ? "YUBIKEY" : "COLD_WALLET",
    solanaNetwork: process.env.SOLANA_NETWORK ?? "devnet",
    signingProtocol: {
      dataToSign: "Buffer.from(header + intentId)",
      algorithm: pubKey?.asymmetricKeyType === "ed25519" ? "Ed25519" : "RSA-SHA256",
      signatureFormat: "hex",
      endpoint: "POST /api/signer/confirm",
      payload: "{ intentId, header, signature }",
    },
    kernel: kernelStatus(),
    kinetic: {
      status: kinetic.status,
      entropy: kinetic.entropy,
      collapseCount: kinetic.collapseCount,
    },
  });
});

export default router;
