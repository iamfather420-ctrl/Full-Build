import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const artifactNames = [
  'formal-aggregation.json',
  'z3-120-formal-verification-summary.json',
  'daisy-brain-activation-gate.json',
  'system-46-gates.json',
  'execution-gates.json'
];
const bun = process.platform === 'win32' ? 'bun.exe' : 'bun';
const env = { ...process.env, SOLVEX_ENV: 'ci', PAYMENTS_ENABLED: 'false' };
const commands = [
  'verify:release-safety',
  'verify:payments-disabled',
  'verify:paypal',
  'verify:nodes',
  'verify:enterprise',
  'verify:authoritative',
  'verify:120',
  'verify:ci'
];
const failures: string[] = [];

for (const script of commands) {
  console.log('\n[LOCAL VERIFICATION] bun run ' + script);
  const result = spawnSync(bun, ['run', script], { stdio: 'inherit', env, shell: process.platform === 'win32' });
  if (result.error) {
    failures.push(script + ': ' + result.error.message);
  } else if (result.status !== 0) {
    failures.push(script + ': exit status ' + String(result.status));
  }
}

for (const name of artifactNames) {
  const file = path.resolve('artifacts', name);
  if (!fs.existsSync(file)) {
    failures.push('formal artifact missing after verification: ' + name);
    continue;
  }
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    failures.push('formal artifact is not valid JSON after verification: ' + name);
  }
}

const sandboxSource = path.resolve('src/tests/sandboxVerificationPipeline.ts');
if (!fs.existsSync(sandboxSource)) {
  console.warn('SANDBOX VERIFICATION NOT IMPLEMENTED: src/tests/sandboxVerificationPipeline.ts is absent. This closure does not claim sandbox-pipeline verification; production readiness remains separately blocked until that capability is implemented and tested.');
}

console.log('\n============================================================');
console.log('SOLVEX + DAISY HAMINJA — LOCAL VERIFICATION CLOSURE');
console.log('Production readiness is evaluated separately and is not promoted by local tests.');
console.log('Authentication remains fail-closed; payments remain disabled.');
if (failures.length) {
  console.error('\nBLOCKED / FAILED ITEMS (' + failures.length + '):');
  for (const failure of failures) console.error(' - ' + failure);
  console.error('\nLOCAL VERIFICATION CLOSURE: NOT COMPLETE');
  process.exitCode = 1;
} else {
  console.log('\nAll selected local verification suites passed and required formal artifacts exist as valid JSON.');
  console.log('This does not certify production OIDC, tenant isolation, Neon RLS, backup/restore, or deployment readiness.');
  console.log('LOCAL VERIFICATION CLOSURE: VERIFIED (LOCAL SCOPE ONLY)');
}
