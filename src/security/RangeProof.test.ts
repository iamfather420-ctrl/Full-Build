import assert from 'node:assert/strict';
import { test } from 'node:test';
import { proveRange, RANGE_EXCLUSIVE_MAX, runRangeProofSelfTest, verifyRangeProof, type RangeProof } from './RangeProof';

const STATEMENT = 'range-proof-regression';

test('valid, boundary, altered, rebound, and out-of-range proofs', () => {
  const proof = proveRange(7n, STATEMENT);
  assert.equal(verifyRangeProof(proof, STATEMENT).ok, true);
  assert.equal(verifyRangeProof(proveRange(0n, STATEMENT), STATEMENT).ok, true);
  assert.equal(verifyRangeProof(proveRange(RANGE_EXCLUSIVE_MAX - 1n, STATEMENT), STATEMENT).ok, true);
  const altered: RangeProof = structuredClone(proof);
  altered.commitment = `${altered.commitment.slice(0, -1)}${altered.commitment.endsWith('a') ? 'b' : 'a'}`;
  assert.equal(verifyRangeProof(altered, STATEMENT).ok, false);
  assert.equal(verifyRangeProof(proof, 'different-statement').ok, false);
  const rebound: RangeProof = { ...proof, bitProofs: proof.bitProofs.map((bit) => ({ ...bit })) };
  rebound.linkage = { ...proof.linkage, s: proof.linkage.s.endsWith('3') ? `${proof.linkage.s.slice(0, -1)}4` : `${proof.linkage.s.slice(0, -1)}3` };
  assert.equal(verifyRangeProof(rebound, STATEMENT).ok, false);
  assert.throws(() => proveRange(RANGE_EXCLUSIVE_MAX, STATEMENT), /outside the proved range/);
  assert.throws(() => proveRange(-1n, STATEMENT), /outside the proved range/);
});

test('two openings of the same public value both verify and are not identical', () => {
  const first = proveRange(9n, STATEMENT);
  const second = proveRange(9n, STATEMENT);
  assert.equal(verifyRangeProof(first, STATEMENT).ok, true);
  assert.equal(verifyRangeProof(second, STATEMENT).ok, true);
  assert.notEqual(first.commitment, second.commitment);
});

test('DN-53 self-test accepts only a fully checked proof', () => {
  const evidence = runRangeProofSelfTest();
  assert.equal(evidence.zero_knowledge_proof_verified, true);
  assert.equal(evidence.altered_proof_rejected, true);
  assert.equal(evidence.invalid_commitment_rejected, true);
  assert.equal(evidence.out_of_range_rejected, true);
  assert.equal(evidence.witness_disclosed, false);
  assert.equal(evidence.production_hsm, false);
});