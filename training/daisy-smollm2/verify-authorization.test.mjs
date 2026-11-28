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
  assert.match(verifyGateFile("/tmp/does-not-exist-gate.json", "/tmp/does-not-exist-trust", EXPECTED, NOW), /missing/);
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

test("expected identity is independent of the authorization record", () => {
  const trusted = ephemeralTrustKey("training-root");
  const swapped = signedAuth(trusted.privateKey, trusted.keyId, {
    documentId: "forged-document",
    sourceSha256: "b".repeat(64),
    tenant: "unauthorized-actor",
  });
  assert.match(verifyAuthorization({ authorization: swapped, trustKeys: trusted.keys, expected: EXPECTED, now: NOW }), /document id/);
  assert.equal(verifyGateFile("/tmp/does-not-matter.json", "/tmp/does-not-matter", null, NOW), "Independent expected document, digest, or tenant is missing.");
});

test("malformed, untrusted, expired, revoked, and modified records do not authorize an update", () => {
  const trusted = ephemeralTrustKey("training-root");
  const valid = signedAuth(trusted.privateKey, trusted.keyId);
  const modified = { ...valid, sourceSha256: "c".repeat(64) };
  const revocation = {
    schema: "daisy-training-revocation/v1",
    documentId: EXPECTED.documentId,
    sourceSha256: EXPECTED.sourceSha256,
    keyId: trusted.keyId,
    tenant: EXPECTED.tenant,
    revokedAt: "2026-11-27T12:00:00.000Z",
  };
  revocation.signature = signRecord(revocation, trusted.privateKey);
  const cases = [
    ["malformed", "not-a-record", null],
    ["malformed-schema", { ...valid, schema: "not-the-schema" }, null],
    ["malformed-time", signedAuth(trusted.privateKey, trusted.keyId, { issuedAt: "yesterday" }), null],
    ["untrusted", signedAuth(ephemeralTrustKey("other").privateKey, trusted.keyId), null],
    ["expired", signedAuth(trusted.privateKey, trusted.keyId, { expiresAt: "2020-01-01T00:00:00.000Z" }), null],
    ["revoked", valid, [revocation]],
    ["modified", modified, null],
  ];
  for (const [name, authorization, revocations] of cases) {
    let calls = 0;
    const reason = guardedOptimizerStep(
      () => verifyAuthorization({ authorization, trustKeys: trusted.keys, expected: EXPECTED, now: NOW, revocations: revocations ?? [] }),
      () => { calls += 1; },
    );
    assert.ok(reason, name);
    assert.equal(calls, 0, name);
  }
});

test("the installed learning-engine gate is not a trusted authorization", () => {
  const reason = verifyGateFile(
    new URL("../../sources/loc-english-grammar-source-collection/manifests/learning-engine-gate-2026-11-27.json", import.meta.url),
    new URL("./trust-root/", import.meta.url),
    { documentId: "loc-english-language-model-corpus", sourceSha256: "79a9c60a64357713b98c90f1bffc82066f0b48cb3cc2b9e155cdd6229845a6f7", tenant: "iamfather420-ctrl/Full-Build" },
    NOW,
  );
  assert.equal(reason, "Trusted verification key is unavailable.");
});
