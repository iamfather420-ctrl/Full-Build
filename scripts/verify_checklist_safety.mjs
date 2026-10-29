#!/usr/bin/env node
/**
 * Aggregates offline safety checks that must stay green on every candidate.
 * Does NOT run the full 120-case Z3 suite (that requires dependency-backed CI).
 * Exit 1 if a hard safety invariant fails; exit 2 if soft completeness probes fail.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(script) {
  const scriptPath = path.join(root, 'scripts', script);
  if (!fs.existsSync(scriptPath)) {
    console.error(`MISSING required script: scripts/${script}`);
    return { code: 1, missing: true };
  }
  const r = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: 'utf8',
  });
  const code = r.status ?? 1;
  console.log(`\n--- ${script} (exit ${code}) ---`);
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return { code, missing: false };
}

const hard = [
  'verify_payments_disabled.mjs',
  'verify_governance_lifecycle.mjs',
];

const soft = [
  'verify_evidence_freshness.mjs',
  'verify_archive_manifest.mjs',
];

let hardFail = 0;
let softFail = 0;

for (const s of hard) {
  const r = run(s);
  // Missing hard script is a hard failure — never silent pass.
  if (r.missing || r.code !== 0) hardFail++;
}

for (const s of soft) {
  const r = run(s);
  // Missing soft script is incompleteness, not a green production signal.
  if (r.missing || r.code !== 0) softFail++;
}

console.log('\n=== checklist safety summary ===');
console.log(`hard failures: ${hardFail}`);
console.log(`soft incompleteness: ${softFail}`);

if (hardFail > 0) {
  console.error('HARD safety invariants failed (including missing required hard scripts).');
  process.exit(1);
}

console.log('Hard safety OK. Soft items may still be incomplete — production remains BLOCKED.');
process.exit(softFail > 0 ? 2 : 0);
