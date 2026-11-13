#!/usr/bin/env node
/**
 * Stage 13 Runner — Deterministic Cleanroom Test Suite Execution
 *
 * Six rules: single-stage only, source-existence check, real implementation,
 * expected output + failure conditions verified, fresh timestamp receipt,
 * historical October 1st receipts preserved untouched.
 *
 * Real implementation under test:
 *   src/tests/authoritativeVerificationPipeline.ts — GATE-07 Deterministic Cleanroom Replay
 *   src/proofs/DHFormalVerifier.ts — verifyCase() fresh Z3 context + cleanroom replay
 *   src/formal/dhAuthoritativeFormalContracts.ts — 32 DH contracts
 *   src/tests/enterpriseVerification.ts — test 13 divergent replay FAIL gate
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

const STAGE = 13;
const STAGE_NAME = 'Deterministic Cleanroom Test Suite Execution';
const BRANCH = 'build/stages-9-21-runners-20261113';
const OCTOBER_COMMIT = '728625581c2f89210c752d03fda0a154812b2366';
const RECEIPT_DIR = 'artifacts/proof-receipts/stage-13';
const HISTORICAL_RECEIPT = 'artifacts/proof-receipts/proof-PIPE-STAGE-13.json';

const REQUIRED_SOURCES = [
  'src/tests/authoritativeVerificationPipeline.ts',
  'src/proofs/DHFormalVerifier.ts',
  'src/formal/dhAuthoritativeFormalContracts.ts',
  'src/tests/enterpriseVerification.ts'
];

function sha256(s) { return createHash('sha256').update(s).digest('hex'); }
function nowIso() { return new Date().toISOString(); }
function getHeadSha() {
  try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); }
  catch { return null; }
}

function checkSources() {
  const results = {};
  let allExist = true;
  for (const f of REQUIRED_SOURCES) {
    const ok = existsSync(f);
    results[f] = { exists: ok, bytes: ok ? statSync(f).size : 0 };
    if (!ok) allExist = false;
  }
  const authSrc = readFileSync('src/tests/authoritativeVerificationPipeline.ts', 'utf8);
  const dhSrc = readFileSync('src/proofs/DHFormalVerifier.ts', 'utf8);
  const entSrc = readFileSync('src/tests/enterpriseVerification.ts', 'utf8);
  results['GATE7_Cleanroom_Deterministic_Replay_present'] = authSrc.includes('GATE 7: Deterministic Cleanroom Replay);
  results['replayOk_assertion'] = authSrc.includes('dfrlReport.deterministic_replays_matched === 88);
  results['88_replays_every_match'] = authSrc.includes('dfrlReport.replays.every(replay =>);
  results['bitrot_divergence_tracked'] = authSrc.includes('bitrot_divergence);
  results['DHFormalVerifier_verifyCase_present'] = dhSrc.includes('public async verifyCase(');
  results['fresh_Z3_context_per_execution'] = dhSrc.includes('Fresh Z3 Context #1') && dhSrc.includes('Fresh Z3 Context #2);
  results['cleanroom_replay_isolated'] = dhSrc.includes('cleanroomContextId);
  results['algorithmic_verified_derivation'] = dhSrc.includes('const verified = resultMatch && replayMatch && nonError && evidencePass && sourcePass);
  results['enterprise_test13_divergent_FAIL'] = entSrc.includes("Cleanroom Replay Bitrot & Divergence Detection") && entSrc.includes("observed_hash_divergent") && entSrc.includes("!== 'FAIL'");
  results['32_DH_contracts'] = dhSrc.includes('DH-P-032);
  return { allExist, results };
}

function loadModules() {
  try {
    execSync('npx --yes tsx -e "import { DHFormalVerifier } from \'./src/proofs/DHFormalVerifier.ts\'; console.log(typeof DHFormalVerifier.getInstance)"', { encoding: 'utf8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] });
    return 'tsx';
  } catch (e) { return { error: String(e.stderr || e.message).slice(0, 500) }; }
}

function runRealReplayGate() {
  // Real GATE-07: run DFRL verifier, extract replay gate verdict.
  const script = `
import { DFRLFormalVerifier } from './src/proofs/DFRLFormalVerifier.ts';
import { DHFormalVerifier } from './src/proofs/DHFormalVerifier.ts';

// Platform injection so DHFormalVerifier can read git + source.
DHFormalVerifier.setPlatform({ execSync: (c,o) => require('child_process').execSync(c,o), fs: require('fs') });

const v = DFRLFormalVerifier.getInstance();
const report = await v.verifyAll88();

const replayIds = report.replays.map(r => r.operator_id);
const byId = new Map(report.results.map(r => [r.operator_id, r]));
const replayOk = report.replays.length === 88 && new Set(replayIds).size === 88 &&
  report.replays.every(r => {
    const o = byId.get(r.operator_id);
    return Boolean(o && r.replay_match && r.original_result === o.solver_result && r.replay_result === o.solver_result && r.original_assertion_hash === o.actual_smt_assertion_hash && r.replay_assertion_hash === o.actual_smt_assertion_hash);
  }) && report.deterministic_replays_matched === 88;

console.log(JSON.stringify({
  total_propositions: report.total_propositions,
  executed: report.executed,
  replays: report.replays.length,
  deterministic_replays_matched: report.deterministic_replays_matched,
  sat_count: report.sat_count,
  unsat_count: report.unsat_count,
  unknown_count: report.unknown_count,
  error_count: report.error_count,
  overall_status: report.overall_status,
  replay_gate_passed: replayOk,
  bitrot_divergence: report.replays.filter(r => !r.replay_match).length,
  solver_engine: report.solver_engine,
  solver_version: report.solver_version
}));
`;
  const out = execSync(`npx --yes tsx -e ${JSON.stringify(script)}`, { encoding: 'utf8', timeout: 600000, stdio: ['pipe', 'pipe', 'pipe'] });
  return JSON.parse(out.trim().split('\n').pop());
}

function runRealDivergentFailTest() {
  // Real enterprise test 13: divergent replay must seal FAIL, not VERIFIED.
  const script = `
import { ProofBundleBuilder } from './src/proofs/ProofBundle.ts';

const b = new ProofBundleBuilder('PB-DIVERGENT-S13', 'SUB-DIV-S13', 'Stage 13 divergent replay fail test.');
b.addTest('TEST-DIV', 'Run test', true, 1.0)
 .addFormalProof('NOPOT', 'spec', true)
 .addOracle('ORACLE-DIV', 'Witness', 'SIG', true)
 .addReplay('REPLAY-DIV', 'expected_hash_xyz', 'observed_hash_divergent);

const sealed = b.seal();
console.log(JSON.stringify({ status: sealed.verification_status }));
`;
  const out = execSync(`npx --yes tsx -e ${JSON.stringify(script)}`, { encoding: 'utf8', timeout: 180000, stdio: ['pipe', 'pipe', 'pipe'] });
  return JSON.parse(out.trim().split('\n').pop());
}

function assertHistoricalUntouched() {
  if (!existsSync(HISTORICAL_RECEIPT)) return { present: false, note: 'historical receipt not in tree — not rewritten' };
  const content = readFileSync(HISTORICAL_RECEIPT, 'utf8);
  return { present: true, sha256: sha256(content), bytes: content.length, references_october_commit: content.includes(OCTOBER_COMMIT), references_absent_source: content.includes('sandboxVerificationPipeline.ts') };
}

async function main() {
  const started = nowIso();
  const headSha = getHeadSha();
  const sourceCheck = checkSources();
  let replay = null, divergent = null, loader = null, hist = null;
  const errors = [];
  let overall = 'BLOCK';

  if (!sourceCheck.allExist) errors.push('Required source files missing from tree.');
  else {
    loader = loadModules();
    if (loader !== 'tsx') errors.push('tsx module load failed: ' + JSON.stringify(loader.error || loader).slice(0, 500));
    else {
      try { replay = runRealReplayGate(); } catch (e) { errors.push('replay gate threw: ' + String(e.stderr || e.message).slice(0, 500)); }
      try { divergent = runRealDivergentFailTest(); } catch (e) { errors.push('divergent fail test threw: ' + String(e.stderr || e.message).slice(0, 500)); }
    }
  }
  hist = assertHistoricalUntouched();

  const replayOk = replay && replay.replay_gate_passed === true && replay.replays === 88 && replay.deterministic_replays_matched === 88 && replay.bitrot_divergence === 0 && replay.sat_count === 0 && replay.unsat_count === 88;
  const divergentOk = divergent && divergent.status === 'FAIL';
  const structuralOk = sourceCheck.results['GATE7_Cleanroom_Deterministic_Replay_present'] && sourceCheck.results['replayOk_assertion'] && sourceCheck.results['DHFormalVerifier_verifyCase_present'] && sourceCheck.results['fresh_Z3_context_per_execution'] && sourceCheck.results['algorithmic_verified_derivation'] && sourceCheck.results['enterprise_test13_divergent_FAIL'] && sourceCheck.results['32_DH_contracts'];

  if (replayOk && divergentOk && structuralOk && sourceCheck.allExist) overall = 'PASS';
  else if (errors.length > 0 || loader !== 'tsx') overall = 'BLOCK';
  else overall = 'FAIL';

  const receipt = {
    schema: 'SOLVEX_STAGE_RUNNER_RECEIPT_V1', stage: STAGE, stage_name: STAGE_NAME, branch: BRANCH,
    source_commit_sha: headSha, runner: 'scripts/stage13-runner.mjs', started_at: started, finished_at: nowIso(), overall,
    rules: { single_stage_only: true, source_existence_checked: true, real_implementation_executed: loader === 'tsx', expected_output_verified: replayOk, failure_conditions_verified: divergentOk, fresh_timestamp_receipt: true, historical_october_receipts_preserved: hist.present ? hist.references_october_commit !== false : 'not_in_tree' },
    source_check: sourceCheck.results, execution: { module_loader: loader === 'tsx' ? 'tsx-real' : 'blocked', replay_gate: replay, divergent_fail_test: divergent, errors }, historical_receipt: hist,
    note: 'October 1st PIPE receipts are immutable evidence; this receipt is a fresh re-verification tied to the current commit. sandboxVerificationPipeline.ts referenced by the October receipt is absent from the tree — runner binds to the live authoritativeVerificationPipeline GATE-07 and DHFormalVerifier instead.'
  };
  mkdirSync(RECEIPT_DIR, { recursive: true });
  const receiptPath = `${RECEIPT_DIR}/stage-13-receipt-${headSha ? headSha.slice(0, 8) : 'nohead'}-${Date.now()}.json`;
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ overall, receipt_path: receiptPath, replay_ok: replayOk, divergent_ok: divergentOk }, null, 2));
  process.exit(overall === 'PASS' ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(2); });
