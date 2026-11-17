import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attention, trainAttention } from '../src/attention.ts';

test('CPU attention trains a toy query and is not a language-model release', () => {
  const keys = [[1, 0], [0, 1]];
  const values = [[1, 0], [0, 1]];
  const before = attention([0, 0], keys, values);
  const trained = trainAttention([0, 0], keys, values, [1, 0], 40, 0.5);
  const after = attention(trained.query, keys, values);
  const beforeLoss = before.reduce((sum, value, index) => sum + (value - [1, 0][index]) ** 2, 0);
  const afterLoss = after.reduce((sum, value, index) => sum + (value - [1, 0][index]) ** 2, 0);
  assert.ok(afterLoss < beforeLoss);
  assert.ok(trained.loss < 0.2);
});
