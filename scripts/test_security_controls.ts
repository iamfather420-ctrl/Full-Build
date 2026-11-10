import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { IndependentModelOracle } from '../src/security/IndependentModelOracle';
import { IsolatedExecutionSandbox } from '../src/security/IsolatedExecutionSandbox';
import { MemorySafetyInstrumentation } from '../src/security/MemorySafetyInstrumentation';
import { PersistentProofStore } from '../src/security/PersistentProofStore';
import { TenantCrypto } from '../src/security/TenantCrypto';

async function main() {
    const tenant = new TenantCrypto('test-root-key-material-at-least-32-bytes-long');
    const encrypted = tenant.encrypt('tenant-a', 'secret-payload');
    assert.equal(tenant.decrypt('tenant-a', encrypted), 'secret-payload');
    assert.throws(() => tenant.decrypt('tenant-b', encrypted), /Cross-tenant access denied/);
    const tampered = { ...encrypted, ciphertext: Buffer.from('tampered').toString('base64') };
    assert.throws(() => tenant.decrypt('tenant-a', tampered), /Unsupported state|authenticate|unable/i);

    const storageConfigured = Boolean(process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION && process.env.SOLVEX_PROOF_BUCKET && process.env.SOLVEX_PROOF_HMAC_KEY);
    if (storageConfigured) {
      const proofs = new PersistentProofStore();
      const saved = await proofs.put('security-controls-proof-1', 'tenant-enterprise-demo', { verdict: 'PARTIAL', evidence: ['test'] });
      assert.equal((await proofs.get('security-controls-proof-1', 'tenant-enterprise-demo')).payloadSha256, saved.payloadSha256);
      await assert.rejects(() => proofs.get('security-controls-proof-1', 'tenant-isolation-test-b'));
    } else {
      assert.throws(() => new PersistentProofStore(), /requires the branch-scoped Neon S3 environment/);
    }

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

    await assert.rejects(
      () => IsolatedExecutionSandbox.execute('node:latest', ['/bin/true'], ''),
      /pinned by immutable sha256 digest/
    );
    console.log('Security controls tests passed: tenant AAD isolation, proof storage fail-closed/readback, memory telemetry, Ed25519 oracle signature validation, and sandbox digest pinning.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
