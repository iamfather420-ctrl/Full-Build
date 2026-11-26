import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

/** Identity of the fine-tuned GGUF produced by bridge run 45838556506. */
export const VERIFIED_DAISY_GGUF = {
  release: 'daisy-model-45661493760',
  trainingRunId: '45661493760',
  bridgeRunId: '45838556506',
  sha256: 'd158c64ff056f3c76fbbc6f4824c53e5ffd5de94931f71db5a418cb1df9e50fd',
  bytes: 105454176,
  quantization: 'Q4_K_M',
  datasetSha256: '79a9c60a64357713b98c90f1bffc82066f0b48cb3cc2b9e155cdd6229845a6f7',
} as const;

export type ModelFileCheck =
  | { ok: true; sha256: string; bytes: number }
  | { ok: false; code: 'MISSING' | 'CHECKSUM_MISMATCH'; sha256: string | null; bytes: number | null };

export async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function verifyDaisyModelFile(filePath: string): Promise<ModelFileCheck> {
  try {
    const info = await stat(filePath);
    if (!info.isFile() || info.size <= 0) return { ok: false, code: 'MISSING', sha256: null, bytes: null };
    const digest = await sha256File(filePath);
    if (info.size !== VERIFIED_DAISY_GGUF.bytes || digest !== VERIFIED_DAISY_GGUF.sha256) {
      return { ok: false, code: 'CHECKSUM_MISMATCH', sha256: digest, bytes: info.size };
    }
    return { ok: true, sha256: digest, bytes: info.size };
  } catch {
    return { ok: false, code: 'MISSING', sha256: null, bytes: null };
  }
}
