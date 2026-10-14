import { computeSha256 } from '../database/DatabaseSchema';

type DfrlCase = {
  operator_id: string;
  assertion_hash: string;
  actual_smt_assertion_hash: string;
  solver_version: string;
  solver_result: string;
  proved: boolean;
  certificate_sha256: string;
  execution_id: string;
  timestamp: string;
};
type DfrlReplay = {
  operator_id: string;
  original_execution_id: string;
  replay_execution_id: string;
  original_assertion_hash: string;
  replay_assertion_hash: string;
  original_result: string;
  replay_result: string;
  original_evidence_hash: string;
  replay_evidence_hash: string;
  replay_match: boolean;
};
type DhCase = {
  case_id: string;
  contract_hash: string;
  expected_result: string;
  actual_result: string;
  replay_result: string;
  replay_match: boolean;
  verified: boolean;
  scope: string;
  solver_version: string;
  source_content_hash: string;
  source_integrity: string;
  evidence_integrity: string;
  evidence_hash: string;
  execution_id: string;
  timestamp: string;
};
type DhReplay = {
  case_id: string;
  original_result: string;
  replay_result: string;
  replay_match: boolean;
  original_evidence_hash: string;
  replay_evidence_hash: string;
  cleanroom_context_id: string;
  timestamp: string;
};

export interface FormalEvidenceHashes {
  dfrl_corpus_root_sha256: string;
  dh_corpus_root_sha256: string;
  corpus_root_sha256: string;
  run_evidence_sha256: string;
}

/**
 * Stable corpus roots bind canonical case identities, SMT/contract hashes,
 * solver versions, outcomes, replay outcomes, and integrity flags. They
 * deliberately exclude execution IDs, timestamps, durations, and per-run
 * certificate hashes. The separate run receipt binds those volatile records.
 */
export function buildFormalEvidenceHashes(
  commitSha: string,
  dfrl: { results: DfrlCase[]; replays: DfrlReplay[]; execution_id: string; timestamp: string; verification_root_sha256: string },
  dh: { results: DhCase[]; replays: DhReplay[]; execution_id: string; timestamp: string; verification_root_sha256: string }
): FormalEvidenceHashes {
  const dfrlCases = dfrl.results.map(r => [
    r.operator_id, r.assertion_hash, r.actual_smt_assertion_hash,
    r.solver_version, r.solver_result, r.proved
  ]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const dhCases = dh.results.map(r => [
    r.case_id, r.contract_hash, r.expected_result, r.actual_result,
    r.replay_result, r.replay_match, r.verified, r.scope,
    r.solver_version, r.source_content_hash, r.source_integrity,
    r.evidence_integrity
  ]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const dfrlCorpusRoot = computeSha256(JSON.stringify({
    schema: 'SOLVEX_DFRL_CORPUS_ROOT_V1',
    cases: dfrlCases
  }));
  const dhCorpusRoot = computeSha256(JSON.stringify({
    schema: 'SOLVEX_DH_CORPUS_ROOT_V1',
    cases: dhCases
  }));
  const corpusRoot = computeSha256(JSON.stringify({
    schema: 'SOLVEX_DAISY_FORMAL_CORPUS_ROOT_V1',
    source_commit_sha: commitSha,
    dfrl_root_sha256: dfrlCorpusRoot,
    dh_root_sha256: dhCorpusRoot
  }));

  const runEvidence = computeSha256(JSON.stringify({
    schema: 'SOLVEX_DAISY_FORMAL_RUN_RECEIPT_V1',
    source_commit_sha: commitSha,
    dfrl: {
      execution_id: dfrl.execution_id,
      timestamp: dfrl.timestamp,
      original_root_sha256: dfrl.verification_root_sha256,
      cases: dfrl.results.map(r => [r.operator_id, r.execution_id, r.timestamp, r.certificate_sha256])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
      replays: dfrl.replays.map(r => [
        r.operator_id, r.original_execution_id, r.replay_execution_id,
        r.original_evidence_hash, r.replay_evidence_hash, r.replay_match
      ]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    },
    dh: {
      execution_id: dh.execution_id,
      timestamp: dh.timestamp,
      original_root_sha256: dh.verification_root_sha256,
      cases: dh.results.map(r => [r.case_id, r.execution_id, r.timestamp, r.evidence_hash])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
      replays: dh.replays.map(r => [
        r.case_id, r.cleanroom_context_id, r.timestamp,
        r.original_evidence_hash, r.replay_evidence_hash, r.replay_match
      ]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    }
  }));

  return {
    dfrl_corpus_root_sha256: dfrlCorpusRoot,
    dh_corpus_root_sha256: dhCorpusRoot,
    corpus_root_sha256: corpusRoot,
    run_evidence_sha256: runEvidence
  };
}
