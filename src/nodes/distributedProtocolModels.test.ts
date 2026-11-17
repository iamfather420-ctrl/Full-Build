import assert from 'node:assert/strict';
import { test } from 'node:test';
import { simulateChandyLamportSnapshot, simulateRaftConsensus } from './distributedProtocolModels';

test('Chandy-Lamport records every process and an in-transit channel message', () => {
  const result = simulateChandyLamportSnapshot();
  assert.equal(result.passed, true);
  assert.deepEqual(result.process_states_recorded.sort(), ['A', 'B', 'C']);
  assert.equal(result.in_transit_message_recorded, true);
  assert.equal(result.channel_states['C->A'].length, 1);
});

test('Raft elects a majority leader, replicates a log entry, and rejects stale terms', () => {
  const result = simulateRaftConsensus();
  assert.equal(result.passed, true);
  assert.equal(result.leader_id, 'A');
  assert.equal(result.votes_received, 3);
  assert.equal(result.stale_term_rejected, true);
  assert.deepEqual(result.commit_indexes, { A: 1, B: 1, C: 1 });
});
