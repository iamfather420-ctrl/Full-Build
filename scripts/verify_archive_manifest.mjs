#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const candidates = [
  'Daisy-AI-OS-Complete-With-ISO.tar.part-00',
  'Daisy-AI-OS-Complete-With-ISO.tar.part-01',
  'Daisy-AI-OS-Complete-With-ISO.tar.sha256',
];
const searchRoots = [root, path.join(root, 'sources'), path.join(root, 'release'), path.join(root, 'archives')];

async function exists(p) {
  try {
    await access(p, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

const found = {};
for (const name of candidates) {
  found[name] = null;
  for (const base of searchRoots) {
    const p = path.join(base, name);
    if (await exists(p)) {
      found[name] = p;
      break;
    }
  }
}

console.log('Archive integrity probe (working tree only):');
let missing = 0;
for (const name of candidates) {
  if (found[name]) console.log(`  PRESENT  ${name} → ${found[name]}`);
  else {
    console.log(`  MISSING  ${name}`);
    missing++;
  }
}

const manifestPath = path.join(root, 'sources', 'smash-archive-manifest.txt');
if (await exists(manifestPath)) {
  console.log('  MANIFEST sources/smash-archive-manifest.txt present');
} else {
  console.log('  MISSING  sources/smash-archive-manifest.txt');
  missing++;
}

if (missing > 0) {
  console.log('\nRESULT: INCOMPLETE — multi-part archive is not fully present in this tree.');
  process.exit(2);
}
console.log('\nRESULT: All listed archive parts and checksum file are present locally.');
process.exit(0);
