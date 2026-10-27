#!/usr/bin/env node
/**
 * Reports whether the multi-part Daisy ISO archive parts and checksum
 * are present in the working tree. Never invents success if files are missing.
 */
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
  if (found[name]) {
    console.log(`  PRESENT  ${name} → ${found[name]}`);
  } else {
    console.log(`  MISSING  ${name}`);
    missing++;
  }
}

const manifestPath = path.join(root, 'sources', 'smash-archive-manifest.txt');
if (await exists(manifestPath)) {
  console.log(`  MANIFEST sources/smash-archive-manifest.txt present`);
  const text = await readFile(manifestPath, 'utf8');
  if (!text.includes('part-00') || !text.includes('part-01')) {
    console.log('  WARN manifest does not reference both part-00 and part-01');
  }
} else {
  console.log('  MISSING  sources/smash-archive-manifest.txt');
  missing++;
}

if (missing > 0) {
  console.log('\nRESULT: INCOMPLETE — multi-part archive is not fully present in this tree.');
  console.log('Recover part-00, part-01, and .sha256 from the GitHub release v0.1.0-daisy-ai-os or Smash transfers.');
  console.log('Do not claim ISO/kernel assets are verified until concatenation matches the release checksum.');
  process.exit(2);
}

console.log('\nRESULT: All listed archive parts and checksum file are present locally.');
console.log('Still required: concatenate part-00+part-01 and compare SHA-256 to the release checksum before claiming integrity.');
process.exit(0);
