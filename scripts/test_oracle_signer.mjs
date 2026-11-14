import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const root = await mkdtemp(join(tmpdir(), 'solvex-oracle-signer-'));
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const keyPath = join(root, 'oracle.pem');
await writeFile(keyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
const port = 19000 + Math.floor(Math.random() * 1000);
const token = 'test-only-signer-token-that-is-long-enough';
const oracleId = 'test-solvex-oracle';
const child = spawn(process.execPath, ['oracle-signer/server.mjs'], {
  env: { ...process.env, PORT: String(port), SOLVEX_ORACLE_SIGNER_TOKEN: token,
    SOLVEX_ORACLE_ID: oracleId, SOLVEX_ORACLE_ED25519_PRIVATE_KEY_FILE: keyPath },
  stdio: 'ignore'
});
try {
  let ready = false;
  for (let i = 0; i < 50 && !ready; i++) {
    try { ready = (await fetch(`http://127.0.0.1:${port}/healthz`)).ok; } catch {}
    if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, 'signer should start with valid Ed25519 key and configuration');
  const payload = {
    protocol: 'solvex-openai-attestation-v1', oracleId, modelId: 'test-model',
    inputSha256: 'a'.repeat(64), verdict: 'ACCEPT', rationaleSha256: 'b'.repeat(64)
  };
  const unauthorized = await fetch(`http://127.0.0.1:${port}/attest`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
  });
  assert.equal(unauthorized.status, 401);
  const invalid = await fetch(`http://127.0.0.1:${port}/attest`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, inputSha256: 'bad' })
  });
  assert.equal(invalid.status, 400);
  const response = await fetch(`http://127.0.0.1:${port}/attest`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(response.status, 200);
  const attestation = await response.json();
  const canonical = [attestation.oracleId, attestation.modelId, attestation.inputSha256,
    attestation.verdict, attestation.rationaleSha256].join('\n');
  assert.equal(verify(null, Buffer.from(canonical), publicKey, Buffer.from(attestation.signature, 'base64')), true);
  assert.equal(attestation.inputSha256, payload.inputSha256);
  console.log('Stage 14 signer tests passed: startup, bearer auth, payload validation, Ed25519 signature and input binding.');
} finally {
  child.kill('SIGTERM');
  await rm(root, { recursive: true, force: true });
}
