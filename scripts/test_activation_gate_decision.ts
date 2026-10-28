import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isBrainActivationAllowed } from './activationGateDecision';

const passing = {
  corpusPassed: true,
  adversarialPassed: true,
  observedGateCount: 46,
  requiredGateCount: 46,
  nonPassedGateCount: 0,
};

assert.equal(isBrainActivationAllowed(passing), true);
assert.equal(isBrainActivationAllowed({ ...passing, corpusPassed: false }), false);
assert.equal(isBrainActivationAllowed({ ...passing, adversarialPassed: false }), false);
assert.equal(isBrainActivationAllowed({ ...passing, observedGateCount: 45 }), false);
assert.equal(isBrainActivationAllowed({ ...passing, observedGateCount: 47 }), false);
assert.equal(isBrainActivationAllowed({ ...passing, requiredGateCount: 45 }), false);
assert.equal(isBrainActivationAllowed({ ...passing, nonPassedGateCount: 1 }), false);

const verifierSource = readFileSync(new URL('./verify_120_aggregation.ts', import.meta.url), 'utf8');
assert.match(
  verifierSource,
  /if\s*\(\s*!\s*brainActive\s*\)/,
  'verifier must exit on failed activation, not only failed corpus'
);
assert.match(verifierSource, /process\.exit\(1\)/);

console.log('Activation gate regression tests passed.');
