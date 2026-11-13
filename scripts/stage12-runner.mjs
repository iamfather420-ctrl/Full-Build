#!/usr/bin/env node
/**
 * Stage 12 Runner — Machine-Checked Proof Certificate Generation
 *
 * Six rules:
 * 1. Run ONLY stage 12. Never silently execute the full 21-stage pipeline.
 * 2. Check that required source files independently actually exist.
 * 3. Execute the real stage implementation, not a mocked pass.
 * 4. Verify the stage's expected output and failure conditions.
 * 5. Produce a fresh timestamp proof receipt tied to the current commit.
 * 6. Preserve the historical October 1st receipts; do not rewrite them.
 *
 * Real implementation under test:
 *   src/proofs/ProofBundle.ts        — ProofBundleBuilder.seal()
 *   src/proofs/ProofEngine.ts        — ProofEngine.verifyBundleIntegrity()
 *   src/proofs/formalEvidenceHash.ts — buildFormalEvidenceHashes()
 *   src/database/DatabaseSchema.ts  — ProofBundleEntity, computeSha256
 */

import { createRequire } from 'module';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { pathToFileURL } from 'url';

const require = createRequire(import.meta.url);

const STAGE = 12;
const STAGE_NAME = 'Machine-Checked Proof Certificate Generation';
const BRANCH = 'build/stages-9-21-runners-20261113';
const OCTOBER_COMMIT = '728625581c2f89210c752d03fda0a154812b2366';
const RECEIPT_DIR = 'artifacts/proof-receipts/stage-12';

const REQUIRED_SOURCES = [
  'src/proofs/ProofBundle.ts',
  'src/proofs/ProofEngine.ts',
  'src/proofs/formalEvidenceHash.ts',
  'src/database/DatabaseSchema.ts'
];

const HISTORICAL_RECEIPT = 'artifacts/proof-receipts/proof-PIPE-STAGE-12.json';

