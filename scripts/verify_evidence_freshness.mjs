#!/usr/bin/env node
/**
 * Compares execution-gates.md recorded commit (if any) to current HEAD.
 * Stale evidence must not be treated as production proof.
 */
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
let head = 'UNKNOWN';
try {
  head = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
} catch {
  console.log('Could not read git HEAD.');
}

let recorded = null;
const gatesPath = path.join(root, 'execution-gates.md');
try {
  const text = await readFile(gatesPath, 'utf8');
  const m = text.match(/\*\*Commit SHA:\*\*\s+`([0-9a-f]{7,40})`/i)
    || text.match(/Commit SHA[:\s]+`?([0-9a-f]{7,40})`?/i);
  if (m) recorded = m[1];
} catch {
  console.log('execution-gates.md not readable.');
}

console.log(`HEAD:     ${head}`);
console.log(`Recorded: ${recorded || '(none found in execution-gates.md)'}`);

if (!recorded) {
  console.log('RESULT: NO_RECORDED_EVIDENCE — regenerate 120-case and 46-gate artifacts on this commit.');
  process.exit(2);
}

if (head.startsWith(recorded) || recorded.startsWith(head.slice(0, recorded.length))) {
  console.log('RESULT: COMMIT_MATCH — recorded evidence commit matches HEAD prefix.');
  console.log('Still confirm CI artifact hashes and gate verdicts separately.');
  process.exit(0);
}

console.log('RESULT: STALE_EVIDENCE — execution-gates.md does not match current HEAD.');
console.log('Regenerate authoritative verification on the release-candidate commit before production claims.');
process.exit(2);
