import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { InMemoryLearningBubbleStore, LearningBubbleRegistry, type LearningBubbleInput } from './LearningBubbleRegistry';
import { DaisyBrainGraph, type SynapseManifest } from './DaisyBrainGraph';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

function bubbleInput(overrides: Partial<LearningBubbleInput> = {}): LearningBubbleInput {
  const content = 'Evidence-backed learning example';
  return {
    content,
    source: { source_id: 'src-1', source_type: 'research', captured_at: new Date().toISOString(), source_sha256: hash('original source document'), captured_content_sha256: hash(content) },
    evidence_refs: ['evidence-1'],
    verification: 'VERIFIED' as const,
    license_status: 'AUTHORIZED' as const,
    paradox_ids: ['DFRL-P-001'],
    node_ids: ['DN-01'],
    synapse_ids: ['DS-001'],
    contradiction_refs: [],
    ...overrides,
  };
}

test('Learning Bubble becomes training eligible only with verified, licensed, hash-matched evidence', () => {
  const registry = new LearningBubbleRegistry(new InMemoryLearningBubbleStore());
  const eligible = registry.create(bubbleInput());
  assert.equal(eligible.training_eligibility, 'ELIGIBLE');
  assert.equal(registry.getTrainingEligible().length, 1);

  const unverified = registry.create(bubbleInput({ verification: 'PENDING' }));
  assert.equal(unverified.training_eligibility, 'INELIGIBLE');
  const unlicensed = registry.create(bubbleInput({ license_status: 'UNKNOWN' }));
  assert.equal(unlicensed.training_eligibility, 'INELIGIBLE');
  const conflicted = registry.create(bubbleInput({ contradiction_refs: ['bubble-other'] }));
  assert.equal(conflicted.training_eligibility, 'INELIGIBLE');
});

test('verified Bubble rejects source/content hash mismatch', () => {
  const registry = new LearningBubbleRegistry(new InMemoryLearningBubbleStore());
  assert.throws(() => registry.create(bubbleInput({ source: { ...bubbleInput().source, captured_content_sha256: hash('different') } })), /content hash/);
});

test('Learning Bubble revisions preserve identity and increment version', () => {
  const registry = new LearningBubbleRegistry(new InMemoryLearningBubbleStore());
  const first = registry.create(bubbleInput());
  const second = registry.revise(first.bubble_id, bubbleInput({ content: 'Revised content', source: { source_id: 'src-2', source_type: 'research', captured_at: new Date().toISOString(), source_sha256: hash('revised original source'), captured_content_sha256: hash('Revised content') } }));
  assert.equal(second.bubble_id, first.bubble_id);
  assert.equal(second.version, 2);
});

test('brain graph refuses to invent or accept a missing 120-edge manifest', () => {
  const manifest: SynapseManifest = {
    schema_version: '1.0.0', topology_id: 'test-topology', expected_node_count: 54,
    expected_synapse_count: 120, source_ref: 'authoritative-source', source_sha256: hash('source'), synapses: [],
  };
  assert.equal(DaisyBrainGraph.validate(manifest).valid, false);
  assert.throws(() => new DaisyBrainGraph(manifest), /Exactly 120/);
});
