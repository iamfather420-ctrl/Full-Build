import { createPublicKey, verify } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const APPROVAL_SCHEMA = "daisy-source-approval/v1";
export const REQUIRED_SCOPE = "source-text-training";
export const REQUIRED_TENANT = "iamfather420-ctrl/Full-Build";
const COLLECTION_ID = "loc-english-grammar-six-books";

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, sortValue(value[k])]));
  return value;
}
export function canonicalApprovalBytes(record) {
  const { signature, ...unsigned } = record ?? {};
  return Buffer.from(JSON.stringify(sortValue(unsigned)));
}
function loadKeys(trustDir) {
  let files = [];
  try { files = readdirSync(trustDir).filter(name => name.endsWith(".spki.pem")); } catch { return new Map(); }
  const keys = new Map();
  for (const file of files) {
    try {
      const key = createPublicKey(readFileSync(path.join(trustDir, file), "utf8"));
      if (key.asymmetricKeyType === "ed25519") keys.set(file.slice(0, -".spki.pem".length), key);
    } catch { /* malformed trust material is ignored; missing trusted key fails closed */ }
  }
  return keys;
}
function signatureValid(record, keys) {
  const key = keys.get(record.keyId);
  if (!key || typeof record.signature !== "string" || !record.signature.trim()) return false;
  try { return verify(null, canonicalApprovalBytes(record), key, Buffer.from(record.signature, "base64")); } catch { return false; }
}
function validTime(record, now) {
  const issued = Date.parse(record.issuedAt), expires = Date.parse(record.expiresAt);
  return Number.isFinite(issued) && Number.isFinite(expires) && issued <= now.getTime() + 300000 && expires > now.getTime();
}

/**
 * Verifies a complete six-book approval set. No aggregate collection flag,
 * JSONL boolean, or LOC boilerplate is accepted as an approval.
 */
export function verifyBookApprovals({ provenancePath, approvalsPath, trustDir, now = new Date() }) {
  let provenance, packet;
  try { provenance = JSON.parse(readFileSync(provenancePath, "utf8")); } catch { return { ok: false, reason: "LOC provenance manifest is missing or malformed." }; }
  try { packet = JSON.parse(readFileSync(approvalsPath, "utf8")); } catch { return { ok: false, reason: "Per-book approval packet is missing or malformed." }; }
  if (!Array.isArray(provenance.sources) || provenance.sources.length !== 6 || provenance.training_eligible !== false) {
    return { ok: false, reason: "LOC provenance must contain exactly six sources and remain globally non-eligible." };
  }
  if (!packet || packet.schema !== "daisy-source-approval-packet/v1" || packet.collectionId !== COLLECTION_ID
    || packet.tenant !== REQUIRED_TENANT || !Array.isArray(packet.approvals) || !Array.isArray(packet.revocations)) {
    return { ok: false, reason: "Per-book approval packet schema or binding is invalid." };
  }
  const keys = loadKeys(trustDir);
  if (!keys.size) return { ok: false, reason: "Trusted source-approval verification key is unavailable." };
  const expected = new Map();
  for (const source of provenance.sources) {
    const id = String(source.item_id ?? "");
    const digest = String(source.text_sha256 ?? "").toLowerCase();
    if (!id || !/^[a-f0-9]{64}$/.test(digest) || expected.has(id)) return { ok: false, reason: "LOC provenance contains a duplicate or malformed source identity/digest." };
    expected.set(id, digest);
  }
  if (expected.size !== 6) return { ok: false, reason: "Exactly six unique LOC source identities are required." };
  const counts = new Map();
  for (const approval of packet.approvals) {
    if (!approval || typeof approval !== "object") return { ok: false, reason: "Malformed per-book approval record." };
    const id = String(approval.sourceId ?? "");
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (!expected.has(id)) return { ok: false, reason: "Approval contains an unknown LOC sourceId." };
  }
  for (const [id, digest] of expected) {
    if (counts.get(id) !== 1) return { ok: false, reason: `LOC book ${id} must have exactly one approval; found ${counts.get(id) ?? 0}.` };
    const record = packet.approvals.find(item => item.sourceId === id);
    if (record.schema !== APPROVAL_SCHEMA || record.documentId !== `loc-book-${id}`) return { ok: false, reason: `LOC book ${id} approval document identity is invalid.` };
    if (record.sourceSha256 !== digest) return { ok: false, reason: `LOC book ${id} source digest does not match the pinned provenance manifest.` };
    if (record.scope !== REQUIRED_SCOPE || record.tenant !== REQUIRED_TENANT) return { ok: false, reason: `LOC book ${id} approval scope or tenant is invalid.` };
    if (typeof record.approver !== "string" || !record.approver.trim() || !validTime(record, now)) return { ok: false, reason: `LOC book ${id} approver or validity period is invalid.` };
    if (!signatureValid(record, keys)) return { ok: false, reason: `LOC book ${id} approval signature is missing, forged, or untrusted.` };
    for (const revocation of packet.revocations) {
      if (!revocation || revocation.schema !== "daisy-source-revocation/v1") continue;
      if (!signatureValid(revocation, keys)) continue;
      if (revocation.documentId === record.documentId && revocation.sourceSha256 === digest
        && revocation.tenant === REQUIRED_TENANT && Date.parse(revocation.revokedAt) <= now.getTime()) {
        return { ok: false, reason: `LOC book ${id} approval is revoked.` };
      }
    }
  }
  return { ok: true, reason: null, approvedSourceIds: [...expected.keys()].sort() };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const read = flag => { const i = process.argv.indexOf(flag); return i < 0 ? "" : process.argv[i + 1] ?? ""; };
  const result = verifyBookApprovals({ provenancePath: read("--provenance"), approvalsPath: read("--approvals"), trustDir: read("--trust"), now: read("--now") ? new Date(read("--now")) : new Date() });
  if (!result.ok) { process.stderr.write(result.reason + "\n"); process.exit(2); }
  process.stdout.write(JSON.stringify(result) + "\n");
}
