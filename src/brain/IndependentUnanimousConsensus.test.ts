import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import {
  ConsensusPolicy,
  ConsensusProposal,
  SignedEvaluatorVote,
  verifyUnanimousConsensus,
  voteSigningPayload,
  proposalDigest,
  policyDigest,
  sha256Canonical
} from './IndependentUnanimousConsensus';

const now = Date.parse('2026-11-06T15:10:00.000Z');
const keypairs = ['daisy-proposer-reviewer', 'independent-verifier', 'policy-auditor'].map(evaluator_id => ({
  evaluator_id,
  ...generateKeyPairSync('ed25519')
}));
const proposal: ConsensusProposal = {
  proposal_id: 'proposal-test-001',
  action: 'DEPLOY_STAGING',
  target: 'solvex-staging',
  created_at: new Date(now - 1_000).toISOString(),
  nonce: 'nonce-unique-test-001',
  payload_sha256: sha256Canonical({ artifact: 'test-build' }),
  evidence_sha256: sha256Canonical({ tests: 'passed' }),
  rollback_plan_sha256: sha256Canonical({ rollback: 'previous-release' })
};
const policy: ConsensusPolicy = {
  policy_id: 'daisy-test-policy',
  version: '1',
  valid_from: new Date(now - 60_000).toISOString(),
  expires_at: new Date(now + 60_000).toISOString(),
  max_proposal_age_ms: 30_000,
  max_vote_age_ms: 30_000,
  allowed_actions: ['DEPLOY_STAGING'],
  allowed_targets: ['solvex-staging'],
  require_rollback_plan: true,
  evaluator_ids: ['daisy-proposer-reviewer', 'independent-verifier', 'policy-auditor']
};
const expectedInputBundleSha256 = sha256Canonical({
  proposal: proposalDigest(proposal),
  policy: policyDigest(policy),
  evidence: proposal.evidence_sha256
});

function signedVotes(decisions: Array<'APPROVE' | 'DENY'> = ['APPROVE', 'APPROVE', 'APPROVE']): SignedEvaluatorVote[] {
  return keypairs.map((identity, index) => {
    const unsigned = {
      evaluator_id: identity.evaluator_id,
      decision: decisions[index],
      proposal_sha256: proposalDigest(proposal),
      policy_sha256: policyDigest(policy),
      evidence_sha256: proposal.evidence_sha256,
      nonce: proposal.nonce,
      input_bundle_sha256: expectedInputBundleSha256,
      independence_attestation: 'ISOLATED_INPUT_ONLY' as const,
      signed_at: new Date(now).toISOString()
    };
    return {
      ...unsigned,
      signature_base64: sign(null, voteSigningPayload(unsigned), identity.privateKey).toString('base64')
    };
  });
}
const evaluators = keypairs.map(item => ({
  evaluator_id: item.evaluator_id,
  public_key_pem: item.publicKey.export({ type: 'spki', format: 'pem' }).toString()
}));

test('approves only three distinct, valid approvals', () => {
  const result = verifyUnanimousConsensus({ proposal, policy, evaluators, votes: signedVotes(), expectedInputBundleSha256, now });
  assert.equal(result.status, 'APPROVED');
  assert.equal(result.valid_approvals, 3);
  assert.equal(result.valid_denials, 0);
});

test('one denial blocks; no majority override', () => {
  const result = verifyUnanimousConsensus({
    proposal, policy, evaluators,
    votes: signedVotes(['APPROVE', 'APPROVE', 'DENY']),
    expectedInputBundleSha256, now
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.valid_approvals, 2);
  assert.equal(result.valid_denials, 1);
});

test('missing or duplicate votes block', () => {
  const allVotes = signedVotes();
  assert.equal(verifyUnanimousConsensus({
    proposal, policy, evaluators, votes: allVotes.slice(0, 2), expectedInputBundleSha256, now
  }).status, 'BLOCKED');
  const duplicate = [allVotes[0], allVotes[1], allVotes[1]];
  assert.equal(verifyUnanimousConsensus({
    proposal, policy, evaluators, votes: duplicate, expectedInputBundleSha256, now
  }).status, 'BLOCKED');
});

test('tampered vote signature and mismatched proposal digest block', () => {
  const allVotes = signedVotes();
  const tampered = { ...allVotes[0], decision: 'DENY' as const };
  assert.equal(verifyUnanimousConsensus({
    proposal, policy, evaluators, votes: [tampered, allVotes[1], allVotes[2]], expectedInputBundleSha256, now
  }).status, 'BLOCKED');
  const mismatched = { ...allVotes[0], proposal_sha256: '0'.repeat(64) };
  assert.equal(verifyUnanimousConsensus({
    proposal, policy, evaluators, votes: [mismatched, allVotes[1], allVotes[2]], expectedInputBundleSha256, now
  }).status, 'BLOCKED');
});

test('policy scope and rollback requirements are enforced', () => {
  const disallowed = { ...proposal, action: 'DEPLOY_PRODUCTION' };
  assert.equal(verifyUnanimousConsensus({
    proposal: disallowed, policy, evaluators, votes: signedVotes(), expectedInputBundleSha256, now
  }).status, 'BLOCKED');
  const { rollback_plan_sha256: _rollbackPlan, ...noRollback } = proposal;
  assert.equal(verifyUnanimousConsensus({
    proposal: noRollback, policy, evaluators, votes: signedVotes(), expectedInputBundleSha256, now
  }).status, 'BLOCKED');
});

test('policy evaluator roster must match three trusted identities', () => {
  const narrowed = { ...policy, evaluator_ids: ['daisy-proposer-reviewer', 'independent-verifier', 'unknown-agent'] as const };
  assert.equal(verifyUnanimousConsensus({
    proposal, policy: narrowed, evaluators, votes: signedVotes(), expectedInputBundleSha256, now
  }).status, 'BLOCKED');
});
