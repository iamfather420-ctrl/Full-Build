import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stage14ClaimsTrusted } from './stage14-oidc.ts';

const now = 1_700_000_000;
function claims(overrides: Record<string, unknown> = {}) {
  const ref = 'refs/pull/136/merge';
  return {
    iss: 'https://token.actions.githubusercontent.com',
    aud: 'solvex-stage14-evaluator',
    exp: now + 60,
    repository: 'iamfather420-ctrl/Full-Build',
    repository_id: '1388681071',
    event_name: 'pull_request',
    sub: 'repo:iamfather420-ctrl/Full-Build:pull_request',
    ref,
    workflow_ref: `iamfather420-ctrl/Full-Build/.github/workflows/ci.yml@${ref}`,
    ...overrides
  };
}

test('accepts the exact active same-repository PR 136 OIDC identity', () => {
  assert.equal(stage14ClaimsTrusted(claims(), now), true);
});

test('rejects unrelated PR refs, repositories, audiences, issuers, and expired tokens', () => {
  assert.equal(stage14ClaimsTrusted(claims({ ref: 'refs/pull/131/merge' }), now), false);
  assert.equal(stage14ClaimsTrusted(claims({ repository: 'other/repo' }), now), false);
  assert.equal(stage14ClaimsTrusted(claims({ aud: 'wrong-audience' }), now), false);
  assert.equal(stage14ClaimsTrusted(claims({ iss: 'https://attacker.invalid' }), now), false);
  assert.equal(stage14ClaimsTrusted(claims({ exp: now - 1 }), now), false);
});

test('accepts only explicitly trusted mainline push refs', () => {
  const ref = 'refs/heads/main';
  assert.equal(stage14ClaimsTrusted(claims({
    event_name: 'push',
    sub: 'repo:iamfather420-ctrl/Full-Build:ref:refs/heads/main',
    ref,
    workflow_ref: `iamfather420-ctrl/Full-Build/.github/workflows/ci.yml@${ref}`
  }), now), true);
  const untrustedRef = 'refs/heads/feature/unknown';
  assert.equal(stage14ClaimsTrusted(claims({
    event_name: 'push',
    ref: untrustedRef,
    workflow_ref: `iamfather420-ctrl/Full-Build/.github/workflows/ci.yml@${untrustedRef}`
  }), now), false);
});
