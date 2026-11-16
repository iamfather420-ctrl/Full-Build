import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BuildLedger } from '../dipstick/BuildLedger.ts';
import { runUnifiedScenario } from './DaisyEcosystem.ts';

test('Daisy runs the reference ecosystem and withholds the unverified GPU claim', () => {
  BuildLedger.resetForTest();
  const result = runUnifiedScenario('Build a reference MLP and verify its holdout loss.');
  assert.equal(result.withheld.publishable, false);
  assert.equal(result.withheld.status, 'unverified_claim');
  assert.equal(result.verified.publishable, true);
  assert.equal(result.parameterCount, 33);
  assert.ok(Number.isFinite(result.holdoutLoss));
  assert.equal(result.steps.at(-1)?.status, 'BLOCKED');
  assert.equal(BuildLedger.current(), null);
});
