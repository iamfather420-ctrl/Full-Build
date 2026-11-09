import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface PersistedProofEnvelope { schema: 1; proofId: string; tenantId: string; createdAt: string; payload: unknown; payloadSha256: string; hmacSha256: string; }
export class PersistentProofStore {
  constructor(private readonly directory = process.env.SOLVEX_PROOF_DIR ?? '', private readonly key = process.env.SOLVEX_PROOF_HMAC_KEY ?? '') {
    if (!directory || !key || Buffer.byteLength(key) < 32) throw new Error('Persistent proof storage requires SOLVEX_PROOF_DIR and a 32-byte SOLVEX_PROOF_HMAC_KEY.');
  }
  async put(proofId: string, tenantId: string, payload: unknown): Promise<PersistedProofEnvelope> {
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(proofId) || !/^[a-zA-Z0-9._-]{1,128}$/.test(tenantId)) throw new Error('Invalid proof or tenant identifier.');
    const body = JSON.stringify(payload);
    const payloadSha256 = createHash('sha256').update(body).digest('hex');
    const unsigned = { schema: 1 as const, proofId, tenantId, createdAt: new Date().toISOString(), payload, payloadSha256 };
    const hmacSha256 = createHmac('sha256', this.key).update(JSON.stringify(unsigned)).digest('hex');
    const envelope: PersistedProofEnvelope = { ...unsigned, hmacSha256 };
    const path = join(this.directory, tenantId, proofId + '.proof.json');
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temp = path + '.' + process.pid + '.tmp';
    const handle = await open(temp, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(envelope)); await handle.sync(); } finally { await handle.close(); }
    await rename(temp, path);
    const dir = await open(dirname(path), 'r'); try { await dir.sync(); } finally { await dir.close(); }
    return envelope;
  }
  async get(proofId: string, tenantId: string): Promise<PersistedProofEnvelope> {
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(proofId) || !/^[a-zA-Z0-9._-]{1,128}$/.test(tenantId)) throw new Error('Invalid proof or tenant identifier.');
    const path = join(this.directory, tenantId, proofId + '.proof.json');
    const envelope = JSON.parse(await readFile(path, 'utf8')) as PersistedProofEnvelope;
    const { hmacSha256, ...unsigned } = envelope;
    const digest = createHash('sha256').update(JSON.stringify(envelope.payload)).digest('hex');
    const expected = createHmac('sha256', this.key).update(JSON.stringify(unsigned)).digest('hex');
    if (digest !== envelope.payloadSha256 || !/^[a-f0-9]{64}$/.test(hmacSha256) ||
        !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hmacSha256, 'hex')) ||
        envelope.tenantId !== tenantId || envelope.proofId !== proofId) throw new Error('Proof integrity or tenant binding verification failed.');
    return envelope;
  }
}