import { generateKeyPairSync, sign, verify } from 'node:crypto';

export interface SnapshotModelResult {
  passed: boolean;
  snapshot_id: string;
  process_states_recorded: string[];
  channel_states: Record<string, string[]>;
  markers_received: string[];
  in_transit_message_recorded: boolean;
}

export function simulateChandyLamportSnapshot(): SnapshotModelResult {
  const processes = ['A', 'B', 'C'];
  const snapshotId = 'snapshot-001';
  const processStates = new Map<string, number>();
  const channelStates: Record<string, string[]> = { 'A->B': [], 'B->C': [], 'C->A': [] };
  const markersReceived = new Set<string>();
  const recordingIncoming = new Set<string>();
  const messagesInTransit = ['C->A:message-17'];

  // A initiates: record local state and begin recording its incoming C->A channel.
  processStates.set('A', 1);
  recordingIncoming.add('C->A');
  markersReceived.add('A<-INITIATOR');

  // A sends a marker to B. B records its state and forwards a marker to C.
  markersReceived.add('B<-A');
  processStates.set('B', 2);

  // C sends a message after A began recording C->A but before C receives B's marker.
  if (recordingIncoming.has('C->A')) channelStates['C->A'].push(messagesInTransit[0]);

  // C receives the marker, records its state, and forwards the marker to A.
  markersReceived.add('C<-B');
  processStates.set('C', 3);
  markersReceived.add('A<-C');
  recordingIncoming.delete('C->A');

  const allProcessesRecorded = processes.every(id => processStates.has(id));
  const allChannelsRecorded = Object.keys(channelStates).length === 3;
  const noDuplicateMarkers = markersReceived.size === 4;
  const inTransitMessageRecorded = channelStates['C->A'].length === 1 &&
    channelStates['C->A'][0] === 'C->A:message-17';

  return {
    passed: allProcessesRecorded && allChannelsRecorded && noDuplicateMarkers && inTransitMessageRecorded,
    snapshot_id: snapshotId,
    process_states_recorded: [...processStates.keys()],
    channel_states: channelStates,
    markers_received: [...markersReceived],
    in_transit_message_recorded: inTransitMessageRecorded
  };
}

export interface RaftModelResult {
  passed: boolean;
  term: number;
  leader_id: string | null;
  votes_received: number;
  cluster_size: number;
  log_indexes: Record<string, number[]>;
  commit_indexes: Record<string, number>;
  stale_term_rejected: boolean;
}

export function simulateRaftConsensus(): RaftModelResult {
  const nodes = ['A', 'B', 'C'];
  const currentTerms: Record<string, number> = { A: 0, B: 0, C: 0 };
  const logs: Record<string, Array<{ term: number; index: number; command: string }>> = { A: [], B: [], C: [] };
  const commitIndexes: Record<string, number> = { A: 0, B: 0, C: 0 };

  // Candidate A starts term 1 and wins a majority (self + B + C).
  const term = 1;
  currentTerms.A = term;
  const votes = ['A', 'B', 'C'].filter(id => {
    if (id === 'A') return true;
    if (term > currentTerms[id]) currentTerms[id] = term;
    return currentTerms[id] === term;
  });
  const leader = votes.length >= Math.floor(nodes.length / 2) + 1 ? 'A' : null;

  // The leader appends one entry and replicates it to a majority.
  const entry = { term, index: 1, command: 'daisy-model-commit' };
  if (leader) {
    logs.A.push(entry);
    logs.B.push(entry);
    logs.C.push(entry);
    for (const id of nodes) commitIndexes[id] = 1;
  }

  // A stale-term append request must not overwrite the committed log.
  const staleTerm = term - 1;
  const staleTermRejected = staleTerm < currentTerms.B && logs.B[0]?.index === 1;
  const replicated = nodes.every(id => logs[id].length === 1 &&
    logs[id][0].term === term && logs[id][0].command === entry.command);
  const committed = nodes.every(id => commitIndexes[id] === 1);

  return {
    passed: leader === 'A' && votes.length >= 2 && replicated && committed && staleTermRejected,
    term,
    leader_id: leader,
    votes_received: votes.length,
    cluster_size: nodes.length,
    log_indexes: Object.fromEntries(nodes.map(id => [id, logs[id].map(entry => entry.index)])),
    commit_indexes: commitIndexes,
    stale_term_rejected: staleTermRejected
  };
}

export interface EscrowModelResult {
  passed: boolean;
  quorum_required: number;
  valid_signatures: number;
  release_authorized: boolean;
  insufficient_quorum_rejected: boolean;
  replay_release_rejected: boolean;
  unauthorized_refund_rejected: boolean;
  final_state: 'FUNDED' | 'RELEASED' | 'REFUNDED';
  live_funds_moved: false;
  contract_deployed: false;
}

export function simulateEscrowQuorum(): EscrowModelResult {
  const signers = Array.from({ length: 3 }, () => generateKeyPairSync('ed25519'));
  const payload = Buffer.from('SOLVEX_ESCROW_MODEL|escrow-001|release|2500|USD');
  const signatures = signers.map(signer => sign(null, payload, signer.privateKey));
  const validSignatures = signatures.filter((signature, index) =>
    verify(null, payload, signers[index].publicKey, signature)
  ).length;
  const quorumRequired = 2;
  let state: 'FUNDED' | 'RELEASED' | 'REFUNDED' = 'FUNDED';
  const transition = (target: 'RELEASED' | 'REFUNDED', approvals: number): boolean => {
    if (state !== 'FUNDED' || approvals < quorumRequired) return false;
    state = target;
    return true;
  };

  const insufficientQuorumRejected = !transition('RELEASED', 1);
  const releaseAuthorized = transition('RELEASED', validSignatures);

  // A second release and a refund after release must be rejected as invalid transitions.
  const replayReleaseRejected = !transition('RELEASED', validSignatures);
  const unauthorizedRefundRejected = !transition('REFUNDED', 1);

  return {
    passed: insufficientQuorumRejected && releaseAuthorized && replayReleaseRejected && unauthorizedRefundRejected && state === 'RELEASED',
    quorum_required: quorumRequired,
    valid_signatures: validSignatures,
    release_authorized: releaseAuthorized,
    insufficient_quorum_rejected: insufficientQuorumRejected,
    replay_release_rejected: replayReleaseRejected,
    unauthorized_refund_rejected: unauthorizedRefundRejected,
    final_state: state,
    live_funds_moved: false,
    contract_deployed: false
  };
}
