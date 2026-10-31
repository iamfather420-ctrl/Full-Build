import { createPublicKey } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { computeSha256 } from '../database/DatabaseSchema';
import { HumanApprovalGate } from '../governance/HumanApprovalGate';

export function assertPublicEd25519(pem: string): string {
  if (typeof pem !== 'string' || pem.includes('PRIVATE KEY') || pem.includes('private key')) {
    throw new Error('BLOCKED: a private key cannot be installed.');
  }
  const key = createPublicKey(pem);
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error('BLOCKED: human root must be an Ed25519 public key.');
  }
  const exported = key.export({ type: 'spki', format: 'pem' }).toString();
  if (exported.includes('PRIVATE KEY')) throw new Error('BLOCKED: a private key cannot be installed.');
  return exported;
}

/** Writes only a verified Ed25519 public key. It does not accept or store a private key. */
export function installHumanRootPublicKey(pem: string, destination: string): { pem: string; fingerprint: string } {
  const exported = assertPublicEd25519(pem);
  writeFileSync(destination, exported, { mode: 0o644 });
  return { pem: exported, fingerprint: computeSha256(exported) };
}

export function loadInstalledHumanRoot(path: string): { gate: HumanApprovalGate; fingerprint: string; pem: string } {
  const pem = assertPublicEd25519(readFileSync(path, 'utf8'));
  return { gate: new HumanApprovalGate(pem), fingerprint: computeSha256(pem), pem };
}
