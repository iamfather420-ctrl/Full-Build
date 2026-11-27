import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import {
  ConsensusPolicy,
  ConsensusProposal,
  SignedEvaluatorVote,
  canonicalJson,
  policyDigest,
  proposalDigest,
  sha256Canonical,
  voteSigningPayload
} from './IndependentUnanimousConsensus';
import { verifyDaisyConsensusCertificate } from './DaisyConsensusCertificateVerifier';
import type { SignedDaisyRuntimeConfig } from './DaisyConsensusConfig';

const now = Date.parse('2026-11-27T17:00:00.000Z');
const sourceCommit = 'a'.repeat(40);
const verificationRoot = 'b'.repeat(64);
const runEvidence = 'c'.repeat(64);
const ids = ['model-a', 'model-b', 'model-c'] as const;
const keypairs = ids.map((evaluator_id, index) => ({
  evaluator_id,
  model_id: 'independent-model-' + index,
  model_weights_sha256: String(index + 1).repeat(64),
  runtime_code_sha256: String(index + 4).repeat(64),
  image_digest: String(index + 7).repeat(64),
  ...generateKeyPairSync('ed25519')
}));
const policy: ConsensusPolicy = {
  policy_id: 'production-consent-policy',
  version: '1',
  valid_from: new Date(now - 60_000).toISOString(),
  expires_at: new Date(now + 60_000).toISOString(),
  max_proposal_age_ms: 30_000,
  max_vote_age_ms: 30_000,
  allowed_actions: ['AUTHORIZE_DAISY_PRODUCTION'],
  allowed_targets: ['SOLVEX_DAISY_PRODUCTION'],
  require_rollback_plan: true,
  evaluator_ids: ids
};
const record = {
  source_commit_sha: sourceCommit,
  verification_root_sha256: verificationRoot,
  run_evidence_sha256: runEvidence
};
const proposal: ConsensusProposal = {
  proposal_id: 'production-consent-test',
  action: 'AUTHORIZE_DAISY_PRODUCTION',
  target: 'SOLVEX_DAISY_PRODUCTION',
  created_at: new Date(now - 2_000).toISOString(),
  nonce: 'one-time-production-consent-nonce',
  payload_sha256: sha256Canonical({
    source_commit_sha: sourceCommit,
    verification_root_sha256: verificationRoot
  }),
  evidence_sha256: runEvidence,
  rollback_plan_sha256: 'd'.repeat(64)
};
const expectedInputBundleSha256 = sha256Canonical({
  proposal: proposalDigest(proposal),
  policy: policyDigest(policy),
  evidence: proposal.evidence_sha256
});
const votes: SignedEvaluatorVote[] = keypairs.map((identity, index) => {
  const unsigned = {
    evaluator_id: identity.evaluator_id,
    model_id: identity.model_id,
    model_weights_sha256: identity.model_weights_sha256,
    runtime_code_sha256: identity.runtime_code_sha256,
    image_digest: identity.image_digest,
    decision: 'APPROVE' as const,
    proposal_sha256: proposalDigest(proposal),
    policy_sha256: policyDigest(policy),
    evidence_sha256: proposal.evidence_sha256,
    nonce: proposal.nonce,
    input_bundle_sha256: expectedInputBundleSha256,
    independence_attestation: 'ISOLATED_INPUT_ONLY' as const,
    signed_at: new Date(now - 1_000).toISOString()
  };
  return {
    ...unsigned,
    signature_base64: sign(null, voteSigningPayload(unsigned), identity.privateKey).toString('base64')
  };
});
const certificateBody = {
  protocol: 'SOLVEX_DAISY_INDEPENDENT_UNANIMOUS_CONSENSUS_V1' as const,
  proposal,
  policy_sha256: policyDigest(policy),
  input_bundle_sha256: expectedInputBundleSha256,
  votes,
  generated_at: new Date(now).toISOString()
};
const certificate = {
  ...certificateBody,
  certificate_sha256: sha256Canonical(certificateBody)
};
const root = generateKeyPairSync('ed25519');
const evaluators = keypairs.map(item => ({
  evaluator_id: item.evaluator_id,
  model_id: item.model_id,
  model_weights_sha256: item.model_weights_sha256,
  runtime_code_sha256: item.runtime_code_sha256,
  image_digest: item.image_digest,
  public_key_pem: item.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  image: 'registry.example/evaluator-' + item.evaluator_id + '@sha256:' + item.image_digest,
  signing_key_file: '/not-used-by-public-verifier/' + item.evaluator_id + '.pem'
}));
const unsignedConfig = { policy, evaluators };
const config: SignedDaisyRuntimeConfig = {
  ...unsignedConfig,
  signature_base64: sign(null, Buffer.from(canonicalJson(unsignedConfig)), root.privateKey).toString('base64')
};
const env = {
  DAISY_RUNTIME_CONFIG_JSON: JSON.stringify(unsignedConfig),
  DAISY_RUNTIME_CONFIG_SIGNATURE: config.signature_base64,
  DAISY_POLICY_ROOT_PUBLIC_KEY: root.publicKey.export({ type: 'spki', format: 'pem' }).toString()
};

test('accepts a fresh 3-of-3 certificate from three distinct model lineages bound to the current activation evidence', () => {
  const result = verifyDaisyConsensusCertificate(record, certificate, env, now);
  assert.deepEqual(result, { valid: true, reason: 'THREE_DISTINCT_MODELS_UNANIMOUSLY_APPROVED' });
});

test('rejects certificate reuse against a different source commit', () => {
  const result = verifyDaisyConsensusCertificate({ ...record, source_commit_sha: 'e'.repeat(40) }, certificate, env, now);
  assert.equal(result.valid, false);
  assert.match(result.reason, /CONSENSUS_PROPOSAL_NOT_BOUND_TO_ACTIVATION_EVIDENCE/);
});

test('rejects a tampered vote even if the certificate hash is recomputed', () => {
  const tamperedVotes = [...votes];
  tamperedVotes[0] = { ...tamperedVotes[0], decision: 'DENY' };
  const body = { ...certificateBody, votes: tamperedVotes };
  const tampered = { ...body, certificate_sha256: sha256Canonical(body) };
  const result = verifyDaisyConsensusCertificate(record, tampered, env, now);
  assert.equal(result.valid, false);
  assert.match(result.reason, /CONSENSUS_NOT_UNANIMOUS/);
});

test('rejects duplicate model weight lineage in the root-signed evaluator roster', () => {
  const duplicateEvaluators = evaluators.map((item, index) => index === 2
    ? { ...item, model_weights_sha256: evaluators[0].model_weights_sha256 }
    : item);
  const duplicateConfig = { policy, evaluators: duplicateEvaluators };
  const duplicateEnv = {
    ...env,
    DAISY_RUNTIME_CONFIG_JSON: JSON.stringify(duplicateConfig),
    DAISY_RUNTIME_CONFIG_SIGNATURE: sign(null, Buffer.from(canonicalJson(duplicateConfig)), root.privateKey).toString('base64')
  };
  const result = verifyDaisyConsensusCertificate(record, certificate, duplicateEnv, now);
  assert.equal(result.valid, false);
  assert.match(result.reason, /THREE_DISTINCT_MODEL_LINEAGES_REQUIRED/);
});

test('rejects an expired consensus certificate', () => {
  const result = verifyDaisyConsensusCertificate(record, certificate, env, now + 11 * 60 * 1000);
  assert.equal(result.valid, false);
  assert.match(result.reason, /CONSENSUS_CERTIFICATE_TIME_WINDOW_INVALID/);
});
