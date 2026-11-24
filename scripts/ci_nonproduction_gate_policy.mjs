#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const scope = process.argv[2];
const root = process.cwd();
const currentSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

function fail(message) {
  console.error(`[CI-GATE-POLICY] FAIL: ${message}`);
  process.exit(1);
}

if (scope === '45') {
  const file = path.join(root, 'artifacts', 'system-45-gates.json');
  if (!fs.existsSync(file)) fail('45-gate evidence is missing; refusing to infer a pass.');
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (report.source_commit_sha !== currentSha) fail('45-gate evidence does not belong to this exact CI checkout.');
  if (report.total_gates !== 45 || report.observed_gates !== 45 ||
      !Array.isArray(report.gates) || report.gates.length !== 45) {
    fail('45-gate evidence has an invalid or incomplete inventory.');
  }
  const statuses = report.gates.map((gate) => gate.status);
  const allowed = new Set(['PASSED', 'BLOCKED', 'EXTERNAL_PROVIDER_REQUIRED']);
  if (statuses.some((status) => !allowed.has(status))) {
    fail('At least one gate has a failure or an unrecognized status.');
  }
  const blocked = statuses.filter((status) => status !== 'PASSED').length;
  const passed = statuses.filter((status) => status === 'PASSED').length;
  if (passed !== report.gates_passed || blocked !== report.blocked_count) {
    fail('45-gate summary counters do not match the underlying gate evidence.');
  }
  if (blocked > 0) {
    console.log(`[CI-GATE-POLICY] ACCEPTED DEVELOPMENT SCOPE: ${blocked} production/provider gate(s) remain blocked; ${passed}/45 passed. No gate status was changed and production readiness is NOT asserted.`);
  } else {
    console.log('[CI-GATE-POLICY] All 45 sequential gates passed.');
  }
} else if (scope === '46') {
  const file = path.join(root, 'artifacts', 'system-46-closure-gate.json');
  if (!fs.existsSync(file)) fail('separate GATE-46 closure evidence is missing; refusing to infer a pass.');
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (report.source_commit_sha !== currentSha) fail('GATE-46 evidence does not belong to this exact CI checkout.');
  if (report.sequence_gate_count !== 45 || report.total_gates !== 1 ||
      report.gate?.gate_id !== 'GATE-46' ||
      !['PASSED', 'BLOCKED'].includes(report.gate.status)) {
    fail('GATE-46 evidence is malformed or has a failure/unrecognized status.');
  }
  if (report.gate.status === 'BLOCKED') {
    console.log('[CI-GATE-POLICY] ACCEPTED DEVELOPMENT SCOPE: separate GATE-46 remains BLOCKED. Production closure remains blocked; no readiness claim is made.');
  } else {
    console.log('[CI-GATE-POLICY] Separate GATE-46 passed.');
  }
} else {
  fail('usage: ci_nonproduction_gate_policy.mjs <45|46>');
}
