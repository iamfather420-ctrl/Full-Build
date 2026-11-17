import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { FileLearningBubbleStore } from './FileLearningBubbleStore';
import { LearningBubbleRegistry } from './LearningBubbleRegistry';
import { createHash } from 'node:crypto';
import { DaisySubsystemExecutors } from '../nodes/DaisySubsystemExecutors';
import { classifySource } from '../learning/SourceFirewall';
import { runTetherSession } from './TetherSession';

test('two independent hash matches can be trusted, and a disagreeing hash cannot', () => {
  const hash = 'b'.repeat(64);
  const trusted = classifySource({
    uri: 'https://publisher.example/paper',
    publisher: 'Example Press',
    authors: ['A. Author'],
    publishedAt: '2020-01-01',
    contentSha256: hash,
    corroborations: [
      { publisher: 'Archive One', contentSha256: hash },
      { publisher: 'Archive Two', contentSha256: hash },
    ],
  });
  assert.equal(trusted.klass, 'VERIFIED');
  assert.equal(trusted.trustedForLearning, true);
  const conflict = classifySource({
    publisher: 'Example Press',
    authors: ['A. Author'],
    publishedAt: '2020-01-01',
    contentSha256: hash,
    corroborations: [{ publisher: 'Archive One', contentSha256: 'c'.repeat(64) }],
  });
  assert.equal(conflict.klass, 'QUARANTINED');
  assert.equal(conflict.trustedForLearning, false);
});

test('a domain suffix is quarantined and cannot become a trusted bubble', () => {
  const decision = classifySource({ uri: 'https://example.gov/note', contentSha256: 'a'.repeat(64) });
  assert.equal(decision.klass, 'QUARANTINED');
  assert.equal(decision.trustedForLearning, false);
  const directory = mkdtempSync(path.join(tmpdir(), 'daisy-firewall-'));
  const registry = new LearningBubbleRegistry(new FileLearningBubbleStore(directory));
  const content = 'unverified government-looking note';
  const bubble = registry.create({
    content,
    source: {
      source_id: 'example.gov',
      source_type: 'web',
      uri: 'https://example.gov/note',
      captured_at: new Date().toISOString(),
      source_sha256: createHash('sha256').update('source').digest('hex'),
      captured_content_sha256: createHash('sha256').update(content).digest('hex'),
    },
    evidence_refs: [],
    verification: 'UNREVIEWED',
    license_status: 'UNKNOWN',
    paradox_ids: [],
    node_ids: [],
    synapse_ids: [],
    contradiction_refs: [],
  });
  assert.equal(bubble.training_eligibility, 'INELIGIBLE');
  assert.equal(new LearningBubbleRegistry(new FileLearningBubbleStore(directory)).getTrainingEligible().length, 0);
});

test('tether fires real nodes, isolates the prohibited settlement node, and does not upgrade it', async () => {
  const executors = new DaisySubsystemExecutors();
  const session = await runTetherSession({
    edges: [
      { from: 'DN-01', to: 'DN-06', relation: 'audit-chain' },
      { from: 'DN-06', to: 'DN-36', relation: 'must-not-settle' },
    ],
    start: 'DN-01',
    goal: 'DN-36',
    execute: (nodeId) => executors.executeNode(nodeId),
    maxActivations: 4,
  });
  assert.deepEqual(session.activations.map((item) => item.nodeId), ['DN-01', 'DN-06', 'DN-36']);
  assert.equal(session.activations[0]?.status, 'SUCCESS');
  assert.equal(session.activations[1]?.status, 'SUCCESS');
  assert.equal(session.activations[2]?.status, 'PROHIBITED_BLOCKED');
  assert.deepEqual(session.isolated, ['DN-36']);
  assert.equal(session.reachedGoal, false);
  assert.equal(session.activations.filter((item) => item.nodeId === 'DN-36').length, 1);
});
