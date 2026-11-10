import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PersistentProofStore } from '../src/security/PersistentProofStore';

async function main() {
  const store = new PersistentProofStore();
  const proofId = 'ci-' + randomUUID();
  const tenantA = 'tenant-enterprise-demo';
  const payload = {
    kind: 'durable-proof-store-integration',
    nonce: randomUUID(),
    createdAt: new Date().toISOString(),
    nested: { verified: true, count: 3 }
  };

  const written = await store.put(proofId, tenantA, payload);
  assert.equal(written.proofId, proofId);
  assert.equal(written.tenantId, tenantA);
  assert.equal(written.payloadSha256.length, 64);
  assert.equal(written.hmacSha256.length, 64);

  const readBack = await store.get(proofId, tenantA);
  assert.deepEqual(readBack.payload, payload);
  assert.equal(readBack.payloadSha256, written.payloadSha256);
  assert.equal(readBack.hmacSha256, written.hmacSha256);

  // Object keys are tenant-prefixed; another tenant cannot read this proof.
  await assert.rejects(
    () => store.get(proofId, 'tenant-isolation-test-b'),
    /not found|read failed|tenant binding/i
  );

  console.log(JSON.stringify({
    passed: true,
    writeReadback: true,
    payloadDigestVerified: true,
    hmacVerified: true,
    crossTenantReadDenied: true,
    proofId
  }));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
