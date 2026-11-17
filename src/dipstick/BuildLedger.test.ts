import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BuildLedger } from './BuildLedger.ts';

test('one build is active, duplicate tasks are rejected, and a failed task can be completed after reassignment', () => {
  BuildLedger.resetForTest();
  const first = BuildLedger.open('train the reference model');
  assert.throws(() => BuildLedger.open('second build'));
  BuildLedger.assign(first.buildId, 'shard-0', 'weight-shard');
  assert.throws(() => BuildLedger.assign(first.buildId, 'shard-0', 'weight-shard'));
  BuildLedger.fail(first.buildId, 'shard-0');
  const completed = BuildLedger.complete(first.buildId, 'shard-0', '{"tensor":1}');
  assert.match(completed.artifactSha256 ?? '', /^[a-f0-9]{64}$/);
  assert.throws(() => BuildLedger.complete(first.buildId, 'shard-0', '{"tensor":1}'));
  BuildLedger.close(first.buildId);
  const second = BuildLedger.open('next build');
  assert.notEqual(second.buildId, first.buildId);
  BuildLedger.close(second.buildId);
});
