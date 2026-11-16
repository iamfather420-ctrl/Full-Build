import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { FileLearningBubbleStore } from './FileLearningBubbleStore.ts';
import { LearningBubbleRegistry } from './LearningBubbleRegistry.ts';

test('a Learning Bubble survives a new process-level store and stays ineligible when unverified', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'daisy-bubbles-'));
  const content = 'captured observation';
  const store = new FileLearningBubbleStore(directory);
  const created = new LearningBubbleRegistry(store).create({
    content,
    source: {
      source_id: 'src-1',
      source_type: 'note',
      captured_at: new Date().toISOString(),
      source_sha256: createHash('sha256').update('source bytes').digest('hex'),
      captured_content_sha256: createHash('sha256').update(content).digest('hex'),
    },
    evidence_refs: [],
    verification: 'UNREVIEWED',
    license_status: 'UNKNOWN',
    paradox_ids: [],
    node_ids: ['DN-01'],
    synapse_ids: [],
    contradiction_refs: [],
  });
  const stored = new FileLearningBubbleStore(directory).get(created.bubble_id);
  assert.equal(stored?.content, content);
  assert.equal(stored?.training_eligibility, 'INELIGIBLE');
  assert.equal(new LearningBubbleRegistry(new FileLearningBubbleStore(directory)).getTrainingEligible().length, 0);
});