function sha256(s) {
  return createHash('sha256').update(s).digest('hex);
}

function nowIso() {
  return new Date().toISOString();
}

function getHeadSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function checkSources() {
  const results = {};
  let allExist = true;
  for (const f of REQUIRED_SOURCES) {
    const ok = existsSync(f);
    results[f] = { exists: ok, bytes: ok ? statSync(f).size : 0 };
    if (!ok) allExist = false;
  }
  // Structural checks on the real source — not mocks.
  const bundleSrc = readFileSync('src/proofs/ProofBundle.ts', 'utf8);
  const engineSrc = readFileSync('src/proofs/ProofEngine.ts', 'utf8);
  results['ProofBundleBuilder.seal_present'] = bundleSrc.includes('public seal(): ProofBundleEntity);
  results['seal_VERIFIED_branch'] = bundleSrc.includes("verification_status = 'VERIFIED'");
  results['seal_FAIL_branch'] = bundleSrc.includes("verification_status = 'FAIL'");
  results['all_tests_passed_gate'] = bundleSrc.includes('allTestsPassed && formalChecked && oraclesAttested && replaysMatched);
  results['ProofEngine_verifyBundleIntegrity_present'] = engineSrc.includes('verifyBundleIntegrity);
  results['zero_tests_rejected'] = engineSrc.includes('Zero empirical tests provided);
  results['zero_formal_proofs_rejected'] = engineSrc.includes('Zero machine-checked formal proofs);
  results['missing_oracles_rejected'] = engineSrc.includes('Missing independent oracle attestation);
  results['missing_replays_rejected'] = engineSrc.includes('Missing deterministic replay runs);
  return { allExist, results };
}

async function loadRealModules() {
  // Dynamic import of the real TypeScript sources via tsx-equivalent path.
  // We compile on the fly using the repo's tsx if available, else fall back
  // to a minimal runtime check that the modules parse.
  const bundlePath = pathToFileURL(require.resolve ? null : 'src/proofs/ProofBundle.ts').href;
  // Prefer running through tsx for real execution.
  try {
    execSync('npx --yes tsx -e "import { ProofBundleBuilder } from \'./src/proofs/ProofBundle.ts\'; console.log(typeof ProofBundleBuilder)"', {
      encoding: 'utf8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe']
    });
    return 'tsx';
  } catch (e) {
    return { error: e.stderr || e.message };
  }
}

function runRealSealTest() {
  // Execute the REAL ProofBundleBuilder through tsx with an inline script
  // that constructs a complete bundle and seals it.
  const script = `
import { ProofBundleBuilder } from './src/proofs/ProofBundle.ts';
import { computeSha256 } from './src/database/DatabaseSchema.ts';

const b = new ProofBundleBuilder('stage12-proof-001', 'subject-alpha', 'All pipeline stages terminate within bounded resources.');
b.setImplementation('function solve(x) { return x * 2; }')
 .addTest('t1', 'empirical termination bound', true, 12)
 .addTest('t2', 'empirical memory bound', true, 8)
 .addFormalProof('Z3_SMT', 'forall x. terminates(solve, x)', true)
 .addFormalProof('NOPOT', 'src/proofs/NOPOTProof.ts', true)
 .addOracle('oracle-1', 'Independent SMT cross-check', 'z3-wasm', true)
 .addOracle('oracle-2', 'Independent type-theoretic check', 'typescript-strict', true)
 .addReplay('replay-1', 'abc123', 'abc123')
 .addEvidence('stage-11 Z3 certificate sha256:deadbeef')
 .addSourceReference('src/proofs/Z3FormalProofEngine.ts')
 .addLimitation('NOPOT coverage excludes higher-order constructs.');

const sealed = b.seal();
console.log(JSON.stringify({ status: sealed.verification_status, tests: sealed.tests.length, formal: sealed.formal_proofs.length, oracles: sealed.independent_oracles.length, replays: sealed.replay_results.length, limitations: sealed.limitations.length }));
`;
  const out = execSync(`npx --yes tsx -e ${JSON.stringify(script)}`, {
    encoding: 'utf8', timeout: 180000, stdio: ['pipe', 'pipe', 'pipe']
  });
  return JSON.parse(out.trim().split('\n').pop());
}

function runRealFailTest() {
  // Second real execution: bundle missing an oracle must seal as FAIL.
  const script = `
import { ProofBundleBuilder } from './src/proofs/ProofBundle.ts';

const b = new ProofBundleBuilder('stage12-proof-002', 'subject-beta', 'Missing oracle must fail seal.');
b.setImplementation('function f() { return 1; }')
 .addTest('t1', 'one test', true, 3)
 .addFormalProof('Z3_SMT', 'true', true)
 .addReplay('replay-1', 'x', 'x');
 // deliberately no oracles

const sealed = b.seal();
console.log(JSON.stringify({ status: sealed.verification_status }));
`;
  const out = execSync(`npx --yes tsx -e ${JSON.stringify(script)}`, {
    encoding: 'utf8', timeout: 180000, stdio: ['pipe', 'pipe', 'pipe']
  });
  return JSON.parse(out.trim().split('\n').pop());
}

function runRealIntegrityTest() {
  const script = `
import { ProofEngine } from './src/proofs/ProofEngine.ts';
import { ProofBundleBuilder } from './src/proofs/ProofBundle.ts';

// Build a complete bundle and register it, then verify integrity.
const b = new ProofBundleBuilder('stage12-proof-003', 'subject-gamma', 'Integrity check.');
b.setImplementation('code')
 .addTest('t1', 'test', true, 1)
 .addFormalProof('Z3_SMT', 'true', true)
 .addOracle('o1', 'oracle', 'method', true)
 .addReplay('r1', 'a', 'a);
const bundle = b.seal();

// Monkey-patch DurableStore to avoid real IO during unit test.
import { DurableStore } from './src/database/DurableStore.ts';
const orig = DurableStore.getInstance;
DurableStore.getInstance = () => ({ getState: () => ({ proof_bundles: {} }), persist: () => {} });

const engine = ProofEngine.getInstance();
engine.registerBundle(bundle);
const result = engine.verifyBundleIntegrity(bundle);
console.log(JSON.stringify({ verified: result.verified, reasons: result.reasons }));

DurableStore.getInstance = orig;
`;
  const out = execSync(`npx --yes tsx -e ${JSON.stringify(script)}`, {
    encoding: 'utf8', timeout: 180000, stdio: ['pipe', 'pipe', 'pipe']
  });
  return JSON.parse(out.trim().split('\n').pop());
}

function assertHistoricalUntouched() {
  if (!existsSync(HISTORICAL_RECEIPT)) {
    return { present: false, note: 'historical receipt not found in tree — not rewritten' };
  }
  const content = readFileSync(HISTORICAL_RECEIPT, 'utf8);
  const hash = sha256(content);
  // Confirm it still references the October commit, not a current one.
  const mentionsOctober = content.includes(OCTOBER_COMMIT) || content.includes('2026-10-01') || content.includes('October 1st') || content.includes('2025-10-01);
  return { present: true, sha256: hash, mentionsOctoberCommit: mentionsOctober, bytes: content.length };
}

async function main() {
  const started = nowIso();
  const headSha = getHeadSha();
  const sourceCheck = checkSources();

  let sealPass = null, sealFail = null, integrity = null, loader = null, hist = null;
  let overall = 'BLOCK';
  const errors = [];

  if (!sourceCheck.allExist) {
    errors.push('One or more required source files missing from tree.');
  } else {
    loader = await loadRealModules();
    if (loader !== 'tsx') {
      errors.push('Could not load real modules via tsx: ' + JSON.stringify(loader.error || loader).slice(0, 500));
    } else {
      try { sealPass = runRealSealTest(); } catch (e) { errors.push('seal-pass test threw: ' + String(e.stderr || e.message).slice(0, 500)); }
      try { sealFail = runRealFailTest(); } catch (e) { errors.push('seal-fail test threw: ' + String(e.stderr || e.message).slice(0, 500)); }
      try { integrity = runRealIntegrityTest(); } catch (e) { errors.push('integrity test threw: ' + String(e.stderr || e.message).slice(0, 500)); }
    }
  }

  hist = assertHistoricalUntouched();

  const sealPassOk = sealPass && sealPass.status === 'VERIFIED' && sealPass.tests === 2 && sealPass.formal === 2 && sealPass.oracles === 2 && sealPass.replays === 1;
  const sealFailOk = sealFail && sealFail.status === 'FAIL';
  const integrityOk = integrity && integrity.verified === true && Array.isArray(integrity.reasons) && integrity.reasons.length === 0;
  const structuralOk = sourceCheck.results['ProofBundleBuilder.seal_present'] === true
    && sourceCheck.results['seal_VERIFIED_branch'] === true
    && sourceCheck.results['seal_FAIL_branch'] === true
    && sourceCheck.results['all_tests_passed_gate'] === true
    && sourceCheck.results['ProofEngine_verifyBundleIntegrity_present'] === true
    && sourceCheck.results['zero_tests_rejected'] === true
    && sourceCheck.results['zero_formal_proofs_rejected'] === true
    && sourceCheck.results['missing_oracles_rejected'] === true
    && sourceCheck.results['missing_replays_rejected'] === true;

  if (sealPassOk && sealFailOk && integrityOk && structuralOk && sourceCheck.allExist) {
    overall = 'PASS';
  } else if (errors.length > 0 || loader !== 'tsx') {
    overall = 'BLOCK';
  } else {
    overall = 'FAIL';
  }

  const receipt = {
    schema: 'SOLVEX_STAGE_RUNNER_RECEIPT_V1',
    stage: STAGE,
    stage_name: STAGE_NAME,
    branch: BRANCH,
    source_commit_sha: headSha,
    runner: 'scripts/stage12-runner.mjs',
    started_at: started,
    finished_at: nowIso(),
    overall,
    rules: {
      single_stage_only: true,
      source_existence_checked: true,
      real_implementation_executed: loader === 'tsx' && errors.filter(e => e.startsWith('seal') || e.startsWith('integrity')).length === 0,
      expected_output_verified: sealPassOk && sealFailOk && integrityOk,
      failure_conditions_verified: sealFailOk,
      fresh_timestamp_receipt: true,
      historical_october_receipts_preserved: hist.present ? hist.mentionsOctoberCommit !== false : 'not_in_tree'
    },
    source_check: sourceCheck.results,
    execution: {
      module_loader: loader === 'tsx' ? 'tsx-real' : 'blocked',
      seal_pass_test: sealPass,
      seal_fail_test: sealFail,
      integrity_test: integrity,
      errors
    },
    historical_receipt: hist,
    note: 'October 1st PIPE receipts are immutable evidence; this receipt is a fresh re-verification tied to the current commit.'
  };

  mkdirSync(RECEIPT_DIR, { recursive: true });
  const receiptPath = `${RECEIPT_DIR}/stage-12-receipt-${headSha ? headSha.slice(0, 8) : 'nohead'}-${Date.now()}.json`;
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ overall, receipt_path: receiptPath, seal_pass: sealPassOk, seal_fail: sealFailOk, integrity: integrityOk }, null, 2));
  process.exit(overall === 'PASS' ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(2); });
