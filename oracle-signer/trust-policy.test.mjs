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
    base_ref: 'main',
    head_ref: 'feat/daisy-ecosystem-link-20261116',
    head_repository: 'iamfather420-ctrl/Full-Build',
    head_repository_id: '1388681071',
    workflow_ref: workflow,
    ...overrides,
  };
}

test('accepts this branch and rejects a foreign repository or audience', () => {
  assert.equal(stage14ClaimsTrusted(claims(), now), true);
  assert.equal(stage14ClaimsTrusted(claims({ repository: 'other/repo' }), now), false);
  assert.equal(stage14ClaimsTrusted(claims({ aud: 'wrong-audience' }), now), false);
  assert.equal(stage14ClaimsTrusted(claims({ head_ref: 'unlisted-branch' }), now), false);
  assert.equal(stage14ClaimsTrusted(claims({ exp: now - 1 }), now), false);
});
