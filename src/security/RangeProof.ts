import { createHash, randomBytes } from 'node:crypto';

/**
 * Pedersen bit-decomposition range proof over RFC 3526 2048-bit MODP group 14.
 * A proof is accepted only when the OR-proofs and commitment linkage check.
 * There is no boolean shortcut and no trusted production setup beyond the
 * public group and a domain-separated hash-to-subgroup generator.
 */
const P = BigInt(
  '0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF'
);
const Q = (P - 1n) / 2n;
const G = 2n;
export const RANGE_BITS = 8;
export const RANGE_EXCLUSIVE_MAX = 1n << BigInt(RANGE_BITS);

export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod <= 0n) throw new Error('invalid modulus');
  let result = 1n;
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  if (e < 0n) throw new Error('negative exponent');
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    e >>= 1n;
    b = (b * b) % mod;
  }
  return result;
}

function modInverse(value: bigint, mod: bigint): bigint {
  let a = ((value % mod) + mod) % mod;
  let b = mod;
  let x = 1n;
  let y = 0n;
  while (b !== 0n) {
    const q = a / b;
    [a, b] = [b, a - q * b];
    [x, y] = [y, x - q * y];
  }
  if (a !== 1n) throw new Error('value is not invertible');
  return (x % mod + mod) % mod;
}

function hashToSubgroup(label: string): bigint {
  const chunks: Buffer[] = [];
  let state = createHash('sha256').update(`solvex-pedersen-h:${label}`).digest();
  while (Buffer.concat(chunks).length < 512) {
    chunks.push(state);
    state = createHash('sha256').update(state).digest();
  }
  let candidate = BigInt(`0x${Buffer.concat(chunks).subarray(0, 256).toString('hex')}`) % P;
  if (candidate === 0n) candidate = 3n;
  const mapped = modPow(candidate, 2n, P);
  if (mapped <= 1n || modPow(mapped, Q, P) !== 1n) throw new Error('generator derivation failed');
  return mapped;
}

const H = hashToSubgroup('rfc3526-14-v1');
if (modPow(G, Q, P) !== 1n) throw new Error('RFC 3526 generator is not in the subgroup');

function hex(value: bigint): string {
  return value.toString(16);
}

function parseHex(value: unknown, label: string): bigint {
  if (typeof value !== 'string' || !/^[0-9a-f]+$/.test(value)) throw new Error(`${label} is not canonical hex`);
  const parsed = BigInt(`0x${value}`);
  if (parsed < 0n || parsed >= P) throw new Error(`${label} is outside the field`);
  return parsed;
}

function randomScalar(): bigint {
  let scalar = 0n;
  while (scalar === 0n) scalar = BigInt(`0x${randomBytes(32).toString('hex')}`) % Q;
  return scalar;
}

function challenge(parts: string[]): bigint {
  const digest = createHash('sha256').update(parts.join('\n'), 'utf8').digest('hex');
  let value = BigInt(`0x${digest}`) % Q;
  if (value === 0n) value = 1n;
  return value;
}

function requireSubgroup(value: bigint, label: string): void {
  if (value <= 1n || value >= P || modPow(value, Q, P) !== 1n) throw new Error(`${label} is not in the subgroup`);
}

export interface OrProof {
  a0: string;
  a1: string;
  c0: string;
  c1: string;
  s0: string;
  s1: string;
}

export interface SchnorrProof {
  a: string;
  c: string;
  s: string;
}

export interface RangeProof {
  version: 1;
  bits: number;
  statement: string;
  commitment: string;
  bitCommitments: string[];
  bitProofs: OrProof[];
  linkage: SchnorrProof;
}

function commit(value: bigint, randomness: bigint): bigint {
  return (modPow(G, value, P) * modPow(H, randomness, P)) % P;
}

function proveBit(commitment: bigint, bit: 0 | 1, randomness: bigint, statement: string, index: number): OrProof {
  const y0 = commitment;
  const y1 = (commitment * modInverse(G, P)) % P;
  const fake = bit === 0 ? 1 : 0;
  const cFake = randomScalar();
  const sFake = randomScalar();
  const yFake = fake === 0 ? y0 : y1;
  const aFake = (modPow(H, sFake, P) * modInverse(modPow(yFake, cFake, P), P)) % P;
  const w = randomScalar();
  const aReal = modPow(H, w, P);
  const a0 = bit === 0 ? aReal : aFake;
  const a1 = bit === 1 ? aReal : aFake;
  const c = challenge([
    'solvex-range-v1/bit-or',
    statement,
    String(index),
    hex(y0),
    hex(y1),
    hex(a0),
    hex(a1),
  ]);
  const cReal = (c - cFake + Q) % Q;
  const sReal = (w + cReal * randomness) % Q;
  const c0 = bit === 0 ? cReal : cFake;
  const c1 = bit === 1 ? cReal : cFake;
  const s0 = bit === 0 ? sReal : sFake;
  const s1 = bit === 1 ? sReal : sFake;
  return { a0: hex(a0), a1: hex(a1), c0: hex(c0), c1: hex(c1), s0: hex(s0), s1: hex(s1) };
}

