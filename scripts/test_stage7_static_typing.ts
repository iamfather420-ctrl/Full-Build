import assert from 'node:assert/strict';
import { verifyStaticTyping } from '../src/solutions/StaticTypingVerifier';

const valid = verifyStaticTyping('const answer: number = 42;');
assert.equal(valid.passed, true, JSON.stringify(valid));
assert.equal(verifyStaticTyping('const answer: string = 42;').passed, false);
assert.equal(verifyStaticTyping('function identity(value) { return value; }').passed, false);
assert.equal(verifyStaticTyping('const answer = missingSymbol;').passed, false);
assert.equal(verifyStaticTyping('const answer: number = ;').passed, false);
assert.equal(verifyStaticTyping('  ').passed, false);
assert.equal(verifyStaticTyping('x'.repeat(100_001)).passed, false);
console.log('STAGE_7_STATIC_TYPING_TESTS=PASS valid=1 invalid=6');
