#!/usr/bin/env node
/**
 * Sandbox operator signing. This process is not Daisy. The private key is
 * deleted before the public artifact is printed.
 */
import { createHash, createPrivateKey, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const capabilityId = args.get('--capability-id');
const version = Number(args.get('--version'));
const contentSha = args.get('--sha256');
const statement = args.get('--statement');
const integrationStatement = args.get('--integration-statement');
if (!capabilityId || !Number.isInteger(version) || version < 1 || !/^[a-f0-9]{64}$/.test(contentSha ?? '') || !statement || !integrationStatement) {
  process.stderr.write('usage: operator-rehearsal-sign.mjs --capability-id ID --version N --sha256 HEX --statement TEXT --integration-statement TEXT\n');
  process.exit(2);
}

const keyPath = `/tmp/solvex-operator-${randomBytes(8).toString('hex')}.pem`;
let privatePem = '';

function canonical(value) {
  const ordered = {};
  for (const key of Object.keys(value).sort()) ordered[key] = value[key];
  return Buffer.from(JSON.stringify(ordered));
}

function signClaims(claims) {
  return sign(null, canonical(claims), createPrivateKey(privatePem)).toString('base64');
}

function destroyPrivateKey() {
  if (privatePem) {
    try { writeFileSync(keyPath, Buffer.alloc(privatePem.length, 0), { mode: 0o600 }); } catch { /* already removed */ }
    privatePem = '';
  }
  try { unlinkSync(keyPath); } catch { /* already removed */ }
}

try {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  if (keyPath.startsWith('/workspace') || publicKeyPem.includes('PRIVATE KEY')) throw new Error('refusing to place a private key inside the repository');
  writeFileSync(keyPath, privatePem, { mode: 0o600 });
  const now = Date.now();
  const candidateNonce = randomBytes(16).toString('hex');
  const integrationNonce = randomBytes(16).toString('hex');
  const candidateClaims = {
    typ: 'solvex-sandbox-candidate-v1',
    capability_id: capabilityId,
    version,
    content_sha256: contentSha,
    operator_id: 'sandbox-operator',
    nonce: candidateNonce,
    issued_at: now,
    expires_at: now + 10 * 60 * 1000,
    environment: 'sandbox',
    production: 'false',
    statement_sha256: createHash('sha256').update(statement).digest('hex'),
  };
  const integrationClaims = {
    typ: 'solvex-sandbox-integration-v1',
    procedure: 'SANDBOX_INTEGRATION_REHEARSAL_V1',
    capability_id: capabilityId,
    version,
    content_sha256: contentSha,
    operator_id: 'sandbox-operator',
    candidate_nonce: candidateNonce,
    nonce: integrationNonce,
    issued_at: now,
    expires_at: now + 10 * 60 * 1000,
    environment: 'sandbox',
    production: 'false',
    production_credentials: 'false',
    statement_sha256: createHash('sha256').update(integrationStatement).digest('hex'),
  };
  const candidate = { claims: candidateClaims, signature: signClaims(candidateClaims) };
  const integration = { claims: integrationClaims, signature: signClaims(integrationClaims) };
  destroyPrivateKey();
  const encoded = JSON.stringify({
    publicKeyPem,
    candidate,
    integration,
    private_key_path: keyPath,
    private_key_deleted: !existsSync(keyPath),
    private_key_outside_repository: !keyPath.startsWith('/workspace'),
  });
  if (encoded.includes('PRIVATE KEY') || candidate.signature === integration.signature) throw new Error('public artifact was not separable from the private key');
  process.stdout.write(encoded);
} catch (error) {
  destroyPrivateKey();
  process.stderr.write(`${error instanceof Error ? error.message : 'sign failed'}\n`);
  process.exit(1);
} finally {
  destroyPrivateKey();
}