function verifyBit(commitment: bigint, proof: OrProof, statement: string, index: number): boolean {
  const y0 = commitment;
  const y1 = (commitment * modInverse(G, P)) % P;
  const a0 = parseHex(proof.a0, 'a0');
  const a1 = parseHex(proof.a1, 'a1');
  const c0 = parseHex(proof.c0, 'c0');
  const c1 = parseHex(proof.c1, 'c1');
  const s0 = parseHex(proof.s0, 's0');
  const s1 = parseHex(proof.s1, 's1');
  if ([c0, c1, s0, s1].some((scalar) => scalar >= Q)) return false;
  requireSubgroup(a0, 'a0');
  requireSubgroup(a1, 'a1');
  const c = challenge(['solvex-range-v1/bit-or', statement, String(index), hex(y0), hex(y1), hex(a0), hex(a1)]);
  if ((c0 + c1) % Q !== c) return false;
  const left0 = modPow(H, s0, P);
  const right0 = (a0 * modPow(y0, c0, P)) % P;
  const left1 = modPow(H, s1, P);
  const right1 = (a1 * modPow(y1, c1, P)) % P;
  return left0 === right0 && left1 === right1;
}

export function proveRange(value: bigint, statement: string): RangeProof {
  if (!Number.isSafeInteger(statement.length) || statement.length < 1 || statement.length > 512) {
    throw new Error('statement must be 1..512 characters');
  }
  if (value < 0n || value >= RANGE_EXCLUSIVE_MAX) throw new Error('value is outside the proved range');
  const bitRandomness: bigint[] = [];
  const bitCommitments: bigint[] = [];
  let randomnessSum = 0n;
  for (let index = 0; index < RANGE_BITS; index += 1) {
    const randomness = randomScalar();
    const bit = Number((value >> BigInt(index)) & 1n) as 0 | 1;
    bitRandomness.push(randomness);
    bitCommitments.push(commit(BigInt(bit), randomness));
    randomnessSum = (randomnessSum + randomness * (1n << BigInt(index))) % Q;
  }
  const linkageRandomness = randomScalar();
  const commitment = (commit(value, randomnessSum) * modPow(H, linkageRandomness, P)) % P;
  const bitProofs = bitCommitments.map((bitCommitment, index) => proveBit(
    bitCommitment,
    Number((value >> BigInt(index)) & 1n) as 0 | 1,
    bitRandomness[index]!,
    statement,
    index
  ));
  const product = bitCommitments.reduce((acc, bitCommitment, index) => (
    acc * modPow(bitCommitment, 1n << BigInt(index), P)
  ) % P, 1n);
  const linkageBase = (commitment * modInverse(product, P)) % P;
  const w = randomScalar();
  const a = modPow(H, w, P);
  const c = challenge([
    'solvex-range-v1/linkage',
    statement,
    hex(commitment),
    ...bitCommitments.map(hex),
    hex(a),
  ]);
  const s = (w + c * linkageRandomness) % Q;
  return {
    version: 1,
    bits: RANGE_BITS,
    statement,
    commitment: hex(commitment),
    bitCommitments: bitCommitments.map(hex),
    bitProofs,
    linkage: { a: hex(a), c: hex(c), s: hex(s) },
  };
}

