import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectTetherPath } from './TetherPath';

test('a supplied tether uses an alternate path when the direct edge is unavailable', () => {
  const edges = [
    { from: 'DN-01', to: 'DN-03', relation: 'fixture-direct' },
    { from: 'DN-01', to: 'DN-20', relation: 'fixture-alternate' },
    { from: 'DN-20', to: 'DN-03', relation: 'fixture-alternate' },
  ];
  assert.deepEqual(selectTetherPath(edges, 'DN-01', 'DN-03'), ['DN-01', 'DN-03']);
  assert.deepEqual(selectTetherPath(edges, 'DN-01', 'DN-03', new Set(['DN-01->DN-03'])), ['DN-01', 'DN-20', 'DN-03']);
  assert.equal(selectTetherPath(edges, 'DN-01', 'DN-54'), null);
});
