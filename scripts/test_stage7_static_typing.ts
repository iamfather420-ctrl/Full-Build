import assert from 'node:assert/strict';
import { verifyStaticTyping } from '../src/solutions/StaticTypingVerifier';

const valid = verifyStaticTyping('const answer: number = 42;');
assert.equal(valid.passed, true, 'valid strict TypeScript should pass');
assert.equal(valid.diagnostics.length, 0);

const mismatch = verifyStaticTyping('const answer: string = 42;');
assert.equal(mismatch.passed, false, 'type mismatch must fail closed');
assert.ok(mismatch.diagnostics.length > 0);

const implicitAny = verifyStaticTyping('function identity(value) { return value; }');
assert.equal(implicitAny.passed, false, 'implicit any must fail strict checking');

const undeclared = verifyStaticTyping('const answer = missingSymbol;');
assert.equal(undeclared.passed, false, 'undeclared symbols must fail');

const malformed = verifyStaticTyping('const answer: number = ;');
assert.equal(malformed.passed, false, 'syntax errors must fail');

const empty = verifyStaticTyping('  ');
assert.equal(empty.passed, false, 'empty source must fail');

console.log('STAGE_7_STATIC_TYPING_TESTS=PASS valid=1 type_mismatch=1 implicit_any=1 undeclared_symbol=1 syntax_error=1 empty_source=1');
