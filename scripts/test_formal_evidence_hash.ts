import assert from 'node:assert/strict';
import { buildFormalEvidenceHashes } from '../src/proofs/formalEvidenceHash';

const base = {
  commitSha: 'f3d2da33b5a32e07b5ab1cfb4bbf6b84ad7e8308',
  dfrl: {
    execution_id: 'dfrl-run-1',
    timestamp: '2026-10-14T00:00:00.000Z',
    verification_root_sha256: 'run-root-a',
    results: [{
      operator_id: 'DFRL-P-001', assertion_hash: 'assertion-a',
      actual_smt_assertion_hash: 'smt-a', solver_version: 'z3-wasm-5.2',
      solver_result: 'unsat', proved: true, certificate_sha256: 'cert-a',
      execution_id: 'case-run-1', timestamp: '2026-10-14T00:00:00.000Z'
    }],
    replays: [{
      operator_id: 'DFRL-P-001', original_execution_id: 'case-run-1',
      replay_execution_id: 'replay-1', original_assertion_hash: 'smt-a',
      replay_assertion_hash: 'smt-a', original_result: 'unsat',
      replay_result: 'unsat', original_evidence_hash: 'cert-a',
      replay_evidence_hash: 'replay-cert-a', replay_match: true
    }]
  },
  dh: {
    execution_id: 'dh-run-1',
    timestamp: '2026-10-14T00:00:00.000Z',
    verification_root_sha256: 'run-root-b',
    results: [{
      case_id: 'DH-P-019', contract_hash: 'contract-a',
      expected_result: 'sat', actual_result: 'sat', replay_result: 'sat',
      replay_match: true, verified: true, scope: 'MODEL_VERIFIED',
      solver_version: 'z3-wasm-5.2', source_content_hash: 'source-a',
      source_integrity: 'PASS', evidence_integrity: 'PASS',
      evidence_hash: 'dh-cert-a', execution_id: 'dh-case-run-1',
      timestamp: '2026-10-14T00:00:00.000Z'
    }],
    replays: [{
      case_id: 'DH-P-019', original_result: 'sat', replay_result: 'sat',
      replay_match: true, original_evidence_hash: 'dh-cert-a',
      replay_evidence_hash: 'dh-replay-a', cleanroom_context_id: 'ctx-1',
      timestamp: '2026-10-14T00:00:00.000Z'
    }]
  }
};

const first = buildFormalEvidenceHashes(base.commitSha, base.dfrl, base.dh);
const rerun = buildFormalEvidenceHashes(base.commitSha, {
  ...base.dfrl,
  execution_id: 'dfrl-run-2',
  timestamp: '2026-10-14T00:01:00.000Z',
  verification_root_sha256: 'run-root-c',
  results: base.dfrl.results.map(r => ({ ...r, execution_id: 'case-run-2', timestamp: '2026-10-14T00:01:00.000Z', certificate_sha256: 'cert-b' })),
  replays: base.dfrl.replays.map(r => ({ ...r, original_execution_id: 'case-run-2', replay_execution_id: 'replay-2', original_evidence_hash: 'cert-b', replay_evidence_hash: 'replay-cert-b' }))
}, {
  ...base.dh,
  execution_id: 'dh-run-2',
  timestamp: '2026-10-14T00:01:00.000Z',
  verification_root_sha256: 'run-root-d',
  results: base.dh.results.map(r => ({ ...r, execution_id: 'dh-case-run-2', timestamp: '2026-10-14T00:01:00.000Z', evidence_hash: 'dh-cert-b' })),
  replays: base.dh.replays.map(r => ({ ...r, cleanroom_context_id: 'ctx-2', timestamp: '2026-10-14T00:01:00.000Z', original_evidence_hash: 'dh-cert-b', replay_evidence_hash: 'dh-replay-b' }))
});

assert.equal(first.corpus_root_sha256, rerun.corpus_root_sha256, 'corpus identity must be stable across reruns');
assert.equal(first.dfrl_corpus_root_sha256, rerun.dfrl_corpus_root_sha256);
assert.equal(first.dh_corpus_root_sha256, rerun.dh_corpus_root_sha256);
assert.notEqual(first.run_evidence_sha256, rerun.run_evidence_sha256, 'run receipt must remain unique per execution');

// A semantic outcome change must change the corpus identity.
const changed = buildFormalEvidenceHashes(base.commitSha, {
  ...base.dfrl,
  results: base.dfrl.results.map(r => ({ ...r, solver_result: 'sat', proved: false }))
}, base.dh);
assert.notEqual(first.corpus_root_sha256, changed.corpus_root_sha256, 'changed solver outcomes must change the corpus root');

console.log('PASS: deterministic corpus roots; distinct run receipts; semantic changes alter corpus root.');
