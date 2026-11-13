#!/usr/bin/env node
/**
 * Stage 11 Runner — Z3 SMT Formal Theorem Verification
 * Rules: single-stage only, source-existence check, real execution (no mocks),
 * verify expected outputs and failure conditions, fresh timestamped receipt at
 * current commit, preserve Oct 1 historical receipts, report pass/fail/block.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const STAGE = 11;
const STAGE_NAME = 'Z3 SMT Formal Theorem Verification';
const ROOT = resolve(process.cwd());
const RECEIPT_DIR = join(ROOT, 'artifacts', 'proof-receipts', 'stage-11);
const HISTORICAL_DIR = join(ROOT, 'artifacts', 'proof-receipts);

const REQUIRED_SOURCES = [
  'src/proofs/Z3FormalProofEngine.ts',
  'src/proofs/DFRLFormalVerifier.ts',
  'scripts/verify_dfrl.ts'
];

function sha256(text) {
  return createHash('sha256').update(text).digest('hex);
}

function getCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'UNAVAILABLE';
  }
}

const result = {
  stage: STAGE,
  stage_name: STAGE_NAME,
  started_at: new Date().toISOString(),
  commit: getCommit(),
  source_checks: [],
  execution: null,
  verification: null,
  failure_condition_test: null,
  historical_receipts_preserved: null,
  status: 'block',
  errors: [],
);

for (const rel of REQUIRED_SOURCES) {
  const abs = join(ROOT, rel);
  const present = existsSync(abs);
  let meta = { path: rel, present };
  if (present) {
    const st = statSync(abs);
    const text = readFileSync(abs, 'utf8);
    meta.size = st.size;
    meta.sha256 = sha256(text);
    meta.has_real_z3_import = /import\(['"]z3-solver['"]\)/.test(text);
    meta.has_fromString = /fromString/.test(text);
    meta.has_solver_check = /solver\.check\(\)/.test(text);
  }
  result.source_checks.push(meta);
  if (!present) result.errors.push(`Missing required source: ${rel}`);
}

const enginePath = join(ROOT, 'src/proofs/Z3FormalProofEngine.ts);
if (existsSync(enginePath)) {
  try {
    const out = execSync(
      `npx --yes tsx -e "
import { Z3FormalProofEngine } from './src/proofs/Z3FormalProofEngine.ts';
const engine = Z3FormalProofEngine.getInstance();
const r = await engine.proveCatalogTheorem('THM-RUSSELL-01);
console.log(JSON.stringify({ theorem_id: r.theorem_id, solver_result: r.solver_result, proved: r.proved, solver_engine: r.solver_engine, execution_time_ms: r.execution_time_ms, certificate_sha256: r.certificate_sha256 }));
"`,
      { encoding: 'utf8', timeout: 180000, cwd: ROOT }
    );
    result.execution = { ok: true, stdout_tail: out.slice(-3000), exit_code: 0 };
  } catch (e) {
    result.execution = {
      ok: false,
      exit_code: e.status ?? 1,
      stdout_tail: (e.stdout || '').slice(-3000),
      stderr_tail: (e.stderr || '').slice(-3000),
    };
    result.errors.push(`Stage 11 execution failed with exit code ${e.status ?? 1}`);
  }
} else {
  result.errors.push('Cannot execute: Z3FormalProofEngine source missing);
}

if (result.execution?.ok) {
  let parsed = null;
  try {
    const lines = result.execution.stdout_tail.trim().split('\n);
    parsed = JSON.parse(lines[lines.length - 1]);
  } catch {
    result.errors.push('Could not parse Z3 execution output as JSON);
  }
  if (parsed) {
    const pass = parsed.solver_result === 'unsat' && parsed.proved === true;
    result.verification = {
      theorem_id: parsed.theorem_id,
      solver_result: parsed.solver_result,
      proved: parsed.proved,
      solver_engine: parsed.solver_engine,
      execution_time_ms: parsed.execution_time_ms,
      expected_unsat: parsed.solver_result === 'unsat',
      certificate_sha256: parsed.certificate_sha256,
    };
    if (pass) result.status = 'pass';
    else result.errors.push(`Z3 returned solver_result=${parsed.solver_result}, proved=${parsed.proved}; expected unsat/true`);
  }
}

// Failure condition: malformed SMT must fail closed (error, never unsat)
if (existsSync(enginePath) && result.execution?.ok) {
  try {
    const out = execSync(
      `npx --yes tsx -e "
import { Z3FormalProofEngine } from './src/proofs/Z3FormalProofEngine.ts';
const engine = Z3FormalProofEngine.getInstance();
const r = await engine.verifyCustomSmtScript('MALFORMED_STAGE11_TEST', '(assert (this_is_undefined 1 2))', 'unsat);
console.log(JSON.stringify({ solver_result: r.solver_result, proved: r.proved }));
"`,
      { encoding: 'utf8', timeout: 180000, cwd: ROOT }
    );
    const lines = out.trim().split('\n);
    const parsed = JSON.parse(lines[lines.length - 1]);
    const failClosed = parsed.solver_result === 'error' && parsed.proved === false;
    result.failure_condition_test = {
      input: 'malformed SMT with undefined operator',
      solver_result: parsed.solver_result,
      proved: parsed.proved,
      fail_closed_enforced: failClosed,
      passed: failClosed,
    };
    if (!failClosed) {
      result.errors.push('Fail-closed violated: malformed SMT did not produce error with proved=false);
      if (result.status === 'pass') result.status = 'fail';
    }
  } catch (e) {
    result.failure_condition_test = { ok: false, exit_code: e.status ?? 1, stderr_tail: (e.stderr || '').slice(-2000) };
    result.errors.push(`Failure-condition test crashed with exit code ${e.status ?? 1}`);
    if (result.status === 'pass') result.status = 'fail';
  }
}

const octFiles = [];
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/2026-10-01|20261001/.test(f)) octFiles.push(p);
  }
}
walk(HISTORICAL_DIR);
result.historical_receipts_preserved = { count: octFiles.length, files: octFiles.map(f => f.replace(ROOT + '/', '')) };

result.finished_at = new Date().toISOString();
mkdirSync(RECEIPT_DIR, { recursive: true });
const receiptName = `stage-11-receipt-${result.finished_at.replace(/[:.]/g, '-')}.json`;
const receiptPath = join(RECEIPT_DIR, receiptName);
writeFileSync(receiptPath, JSON.stringify(result, null, 2));
result.receipt_path = receiptPath.replace(ROOT + '/', '');

console.log(JSON.stringify({ status: result.status, receipt: result.receipt_path, errors: result.errors }, null, 2));
process.exit(result.status === 'pass' ? 0 : 1);
