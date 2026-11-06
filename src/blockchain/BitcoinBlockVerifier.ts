import { createHash } from 'node:crypto';
import type { BitcoinBlockVerification } from './types';

function sha256(data: Buffer): Buffer { return createHash('sha256').update(data).digest(); }
function doubleSha256(data: Buffer): Buffer { return sha256(sha256(data)); }

function readCompactSize(buffer: Buffer, offset: number): bigint {
  if (offset >= buffer.length) throw new Error('Missing transaction-count CompactSize.');
  const marker = buffer[offset];
  if (marker < 0xfd) return BigInt(marker);
  if (marker === 0xfd) {
    if (offset + 3 > buffer.length) throw new Error('Truncated CompactSize uint16.');
    return BigInt(buffer.readUInt16LE(offset + 1));
  }
  if (marker === 0xfe) {
    if (offset + 5 > buffer.length) throw new Error('Truncated CompactSize uint32.');
    return BigInt(buffer.readUInt32LE(offset + 1));
  }
  if (offset + 9 > buffer.length) throw new Error('Truncated CompactSize uint64.');
  return buffer.readBigUInt64LE(offset + 1);
}

function compactTarget(bits: number): bigint {
  const exponent = bits >>> 24;
  const mantissa = bits & 0x007fffff;
  const negative = (bits & 0x00800000) !== 0;
  if (negative || mantissa === 0 || exponent === 0) throw new Error('Invalid or negative compact proof-of-work target.');
  const target = exponent <= 3
    ? BigInt(mantissa) >> (8n * BigInt(3 - exponent))
    : BigInt(mantissa) << (8n * BigInt(exponent - 3));
  if (target <= 0n || target >= (1n << 256n)) throw new Error('Compact proof-of-work target is outside the 256-bit range.');
  return target;
}

function calculateMerkleRoot(txids: string[]): string {
  if (txids.length === 0) throw new Error('Block has no transactions.');
  let level: Buffer[] = txids.map(txid => {
    if (!/^[a-f0-9]{64}$/i.test(txid)) throw new Error('Malformed transaction ID.');
    return Buffer.from(txid, 'hex').reverse();
  });
  while (level.length > 1) {
    if (level.length % 2 === 1) level.push(Buffer.from(level[level.length - 1]));
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(doubleSha256(Buffer.concat([level[i], level[i + 1]])));
    level = next;
  }
  return Buffer.from(level[0]).reverse().toString('hex');
}

export class BitcoinBlockVerifier {
  verify(input: { height: number; expectedHash: string; rawBlockHex: string; transactionIds: string[] }): BitcoinBlockVerification {
    const errors: string[] = [];
    let headerHash = '', previousBlockHash = '', merkleRoot = '', rawBlockSha256 = '';
    let proofOfWorkValid = false, merkleRootValid = false, transactionCountValid = false;
    try {
      if (!/^[a-f0-9]+$/i.test(input.rawBlockHex) || input.rawBlockHex.length % 2 !== 0) {
        throw new Error('Raw block is not valid even-length hexadecimal data.');
      }
      const raw = Buffer.from(input.rawBlockHex, 'hex');
      if (raw.length < 81) throw new Error('Raw block is shorter than header plus transaction count.');
      const header = raw.subarray(0, 80);
      headerHash = Buffer.from(doubleSha256(header)).reverse().toString('hex');
      previousBlockHash = Buffer.from(header.subarray(4, 36)).reverse().toString('hex');
      merkleRoot = Buffer.from(header.subarray(36, 68)).reverse().toString('hex');
      rawBlockSha256 = sha256(raw).toString('hex');
      if (headerHash !== input.expectedHash.toLowerCase()) errors.push('Computed header hash does not match the node-provided block hash.');

      const target = compactTarget(header.readUInt32LE(72));
      proofOfWorkValid = BigInt(`0x${headerHash}`) <= target;
      if (!proofOfWorkValid) errors.push('Header hash does not satisfy its compact proof-of-work target.');

      transactionCountValid = readCompactSize(raw, 80) === BigInt(input.transactionIds.length);
      if (!transactionCountValid) errors.push('Raw block transaction count does not match decoded transaction IDs.');

      merkleRootValid = calculateMerkleRoot(input.transactionIds) === merkleRoot;
      if (!merkleRootValid) errors.push('Calculated transaction Merkle root does not match the header.');
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown block verification error.');
    }
    const headerHashValid = headerHash !== '' && headerHash === input.expectedHash.toLowerCase();
    return {
      height: input.height, block_hash: headerHash || input.expectedHash,
      previous_block_hash: previousBlockHash, merkle_root: merkleRoot,
      transaction_count: input.transactionIds.length, raw_block_sha256: rawBlockSha256,
      header_hash_valid: headerHashValid, proof_of_work_valid: proofOfWorkValid,
      merkle_root_valid: merkleRootValid, transaction_count_valid: transactionCountValid,
      verified: errors.length === 0, errors
    };
  }
}