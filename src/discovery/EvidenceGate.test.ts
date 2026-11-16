import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyAssertion, type Assertion } from './EvidenceGate.ts';

function source(text: string, id = 'src-1') {
  return { id, text, sha256: createHash('sha256').update(text).digest('hex') };
}

function assertion(overrides: Partial<Assertion> = {}): Assertion {
  return {
    id: 'claim-1',
    text: 'The holdout loss decreased.',
    sources: [source('The holdout loss decreased.')],
    solvers: [],
    ...overrides,
  };
}

test('withholds an assertion that has no second solver', () => {
  const result = classifyAssertion(assertion({ solvers: [{ solverId: 'a', verdict: 'support', inputSha256: '0'.repeat(64) }] }));
  assert.equal(result.status, 'unverified_claim');
  assert.equal(result.publishable, false);
});

test('withholds missing evidence and mismatched source bytes', () => {
  assert.equal(classifyAssertion(assertion({ sources: [] })).status, 'insufficient_evidence');
  const broken = source('measured');
  broken.text = 'rewritten';
  assert.equal(classifyAssertion(assertion({ sources: [broken] })).status, 'insufficient_evidence');
});

test('withholds contradictions and does not count one solver twice', () => {
  const base = assertion();
  const digest = createHash('sha256').update(JSON.stringify({ id: base.id, text: base.text.trim() })).digest('hex');
  assert.equal(classifyAssertion(assertion({
    sources: [source('one reading', 'a'), source('another reading', 'b')],
  })).status, 'contradiction');
  assert.equal(classifyAssertion(assertion({
    solvers: [
      { solverId: 'same', verdict: 'support', inputSha256: digest },
      { solverId: 'same', verdict: 'support', inputSha256: digest },
    ],
  })).status, 'unverified_claim');
  assert.equal(classifyAssertion(assertion({
    solvers: [
      { solverId: 'a', verdict: 'support', inputSha256: digest },
      { solverId: 'b', verdict: 'contradict', inputSha256: digest },
    ],
  })).status, 'contradiction');
});

test('publishes only when two solvers bind the exact assertion', () => {
  const base = assertion();
  const digest = createHash('sha256').update(JSON.stringify({ id: base.id, text: base.text.trim() })).digest('hex');
  const result = classifyAssertion(assertion({
    solvers: [
      { solverId: 'discovery', verdict: 'support', inputSha256: digest },
      { solverId: 'replay', verdict: 'support', inputSha256: digest },
    ],
  }));
  assert.equal(result.status, 'verified_fact');
  assert.equal(result.publishable, true);
});
