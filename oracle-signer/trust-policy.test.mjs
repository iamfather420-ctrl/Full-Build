import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stage14ClaimsTrusted } from './trust-policy.mjs';

const now = 1_700_000_000;
const workflow = 'iamfather420-ctrl/Full-Build/.github/workflows/ci.yml@refs/pull/127/merge';

function claims(overrides = {}) {
  return {
    iss: 'https://token.actions.githubusercontent.com',
    aud: 'solvex-stage14-evaluator',
    exp: now + 60,
    repository: 'iamfather420-ctrl/Full-Build',
    repository_id: '1388681071',
    event_name: 'pull_request',
    sub: 'repo:iamfather420-ctrl/Full-Build:pull_request',
    ref: 'refs/pull/130/merge',
    workflow_ref: workflow,
    ...overrides,
  };
}

test('accepts only the exact repair PR OIDC ref and rejects foreign or unrelated identities', () => {
  assert.equal(stage14ClaimsTrusted(claims(), now), true);
  assert.equal(stage14ClaimsTrusted(claims({ ref: 'refs/pull/129/merge' }), now), false);
  assert.equal(stage14ClaimsTrusted(claims({ sub: 'repo:other/repo:pull_request' }), now), false);
  assert.equal(stage14ClaimsTrusted(claims({ repository: 'other/repo' }), now), false);
  assert.equal(stage14ClaimsTrusted(claims({ aud: 'wrong-audience' }), now), false);
  assert.equal(stage14ClaimsTrusted(claims({ exp: now - 1 }), now), false);
});
