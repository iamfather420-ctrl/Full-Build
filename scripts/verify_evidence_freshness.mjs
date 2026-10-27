#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
let head = 'UNKNOWN';
try {
  head = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
} catch {}

let recorded = null;
try {
  const text = await readFile(path.join(root, 'execution-gates.md'), 'utf8');
  const m = text.match(/\*\*Commit SHA:\*\*\s+`([0-9a-f]{7,40})`/i)
    || text.match(/Commit SHA[:\s]+`?([0-9a-f]{7,40})`?/i);
  if (m) recorded = m[1];
} catch {}

console.log(`HEAD:     ${head}`);
console.log(`Recorded: ${recorded || '(none found in execution-gates.md)'}`);

if (!recorded) {
  console.log('RESULT: NO_RECORDED_EVIDENCE');
  process.exit(2);
}
if (head.startsWith(recorded) || recorded.startsWith(head.slice(0, recorded.length))) {
  console.log('RESULT: COMMIT_MATCH');
  process.exit(0);
}
console.log('RESULT: STALE_EVIDENCE');
process.exit(2);
