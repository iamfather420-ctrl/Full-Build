import { createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const SCHEMA = "daisy-training-authorization/v1";

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}

export function canonicalBytes(record) {
  const { signature, ...rest } = record ?? {};
  return Buffer.from(JSON.stringify(sortValue(rest)));
}

function loadTrustKeys(trustDir) {
  let names = [];
  try { names = readdirSync(trustDir).filter((name) => name.endsWith(".spki.pem")); } catch { return new Map(); }
  const keys = new Map();
  for (const name of names) {
    const pem = readFileSync(path.join(trustDir, name), "utf8");
    const key = createPublicKey(pem);
    if (key.asymmetricKeyType !== "ed25519") continue;
    keys.set(name.slice(0, -".spki.pem".length), key);
  }
  return keys;
}

function signedByTrustedKey(record, keys) {
  const key = keys.get(record.keyId);
  if (!key || typeof record.signature !== "string" || !record.signature.trim()) return false;
  try { return verify(null, canonicalBytes(record), key, Buffer.from(record.signature, "base64")); }
  catch { return false; }
}

export function verifyAuthorization({ authorization, trustDir, trustKeys, expected, now = new Date(), revocations = [] }) {
  const keys = trustKeys ?? loadTrustKeys(trustDir ?? "");
  if (!keys || keys.size === 0) return "Trusted verification key is unavailable.";
  if (!authorization || typeof authorization !== "object") return "No cryptographic training authorization is present.";
  if (authorization.schema !== SCHEMA) return "Authorization schema is invalid.";
  if (!signedByTrustedKey(authorization, keys)) return "Authorization signature is forged or untrusted.";
  if (authorization.scope !== "optimizer-update") return "Authorization scope does not permit an optimizer update.";
  if (authorization.documentId !== expected.documentId) return "Authorization document id does not match.";
  if (authorization.sourceSha256 !== expected.sourceSha256) return "Authorization source digest does not match.";
  if (authorization.tenant !== expected.tenant) return "Authorization tenant or actor is not allowed.";
  if (typeof authorization.approver !== "string" || !authorization.approver.trim()) return "Authorization approver is missing.";
  const issued = Date.parse(authorization.issuedAt);
  const expires = Date.parse(authorization.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expires)) return "Authorization timestamp is invalid.";
  if (issued > now.getTime() + 5 * 60 * 1000) return "Authorization issued timestamp is invalid.";
  if (expires <= now.getTime()) return "Authorization is expired.";
  for (const revocation of revocations) {
    if (!revocation || revocation.schema !== "daisy-training-revocation/v1") continue;
    if (!signedByTrustedKey(revocation, keys)) continue;
    if (revocation.documentId !== expected.documentId || revocation.sourceSha256 !== expected.sourceSha256) continue;
    if (Date.parse(revocation.revokedAt) <= now.getTime()) return "Authorization is revoked.";
  }
  return null;
}

export function verifyGateFile(gatePath, trustDir, now = new Date()) {
  let payload;
  try { payload = JSON.parse(readFileSync(gatePath, "utf8")); }
  catch { return "Learning-engine gate is missing."; }
  const authorization = payload?.authorization ?? null;
  return verifyAuthorization({
    authorization,
    trustDir,
    expected: {
      documentId: authorization?.documentId,
      sourceSha256: authorization?.sourceSha256,
      tenant: authorization?.tenant,
    },
    now,
    revocations: payload?.revocations ?? [],
  });
}

export function guardedOptimizerStep(check, optimize) {
  const reason = check();
  if (reason) return reason;
  optimize();
  return null;
}

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? "" : process.argv[index + 1] ?? "";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const gate = readArg("--gate");
  const trust = readArg("--trust");
  const reason = verifyGateFile(gate, trust, readArg("--now") ? new Date(readArg("--now")) : new Date());
  if (reason) {
    process.stderr.write(`${reason}\n`);
    process.exit(2);
  }
}

export function signRecord(record, privateKey) {
  return sign(null, canonicalBytes(record), privateKey).toString("base64");
}

export function ephemeralTrustKey(keyId = "test-root") {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const keys = new Map([[keyId, publicKey]]);
  return { keyId, publicKey, privateKey, keys };
}
