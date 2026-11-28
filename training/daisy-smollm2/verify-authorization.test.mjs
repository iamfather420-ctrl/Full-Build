import assert from "node:assert/strict";
import test from "node:test";
import { ephemeralTrustKey, guardedOptimizerStep, signRecord, verifyAuthorization, verifyGateFile } from "./verify-authorization.mjs";

const NOW = new Date("2026-11-27T18:00:00.000Z");
const EXPECTED = {
  documentId: "31022301",
  sourceSha256: "3a466bbe1e6df1c3dbb16ec1c222ffb16e9d799253069702b863b795c15b36d6",
  tenant: "iamfather420-ctrl/Full-Build",
};

function signedAuth(privateKey, keyId, patch = {}) {
  const record = {
    schema: "daisy-training-authorization/v1",
    documentId: EXPECTED.documentId,
    sourceSha256: EXPECTED.sourceSha256,
    scope: "optimizer-update",
    approver: "Solvex-Paradox-Box",
    keyId,
    tenant: EXPECTED.tenant,
    issuedAt: "2026-11-27T00:00:00.000Z",
    expiresAt: "2026-12-27T00:00:00.000Z",
    ...patch,
  };
  record.signature = signRecord(record, privateKey);
  return record;
}

test("missing trust root, unsigned gate, and missing gate never reach the optimizer", () => {
  let calls = 0;
  const optimize = () => { calls += 1; };
  assert.equal(guardedOptimizerStep(() => verifyAuthorization({ authorization: null, trustKeys: new Map(), expected: EXPECTED, now: NOW }), optimize), "Trusted verification key is unavailable.");
  assert.match(verifyGateFile("/tmp/does-not-exist-gate.json", "/tmp/does-not-exist-trust"), /missing/);
  assert.equal(calls, 0);
});

test("blocked, forged, expired, revoked, and mismatched authorizations do not update weights", () => {
  const trusted = ephemeralTrustKey("training-root");
  const stranger = ephemeralTrustKey("stranger");
  const valid = signedAuth(trusted.privateKey, trusted.keyId);
  let calls = 0;
  const optimize = () => { calls += 1; };
  const check = (authorization, revocations = [], expected = EXPECTED) => guardedOptimizerStep(
    () => verifyAuthorization({ authorization, trustKeys: trusted.keys, expected, now: NOW, revocations }),
    optimize,
  );
  assert.match(check(signedAuth(stranger.privateKey, trusted.keyId)), /forged or untrusted/);
  assert.match(check({ ...valid, signature: "" }), /forged or untrusted/);
  assert.match(check(signedAuth(trusted.privateKey, trusted.keyId, { expiresAt: "2020-01-01T00:00:00.000Z" })), /expired/);
  const revocation = {
    schema: "daisy-training-revocation/v1",
    documentId: EXPECTED.documentId,
    sourceSha256: EXPECTED.sourceSha256,
    keyId: trusted.keyId,
    tenant: EXPECTED.tenant,
    revokedAt: "2026-11-27T12:00:00.000Z",
  };
  revocation.signature = signRecord(revocation, trusted.privateKey);
  assert.equal(verifyAuthorization({ authorization: valid, trustKeys: trusted.keys, expected: EXPECTED, now: NOW, revocations: [] }), null);
  assert.match(check(valid, [revocation]), /revoked/);
  assert.match(check(valid, [], { ...EXPECTED, sourceSha256: "a".repeat(64) }), /source digest/);
  assert.match(check(valid, [], { ...EXPECTED, documentId: "other-document" }), /document id/);
  assert.match(check(valid, [], { ...EXPECTED, tenant: "unauthorized-actor" }), /tenant or actor/);
  assert.equal(calls, 0);
});

test("a signature is accepted only for the immediate optimizer call", () => {
  const trusted = ephemeralTrustKey("training-root");
  const valid = signedAuth(trusted.privateKey, trusted.keyId);
  let calls = 0;
  const reason = guardedOptimizerStep(
    () => verifyAuthorization({ authorization: valid, trustKeys: trusted.keys, expected: EXPECTED, now: NOW }),
    () => { calls += 1; },
  );
  assert.equal(reason, null);
  assert.equal(calls, 1);
});

test("the installed learning-engine gate is not a trusted authorization", () => {
  const reason = verifyGateFile(
    new URL("../../sources/loc-english-grammar-source-collection/manifests/learning-engine-gate-2026-11-27.json", import.meta.url),
    new URL("./trust-root/", import.meta.url),
    NOW,
  );
  assert.equal(reason, "Trusted verification key is unavailable.");
});
