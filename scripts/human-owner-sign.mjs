#!/usr/bin/env node
/**
 * Human-owner signing ceremony.
 * This process is not Daisy. It never imports the runtime, and it deletes
 * the private key before printing the public approval artifact.
 */
import { createHash, createPrivateKey, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const capabilityId = args.get('--capability-id');
const version = Number(args.get('--version'));
const contentSha = args.get('--sha256');
const statement = args.get('--statement');
if (!capabilityId || !Number.isInteger(version) || version < 1 || !/^[a-f0-9]{64}$/.test(contentSha ?? '') || !statement) {
  process.stderr.write('usage: human-owner-sign.mjs --capability-id ID --version N --sha256 HEX --statement TEXT\n');
  process.exit(2);
}

const keyPath = `/tmp/solvex-human-owner-${randomBytes(8).toString('hex')}.pem`;
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
    try {
      writeFileSync(keyPath, Buffer.alloc(privatePem.length, 0), { mode: 0o600 });
    } catch {
      // The key may already have been removed.
    }
    privatePem = '';
  }
  try {
    unlinkSync(keyPath);
  } catch {
    // Already gone.
  }
}

try {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  if (keyPath.startsWith('/workspace') || publicKeyPem.includes('PRIVATE KEY')) {
    throw new Error('refusing to place a private key inside the repository');
  }
  writeFileSync(keyPath, privatePem, { mode: 0o600 });

  const now = Date.now();
  const sessionNonce = randomBytes(16).toString('hex');
  const approvalNonce = randomBytes(16).toString('hex');
  const sessionClaims = {
    typ: 'solvex-human-session-v1',
    user_id: 'external-human-owner',
    tenant_id: 'external-human-root',
    email: 'owner@external-human-root',
    role: 'OWNER',
    issued_at: now,
    expires_at: now + 10 * 60 * 1000,
    nonce: sessionNonce,
    audience: 'solvex-approval',
  };
  const approvalClaims = {
    typ: 'solvex-human-approval-v1',
    capability_id: capabilityId,
    version,
    content_sha256: contentSha,
    approver_user_id: 'external-human-owner',
    session_nonce: sessionNonce,
    approval_nonce: approvalNonce,
    statement_sha256: createHash('sha256').update(statement).digest('hex'),
    issued_at: now,
    expires_at: now + 10 * 60 * 1000,
  };
  const session = { claims: sessionClaims, signature: signClaims(sessionClaims) };
  const approval = { claims: approvalClaims, signature: signClaims(approvalClaims) };
  destroyPrivateKey();
  const artifact = {
    publicKeyPem,
    session,
    approval,
    statement,
    private_key_path: keyPath,
    private_key_deleted: !existsSync(keyPath),
    private_key_outside_repository: !keyPath.startsWith('/workspace'),
  };
  const encoded = JSON.stringify(artifact);
  if (encoded.includes('PRIVATE KEY')) throw new Error('public artifact contained private key material');
  process.stdout.write(encoded);
} catch (error) {
  destroyPrivateKey();
  process.stderr.write(`${error instanceof Error ? error.message : 'sign failed'}\n`);
  process.exit(1);
} finally {
  destroyPrivateKey();
}
