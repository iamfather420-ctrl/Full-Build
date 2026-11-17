import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { BuildLedger, readBuildSnapshot, writeBuildSnapshot } from './BuildLedger.ts';

test('a closed build snapshot reloads after the in-memory ledger is reset', () => {
  BuildLedger.resetForTest();
  const build = BuildLedger.open('snapshot');
  BuildLedger.assign(build.buildId, 'task-1', 'cpu-shard');
  BuildLedger.complete(build.buildId, 'task-1', 'weights');
  const closed = BuildLedger.close(build.buildId);
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'daisy-ledger-')), 'build.json');
  writeBuildSnapshot(file, closed);
  BuildLedger.resetForTest();
  const loaded = readBuildSnapshot(file);
  assert.equal(loaded.buildId, closed.buildId);
  assert.equal(loaded.active, false);
  assert.equal(loaded.tasks[0]?.artifactSha256?.length, 64);
  assert.equal(BuildLedger.current(), null);
});
