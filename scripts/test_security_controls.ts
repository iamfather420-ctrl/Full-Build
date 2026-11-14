import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { IndependentModelOracle } from '../src/security/IndependentModelOracle';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IsolatedExecutionSandbox } from '../src/security/IsolatedExecutionSandbox';
import { MemorySafetyInstrumentation } from '../src/security/MemorySafetyInstrumentation';
import { PersistentProofStore } from '../src/security/PersistentProofStore';
import { TenantCrypto } from '../src/security/TenantCrypto';

async function main() {
  const root = await mkdtemp(join(tmpdir(), 'solvex-security-'));
  try {
    const tenant = new TenantCrypto('test-root-key-material-at-least-32-bytes-long');
    const encrypted = tenant.encrypt('tenant-a', 'secret-payload');
    assert.equal(tenant.decrypt('tenant-a', encrypted), 'secret-payload');
    assert.throws(() => tenant.decrypt('tenant-b', encrypted), /Cross-tenant access denied/);
    const tampered = { ...encrypted, ciphertext: Buffer.from('tampered').toString('base64') };
    assert.throws(() => tenant.decrypt('tenant-a', tampered), /Unsupported state|authenticate|unable/i);

    const proofs = new PersistentProofStore(root, 'test-proof-hmac-key-material-at-least-32-bytes');
    const saved = await proofs.put('proof-1', 'tenant-a', { verdict: 'PARTIAL', evidence: ['test'] });
    assert.equal((await proofs.get('proof-1', 'tenant-a')).payloadSha256, saved.payloadSha256);
    await assert.rejects(() => proofs.get('proof-1', 'tenant-b'));
    const proofPath = join(root, 'tenant-a', 'proof-1.proof.json');
    const envelope = JSON.parse(await readFile(proofPath, 'utf8'));
    envelope.payload.verdict = 'VERIFIED';
    await writeFile(proofPath, JSON.stringify(envelope));
    await assert.rejects(() => proofs.get('proof-1', 'tenant-a'), /integrity|tenant binding/i);

    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const oraclePayloadHash = createHash('sha256').update('oracle-test-input').digest('hex');
    const oracleFields = { oracleId: 'test-oracle', modelId: 'independent-test-model', inputSha256: oraclePayloadHash, verdict: 'ACCEPT' as const, rationaleSha256: createHash('sha256').update('rationale').digest('hex') };
    const oracleCanonical = [oracleFields.oracleId, oracleFields.modelId, oracleFields.inputSha256, oracleFields.verdict, oracleFields.rationaleSha256].join('\n');
    const attestation = { ...oracleFields, signature: sign(null, Buffer.from(oracleCanonical), privateKey).toString('base64') };
    assert.equal(IndependentModelOracle.verifyAttestation(attestation, 'test-oracle', oraclePayloadHash, publicKey.export({ type: 'spki', format: 'pem' }).toString()), true);
    assert.equal(IndependentModelOracle.verifyAttestation({ ...attestation, verdict: 'REJECT' }, 'test-oracle', oraclePayloadHash, publicKey.export({ type: 'spki', format: 'pem' }).toString()), false);

    const snapshot = await MemorySafetyInstrumentation.snapshot(512 * 1024 * 1024);
    assert.equal(typeof snapshot.rssBytes, 'number');
    assert.equal(typeof snapshot.withinLimit, 'boolean');
    assert.equal(typeof snapshot.instrumentationAvailable, 'boolean');
    assert.equal(snapshot.instrumentationAvailable, true, 'process memory metrics must be available even when the host has no finite cgroup cap');
    assert.ok(snapshot.rssBytes > 0);
    assert.ok(snapshot.heapUsedBytes >= 0 && snapshot.heapUsedBytes <= snapshot.heapLimitBytes);
    assert.ok(snapshot.maxRssBytes > 0);
    assert.equal(typeof snapshot.cgroupInstrumentationAvailable, 'boolean');

    await assert.rejects(
      () => IsolatedExecutionSandbox.execute('node:latest', ['/bin/true'], ''),
      /pinned by immutable sha256 digest/
    );
    console.log('Security controls tests passed: tenant AAD isolation, proof integrity/tamper detection, memory telemetry, Ed25519 oracle signature validation, and sandbox digest pinning.');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