export function verifyRangeProof(proof: RangeProof, expectedStatement: string): { ok: boolean; reason: string } {
  try {
    if (proof?.version !== 1 || proof.bits !== RANGE_BITS) return { ok: false, reason: 'unsupported proof parameters' };
    if (proof.statement !== expectedStatement) return { ok: false, reason: 'statement mismatch' };
    if (!Array.isArray(proof.bitCommitments) || proof.bitCommitments.length !== RANGE_BITS) return { ok: false, reason: 'bit commitment count mismatch' };
    if (!Array.isArray(proof.bitProofs) || proof.bitProofs.length !== RANGE_BITS) return { ok: false, reason: 'bit proof count mismatch' };
    const commitment = parseHex(proof.commitment, 'commitment');
    requireSubgroup(commitment, 'commitment');
    const bitCommitments = proof.bitCommitments.map((encoded, index) => {
      const value = parseHex(encoded, `bit commitment ${index}`);
      requireSubgroup(value, `bit commitment ${index}`);
      return value;
    });
    for (let index = 0; index < RANGE_BITS; index += 1) {
      if (!verifyBit(bitCommitments[index]!, proof.bitProofs[index]!, expectedStatement, index)) {
        return { ok: false, reason: `bit ${index} rejected` };
      }
    }
    const product = bitCommitments.reduce((acc, bitCommitment, index) => (
      acc * modPow(bitCommitment, 1n << BigInt(index), P)
    ) % P, 1n);
    const linkageBase = (commitment * modInverse(product, P)) % P;
    requireSubgroup(linkageBase, 'linkage');
    const a = parseHex(proof.linkage?.a, 'linkage.a');
    const c = parseHex(proof.linkage?.c, 'linkage.c');
    const s = parseHex(proof.linkage?.s, 'linkage.s');
    if (c >= Q || s >= Q) return { ok: false, reason: 'linkage scalar rejected' };
    requireSubgroup(a, 'linkage.a');
    const expected = challenge(['solvex-range-v1/linkage', expectedStatement, hex(commitment), ...bitCommitments.map(hex), hex(a)]);
    if (c !== expected) return { ok: false, reason: 'linkage challenge mismatch' };
    const left = modPow(H, s, P);
    const right = (a * modPow(linkageBase, c, P)) % P;
    if (left !== right) return { ok: false, reason: 'linkage equation rejected' };
    return { ok: true, reason: 'commitment and range proof verified' };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'malformed proof' };
  }
}

export function runRangeProofSelfTest(): {
  zero_knowledge_proof_verified: boolean;
  scheme: string;
  group: string;
  bits: number;
  valid_proof_accepted: boolean;
  boundary_proofs_accepted: boolean;
  altered_proof_rejected: boolean;
  statement_mismatch_rejected: boolean;
  invalid_commitment_rejected: boolean;
  out_of_range_rejected: boolean;
  witness_disclosed: false;
  production_hsm: false;
  reason?: string;
} {
  const statement = 'dn-53:pedersen-range-self-test';
  const mid = proveRange(42n, statement);
  const low = proveRange(0n, statement);
  const high = proveRange(RANGE_EXCLUSIVE_MAX - 1n, statement);
  const valid = [mid, low, high].every((proof) => verifyRangeProof(proof, statement).ok);
  const altered: RangeProof = structuredClone(mid);
  altered.bitProofs[0] = { ...altered.bitProofs[0]!, s0: altered.bitProofs[0]!.s0.endsWith('1') ? `${altered.bitProofs[0]!.s0.slice(0, -1)}2` : `${altered.bitProofs[0]!.s0.slice(0, -1)}1` };
  const alteredRejected = !verifyRangeProof(altered, statement).ok;
  const statementRejected = !verifyRangeProof(mid, `${statement}:replay-other-statement`).ok;
  const invalidCommitment: RangeProof = { ...mid, commitment: hex(G) };
  const invalidCommitmentRejected = !verifyRangeProof(invalidCommitment, statement).ok;
  let outOfRangeRejected = false;
  try {
    proveRange(RANGE_EXCLUSIVE_MAX, statement);
  } catch (error) {
    outOfRangeRejected = error instanceof Error && /outside the proved range/.test(error.message);
  }
  const ok = valid && alteredRejected && statementRejected && invalidCommitmentRejected && outOfRangeRejected;
  return {
    zero_knowledge_proof_verified: ok,
    scheme: 'pedersen-rfc3526-group14-bit-or-range-v1',
    group: 'RFC3526-MODP-2048',
    bits: RANGE_BITS,
    valid_proof_accepted: valid,
    boundary_proofs_accepted: verifyRangeProof(low, statement).ok && verifyRangeProof(high, statement).ok,
    altered_proof_rejected: alteredRejected,
    statement_mismatch_rejected: statementRejected,
    invalid_commitment_rejected: invalidCommitmentRejected,
    out_of_range_rejected: outOfRangeRejected,
    witness_disclosed: false,
    production_hsm: false,
    reason: ok ? undefined : 'range proof self-test failed',
  };
}
