import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { selectConfirmationMode } from '../../artifacts/api-server/src/lib/confirmationMode';
import { computeOracleInputSha256 } from '../security/IndependentModelOracle';
import { Z3FormalProofEngine } from '../proofs/Z3FormalProofEngine';
import { ProofBundleBuilder } from '../proofs/ProofBundle';
import { DaisySubsystemExecutors } from '../nodes/DaisySubsystemExecutors';

test('asymmetric mode rejects an HMAC confirmation and an invalid configured key', () => {
  assert.equal(selectConfirmationMode({
    publicKeyConfigured: true,
    publicKeyValid: true,
    hasHeader: false,
    hasSignature: false,
    hasConfirmationHash: true,
  }).mode, 'REJECT');
  const invalid = selectConfirmationMode({
    publicKeyConfigured: true,
    publicKeyValid: false,
    hasHeader: false,
    hasSignature: false,
    hasConfirmationHash: true,
  });
  assert.equal(invalid.mode, 'REJECT');
  if (invalid.mode === 'REJECT') assert.equal(invalid.error, 'SIGNER_PUBLIC_KEY_INVALID');
});

test('a file path or a boolean cannot seal a verified proof bundle', () => {
  const builder = new ProofBundleBuilder('PB-NEG', 'SUB', 'negative');
  builder
    .addTest('T', 'runs', true, 1)
    .addLean4Proof('/tmp/unexecuted.lean')
    .addOracle('ORACLE', 'local', 'boolean', true)
    .addReplay('R', 'a', 'a');
  const sealed = builder.seal();
  assert.equal(sealed.verification_status, 'FAIL');
  assert.equal(sealed.formal_proofs[0]?.checked, false);
  assert.equal(sealed.independent_oracles[0]?.verified, false);
});

test('a caller-generated Ed25519 key cannot establish trusted oracle identity or seal a bundle', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const rationale = 'checked the source bytes';
  const attestation = {
    oracleId: 'oracle-1',
    modelId: 'model-1',
    inputSha256: 'a'.repeat(64),
    verdict: 'ACCEPT' as const,
    rationaleSha256: createHash('sha256').update(rationale).digest('hex'),
    rationale,
    signature: '',
  };
  const canonical = [attestation.oracleId, attestation.modelId, attestation.inputSha256, attestation.verdict, attestation.rationaleSha256].join('\n');
  attestation.signature = sign(null, Buffer.from(canonical), privateKey).toString('base64');
  const builder = new ProofBundleBuilder('PB-SELF-SIGNED', 'SUB', 'signed');
  builder
    .addTest('T', 'runs', true, 1)
    .addFormalProof('Z3_SMT', 'caller-asserted theorem', true)
    .addSignedOracleAttestation(attestation)
    .addReplay('R', 'a', 'a');
  const sealed = builder.seal();
  assert.equal(sealed.verification_status, 'FAIL');
  assert.equal(sealed.formal_proofs[0]?.checked, false);
  assert.equal(sealed.independent_oracles[0]?.verified, false);
});

test('boolean-only formal proof and arbitrary oracle key remain unverified', () => {
  const builder = new ProofBundleBuilder('PB-BOOL', 'SUB', 'negative');
  builder.addTest('T', 'runs', true, 1)
    .addFormalProof('Z3_SMT', 'fabricated theorem', true)
    .addOracle('ORACLE', 'local', 'boolean', true)
    .addReplay('R', 'a', 'a');
  assert.equal(builder.seal().verification_status, 'FAIL');
});

test('DN-52 stays fail-closed without a production key and DN-36 stays prohibited', async () => {
  const executors = new DaisySubsystemExecutors();
  const signer = await executors.executeNode('DN-52');
  assert.equal(signer.status, 'FAIL_CLOSED');
  assert.equal(signer.evidence.ephemeral_key_accepted, false);
  const prohibited = await executors.executeNode('DN-36');
  assert.equal(prohibited.status, 'PROHIBITED_BLOCKED');
  const lean = await executors.executeNode('DN-40');
  assert.equal(lean.status, 'FAIL_CLOSED');
});

test('only a real in-process Z3 execution receipt can mark a formal proof checked', async () => {
  const engine = Z3FormalProofEngine.getInstance();
  const genuine = await engine.proveCatalogTheorem('THM-LIAR-03');
  assert.equal(genuine.proved, true);
  const fake = { ...genuine, certificate_sha256: '0'.repeat(64), proved: true };
  const rejected = new ProofBundleBuilder('PB-FAKE-Z3', 'SUB', 'fake');
  rejected.addTest('T', 'runs', true, 1).addZ3Proof(fake as typeof genuine).addOracle('O', 'O', 'boolean', true).addReplay('R', 'a', 'a');
  assert.equal(rejected.seal().formal_proofs[0]?.checked, false);
  const accepted = new ProofBundleBuilder('PB-REAL-Z3', 'SUB', 'real');
  accepted.addTest('T', 'runs', true, 1).addZ3Proof(genuine).addOracle('O', 'O', 'boolean', true).addReplay('R', 'a', 'a');
  assert.equal(accepted.seal().formal_proofs[0]?.checked, true);
});

test('trusted oracle attestation must match deployment-pinned identity, key, and bundle input', () => {
  const oldId = process.env.SOLVEX_ORACLE_ID;
  const oldKey = process.env.SOLVEX_ORACLE_ED25519_PUBLIC_KEY;
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  process.env.SOLVEX_ORACLE_ID = 'trusted-oracle';
  process.env.SOLVEX_ORACLE_ED25519_PUBLIC_KEY = publicKeyPem;
  try {
    const input = { paradox_code: 'DH-P-001', source_sha256: 'a'.repeat(64), source: 'source bytes' };
    const rationale = 'independent evaluation accepted';
    const attestation = { oracleId: 'trusted-oracle', modelId: 'gpt-test', inputSha256: computeOracleInputSha256(input), verdict: 'ACCEPT' as const, rationaleSha256: createHash('sha256').update(rationale).digest('hex'), rationale, signature: '' };
    const canonical = [attestation.oracleId, attestation.modelId, attestation.inputSha256, attestation.verdict, attestation.rationaleSha256].join('\n');
    attestation.signature = sign(null, Buffer.from(canonical), privateKey).toString('base64');
    const builder = new ProofBundleBuilder('PB-ORACLE', 'SUB', 'claim');
    builder.setOracleInput(input).addSignedOracleAttestation(attestation);
    assert.equal(builder.seal().independent_oracles[0]?.verified, true);
    const wrong = new ProofBundleBuilder('PB-ORACLE-WRONG', 'SUB', 'claim');
    wrong.setOracleInput({ ...input, source: 'different bytes' }).addSignedOracleAttestation(attestation);
    assert.equal(wrong.seal().independent_oracles[0]?.verified, false);
  } finally {
    if (oldId === undefined) delete process.env.SOLVEX_ORACLE_ID; else process.env.SOLVEX_ORACLE_ID = oldId;
    if (oldKey === undefined) delete process.env.SOLVEX_ORACLE_ED25519_PUBLIC_KEY; else process.env.SOLVEX_ORACLE_ED25519_PUBLIC_KEY = oldKey;
  }
});
