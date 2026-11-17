import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { FileLearningBubbleStore } from './FileLearningBubbleStore';
import { LearningBubbleRegistry, type LearningBubbleInput } from './LearningBubbleRegistry';
import { paradoxSolverEdges } from './ParadoxPathway';
import { runTetherSession } from './TetherSession';
import { DaisySubsystemExecutors } from '../nodes/DaisySubsystemExecutors';
import { compareToCanonical, DRIFT_CANONICAL_SHA256 } from '../nodes/driftCheck';
import { recoverProhibitedNode, restoreCanonical } from '../nodes/selfHeal';
import { happensBefore, receive, tick } from '../nodes/vectorClock';

function eligibleInput(content: string, evidence: string[]): LearningBubbleInput {
  return {
    content,
    source: {
      source_id: 'press-1',
      source_type: 'publication',
      captured_at: '2020-01-02T00:00:00.000Z',
      source_sha256: createHash('sha256').update('source-document').digest('hex'),
      captured_content_sha256: createHash('sha256').update(content).digest('hex'),
    },
    evidence_refs: evidence,
    verification: 'VERIFIED',
    license_status: 'AUTHORIZED',
    paradox_ids: ['DH-P-002'],
    node_ids: ['DN-21'],
    synapse_ids: [],
    contradiction_refs: [],
  };
}

test('vector clocks record happens-before and leave concurrent events incomparable', () => {
  const sent = tick({}, 'A');
  const received = receive({}, sent, 'B');
  const other = tick({}, 'C');
  assert.equal(happensBefore(sent, received), true);
  assert.equal(happensBefore(sent, other), false);
  assert.equal(happensBefore(other, sent), false);
});

test('drift recovery restores canonical bytes and a prohibited node is not retried', () => {
  const canonical = Buffer.from('daisy-drift-canonical-v1\n');
  assert.equal(compareToCanonical(canonical, DRIFT_CANONICAL_SHA256).matches, true);
  const damaged = Buffer.from('damaged');
  const healed = restoreCanonical(damaged, canonical);
  assert.equal(healed.faultDetected, true);
  assert.equal(healed.recovered, true);
  assert.equal(healed.independentHashMatches, true);
  const prohibited = recoverProhibitedNode('DN-36');
  assert.equal(prohibited.retried, false);
  assert.equal(prohibited.escalated, true);
});

test('a verified bubble records a new paradox result and refuses a no-op revision', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'daisy-recursive-'));
  const registry = new LearningBubbleRegistry(new FileLearningBubbleStore(directory));
  const created = registry.create(eligibleInput('Russell is contradictory under naive comprehension.', ['source-hash']));
  const revised = registry.revise(created.bubble_id, eligibleInput('Russell is contradictory under naive comprehension.', ['source-hash', 'THM-RUSSELL-01']));
  assert.equal(revised.version, 2);
  assert.equal(revised.history.length, 1);
  assert.equal(revised.history[0]?.evidence_refs.length, 1);
  assert.equal(revised.training_eligibility, 'ELIGIBLE');
  const reloaded = new FileLearningBubbleStore(directory).get(created.bubble_id);
  assert.equal(reloaded?.version, 2);
  assert.throws(() => registry.revise(created.bubble_id, eligibleInput('Russell is contradictory under naive comprehension.', ['source-hash', 'THM-RUSSELL-01'])));
});

test('tether runs the resolution node and the five catalog paradox solvers', async () => {
  const executors = new DaisySubsystemExecutors();
  const edges = paradoxSolverEdges();
  assert.equal(edges.length, 5);
  const session = await runTetherSession({
    edges,
    start: 'DN-20',
    goal: 'DN-21',
    execute: (nodeId) => executors.executeNode(nodeId),
  });
  assert.equal(session.reachedGoal, true);
  assert.deepEqual(session.activations.map((item) => item.status), ['SUCCESS', 'SUCCESS']);
  const solvers = ['DN-21', 'DN-22', 'DN-23', 'DN-24', 'DN-26'];
  for (const nodeId of solvers) {
    const result = await executors.executeNode(nodeId);
    assert.equal(result.status, 'SUCCESS', nodeId);
    assert.equal(result.evidence.solver_result ?? result.evidence.result, 'unsat');
  }
  const buraliForti = await executors.executeNode('DN-25');
  assert.equal(buraliForti.status, 'SUCCESS');
  assert.equal(buraliForti.evidence.paradox_id, 'DH-P-009');
  assert.equal(buraliForti.evidence.solver_result, 'unsat');
  const settlement = await executors.executeNode('DN-36');
  assert.equal(settlement.status, 'PROHIBITED_BLOCKED');
  const lean = await executors.executeNode('DN-40');
  assert.equal(lean.status, 'FAIL_CLOSED');
});
