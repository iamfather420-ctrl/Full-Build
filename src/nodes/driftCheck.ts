import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const DRIFT_CANONICAL_SHA256 = 'b95eccf4237b98f3dbbbee7c2d0cfaad786518fccea1c6109dad1c4da1056779';

export function sha256(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function compareToCanonical(bytes: Buffer, expectedSha256: string): { matches: boolean; observedSha256: string } {
  const observedSha256 = sha256(bytes);
  return { matches: observedSha256 === expectedSha256.toLowerCase(), observedSha256 };
}

export function readCanonicalFixture(path: string): Buffer {
  return readFileSync(path);
}
