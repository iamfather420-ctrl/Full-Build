import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface EvidenceSeal {
  schema: 'SOLVEX_SEALED_EVIDENCE_V1';
  version: string;
  sha256: string;
  bytes: number;
  immutable: true;
}

interface SealIndex {
  schema: 'SOLVEX_SEAL_INDEX_V1';
  versions: Record<string, EvidenceSeal>;
}

const ROOT = '/workspace/artifacts/evidence/lifecycle';
const INDEX_PATH = join(ROOT, 'index.json');

function hashBytes(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function readIndex(): SealIndex {
  if (!existsSync(INDEX_PATH)) return { schema: 'SOLVEX_SEAL_INDEX_V1', versions: {} };
  return JSON.parse(readFileSync(INDEX_PATH, 'utf8')) as SealIndex;
}

/** Writes a version once. A different byte string for the same version is refused. */
export function sealEvidence(version: string, bytes: Buffer): EvidenceSeal {
  if (!/^[a-z0-9][a-z0-9.-]{0,63}$/.test(version)) throw new Error('BLOCKED: evidence version is not a stable identifier.');
  const sha256 = hashBytes(bytes);
  const index = readIndex();
  const prior = index.versions[version];
  if (prior && prior.sha256 !== sha256) throw new Error(`BLOCKED: ${version} is immutable and already sealed as ${prior.sha256}.`);
  const path = join(ROOT, version, `${sha256}.json`);
  if (!prior) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
    index.versions[version] = { schema: 'SOLVEX_SEALED_EVIDENCE_V1', version, sha256, bytes: bytes.length, immutable: true };
    mkdirSync(ROOT, { recursive: true });
    writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  }
  return index.versions[version];
}

export function loadSealedEvidence(version: string): { seal: EvidenceSeal; bytes: Buffer } {
  const index = readIndex();
  const seal = index.versions[version];
  if (!seal) throw new Error(`BLOCKED: ${version} has no sealed evidence.`);
  const bytes = readFileSync(join(ROOT, version, `${seal.sha256}.json`));
  if (hashBytes(bytes) !== seal.sha256) throw new Error(`BLOCKED: sealed evidence ${version} was modified after sealing.`);
  return { seal, bytes };
}
