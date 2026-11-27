import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import { DaisyActivationGate, DaisyActivationAuthorization } from './DaisyActivationGate';

const sourceCommit = 'a'.repeat(40);
const verificationRoot = 'b'.repeat(64);
const runEvidence = 'c'.repeat(64);
const certificateSha = 'd'.repeat(64);

function signedAuthorization(schema = 'SOLVEX_DAISY_ACTIVATION_AUTHORIZATION_V2') {
  const keys = generateKeyPairSync('ed25519');
  const issuedAt = new Date().toISOString();
  const authorizationBase = {
    authorized_by: 'human-root-test',
    issued_at: issuedAt,
    source_commit_sha: sourceCommit,
    verification_root_sha256: verificationRoot,
    run_evidence_sha256: runEvidence,
    consensus_certificate_sha256: certificateSha
  };
  const payload = JSON.stringify({
    schema,
    authorized_by: authorizationBase.authorized_by,
    issued_at: issuedAt,
    source_commit_sha: sourceCommit,
    verification_root_sha256: verificationRoot,
    run_evidence_sha256: runEvidence,
    consensus_certificate_sha256: certificateSha
  });
  const authorization: DaisyActivationAuthorization = {
    ...authorizationBase,
    signature_base64: sign(null, Buffer.from(payload, 'utf8'), keys.privateKey).toString('base64')
  };
  return {
    authorization,
    publicKey: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString()
  };
}

test('human-root activation signature binds the exact 3-of-3 certificate hash', () => {
  const previous = process.env.SOLVEX_ACTIVATION_ROOT_PUBLIC_KEY;
  const { authorization, publicKey } = signedAuthorization();
  process.env.SOLVEX_ACTIVATION_ROOT_PUBLIC_KEY = publicKey;
  try {
    assert.equal(
      DaisyActivationGate.verifyAuthorization(authorization, sourceCommit, verificationRoot, runEvidence),
      true
    );
    assert.equal(
      DaisyActivationGate.verifyAuthorization(
        { ...authorization, consensus_certificate_sha256: 'e'.repeat(64) },
        sourceCommit,
        verificationRoot,
        runEvidence
      ),
      false
    );
  } finally {
    if (previous === undefined) delete process.env.SOLVEX_ACTIVATION_ROOT_PUBLIC_KEY;
    else process.env.SOLVEX_ACTIVATION_ROOT_PUBLIC_KEY = previous;
  }
});

test('rejects legacy human-root signatures that do not bind a consensus certificate', () => {
  const previous = process.env.SOLVEX_ACTIVATION_ROOT_PUBLIC_KEY;
  const { authorization, publicKey } = signedAuthorization('SOLVEX_DAISY_ACTIVATION_AUTHORIZATION_V1');
  process.env.SOLVEX_ACTIVATION_ROOT_PUBLIC_KEY = publicKey;
  try {
    assert.equal(
      DaisyActivationGate.verifyAuthorization(authorization, sourceCommit, verificationRoot, runEvidence),
      false
    );
  } finally {
    if (previous === undefined) delete process.env.SOLVEX_ACTIVATION_ROOT_PUBLIC_KEY;
    else process.env.SOLVEX_ACTIVATION_ROOT_PUBLIC_KEY = previous;
  }
});

test('rejects a missing consensus certificate hash even when all other authorization fields are present', () => {
  const previous = process.env.SOLVEX_ACTIVATION_ROOT_PUBLIC_KEY;
  const { authorization, publicKey } = signedAuthorization();
  process.env.SOLVEX_ACTIVATION_ROOT_PUBLIC_KEY = publicKey;
  try {
    assert.equal(
      DaisyActivationGate.verifyAuthorization(
        { ...authorization, consensus_certificate_sha256: '' },
        sourceCommit,
        verificationRoot,
        runEvidence
      ),
      false
    );
  } finally {
    if (previous === undefined) delete process.env.SOLVEX_ACTIVATION_ROOT_PUBLIC_KEY;
    else process.env.SOLVEX_ACTIVATION_ROOT_PUBLIC_KEY = previous;
  }
});
