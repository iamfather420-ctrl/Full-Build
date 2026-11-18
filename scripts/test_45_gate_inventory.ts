import assert from 'node:assert/strict';
import { validateVerificationGateCatalog, SOLVEX_VERIFICATION_GATES } from '../src/verification/VerificationGateRegistry';

const result = validateVerificationGateCatalog();
const sequence = SOLVEX_VERIFICATION_GATES.filter(g => g.id !== 'GATE-46' && g.layer === 'SYSTEM');
const closure = SOLVEX_VERIFICATION_GATES.filter(g => g.id === 'GATE-46');
assert.equal(result.valid, true, 'verification catalog structure must be valid');
assert.equal(sequence.length, 45, 'the main system sequence must contain exactly 45 gates');
assert.equal(closure.length, 1, 'the subsequent closure gate must be separate');
assert.equal(SOLVEX_VERIFICATION_GATES.filter(g => g.layer === 'PIPELINE').length, 21);
assert.equal(result.total, 67, 'the combined catalog remains 45 + 1 closure + 21 pipeline stages');
console.log('PASS: 45 sequential system gates, separate GATE-46, and 21 pipeline stages.');
