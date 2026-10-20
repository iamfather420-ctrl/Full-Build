import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isBrainActivationAllowed } from './activationGateDecision';

const passing = {
  corpusPassed: true,
  adversarialPassed: true,
  observedGateCount: 46,
  requiredGateCount: 46,
  nonPassedGateCount: 0
};

assert.equal(isBrainActivationAllowed(passing), true, 'all conditions passing should activate');
assert.equal(isBrainActivationAllowed({ ...passing, corpusPassed: false }), false, 'failed corpus must block');
assert.equal(isBrainActivationAllowed({ ...passing, adversarialPassed: false }), false, 'failed adversarial checks must block');
assert.equal(isBrainActivationAllowed({ ...passing, observedGateCount: 45 }), false, 'missing gate must block');
assert.equal(isBrainActivationAllowed({ ...passing, observedGateCount: 47 }), false, 'unexpected extra gate must block');
assert.equal(isBrainActivationAllowed({ ...passing, requiredGateCount: 45 }), false, 'altered mandatory gate count must block');
assert.equal(isBrainActivationAllowed({ ...passing, nonPassedGateCount: 1 }), false, 'any non-passed gate must block');
assert.equal(isBrainActivationAllowed({ ...passing, nonPassedGateCount: 46 }), false, 'all blocked gates must block');

// Guard against regression to the previous corpus-only process exit.
const verifierSource = readFileSync(new URL('./verify_120_aggregation.ts', import.meta.url), 'utf8');
assert.match(verifierSource, /if\\s*\\(!brainActive\\s*&&[\\s\\S]*?process\\.exit\\(1\\)/, 'verifier must exit nonzero on production activation failure');

console.log('Activation gate regression tests passed (8 assertions).');
