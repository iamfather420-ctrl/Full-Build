#!/usr/bin/env node
/**
 * Stage 10 Runner — Well-Founded Inductive Ranking Inspection
 * Rules: single-stage only, source-existence check, real execution (no mocks),
 * verify expected outputs and failure conditions, fresh timestamped receipt at
 * current commit, preserve Oct 1 historical receipts, report pass/fail/block.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const STAGE = 10;
const STAGE_NAME = 'Well-Founded Inductive Ranking Inspection';
const ROOT = resolve(process.cwd());
const RECEIPT_DIR = join(ROOT, 'artifacts', 'proof-receipts', 'stage-10);
const HISTORICAL_DIR = join(ROOT, 'artifacts', 'proof-receipts);

const REQUIRED_SOURCES = [
  'src/tests/sandboxVerificationPipeline.ts',
  'src/lib/sandbox/inductiveRanking.ts'
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
    meta.has_ranking_logic = /induct|ranking|well-?founded|ordinal/i.test(text);
  }
  result.source_checks.push(meta);
  if (!present) result.errors.push(`Missing required source: ${rel}`);
}

const pipelinePath = join(ROOT, 'src/tests/sandboxVerificationPipeline.ts);
if (existsSync(pipelinePath)) {
  try {
    const out = execSync(
      `npx --yes tsx "${pipelinePath}" --stage 10 --no-mock`,
      { encoding: 'utf8', timeout: 120000, cwd: ROOT }
    );
    result.execution = { ok: true, stdout_tail: out.slice(-2000), exit_code: 0 };
  } catch (e) {
    result.execution = {
      ok: false,
      exit_code: e.status ?? 1,
      stdout_tail: (e.stdout || '').slice(-2000),
      stderr_tail: (e.stderr || '').slice(-2000),
    };
    result.errors.push(`Stage 10 execution failed with exit code ${e.status ?? 1}`);
  }
} else {
  result.errors.push('Cannot execute: pipeline source missing);
}

if (result.execution?.ok) {
  const pass = /stage\s*10[\s\S]*?(pass|PASS|verified)/i.test(result.execution.stdout_tail);
  const failCond = /ranking[\s\S]*?(cycle|non-?well-founded|reject)/i.test(result.execution.stdout_tail);
  result.verification = { expected_pass_signal: pass, failure_condition_exercised: failCond };
  if (pass) result.status = 'pass';
  else result.errors.push('Execution succeeded but expected pass signal not found in output);
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
const receiptName = `stage-10-receipt-${result.finished_at.replace(/[:.]/g, '-')}.json`;
const receiptPath = join(RECEIPT_DIR, receiptName);
writeFileSync(receiptPath, JSON.stringify(result, null, 2));
result.receipt_path = receiptPath.replace(ROOT + '/', '');

console.log(JSON.stringify({ status: result.status, receipt: result.receipt_path, errors: result.errors }, null, 2));
process.exit(result.status === 'pass' ? 0 : 1);
