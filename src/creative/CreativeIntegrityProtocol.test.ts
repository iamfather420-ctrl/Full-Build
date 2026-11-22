import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCreativeIntegrity, type CreativeIntegrityRequest } from './CreativeIntegrityProtocol';

const base: CreativeIntegrityRequest = {
  task: 'Brainstorm a new software architecture.',
  output: 'A proposed modular architecture with separated services.',
  mode: 'GENERATIVE',
  evidenceLabel: 'PROPOSED',
  audience: 'Software engineering team',
  domain: 'Software design',
  assessments: {
    taskRelevance: 'PASS',
    contextualAppropriateness: 'PASS',
    safety: 'PASS',
    evidenceIntegrity: 'PASS',
  },
};

test('allows relevant and appropriately assessed creative proposals', () => {
  assert.equal(evaluateCreativeIntegrity(base).decision, 'ALLOW');
});

test('blocks output without a concrete task', () => {
  assert.equal(evaluateCreativeIntegrity({ ...base, task: ' ' }).decision, 'BLOCKED');
});

test('requires review when an assessment is unknown', () => {
  const result = evaluateCreativeIntegrity({
    ...base,
    assessments: { ...base.assessments, contextualAppropriateness: 'UNKNOWN' },
  });
  assert.equal(result.decision, 'REVIEW_REQUIRED');
});

test('blocks inappropriate or unsafe output when an assessment fails', () => {
  const result = evaluateCreativeIntegrity({
    ...base,
    assessments: { ...base.assessments, safety: 'FAIL' },
  });
  assert.equal(result.decision, 'BLOCKED');
});

test('does not allow a verified label without evidence references', () => {
  const result = evaluateCreativeIntegrity({ ...base, evidenceLabel: 'VERIFIED' });
  assert.equal(result.decision, 'BLOCKED');
});

test('requires explicit declaration for simulated output', () => {
  const result = evaluateCreativeIntegrity({ ...base, evidenceLabel: 'SIMULATED' });
  assert.equal(result.decision, 'BLOCKED');
});

test('blocks simulated output that claims real execution', () => {
  const result = evaluateCreativeIntegrity({
    ...base,
    evidenceLabel: 'SIMULATED',
    simulationDeclared: true,
    claimsActualExecution: true,
  });
  assert.equal(result.decision, 'BLOCKED');
});

test('requires explicit authorization for executable creativity', () => {
  const result = evaluateCreativeIntegrity({ ...base, mode: 'EXECUTABLE' });
  assert.equal(result.decision, 'BLOCKED');
});

test('requires execution evidence for claims that code ran', () => {
  const result = evaluateCreativeIntegrity({ ...base, claimsActualExecution: true });
  assert.equal(result.decision, 'BLOCKED');
});

test('allows verified output only with passing assessment and evidence reference', () => {
  const result = evaluateCreativeIntegrity({
    ...base,
    evidenceLabel: 'VERIFIED',
    evidence: [{ kind: 'TEST', id: 'ci-run-123' }],
  });
  assert.equal(result.decision, 'ALLOW');
});
