import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const requiredFiles = [
  'Daisy-AI-OS-Complete-With-ISO.tar.part-00',
  'Daisy-AI-OS-Complete-With-ISO.tar.part-01',
  'Daisy-AI-OS-Complete-With-ISO.tar.sha256',
];

function collectFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

const files = collectFiles(repoRoot);
const present = requiredFiles.filter((name) => files.some((file) => path.basename(file) === name));

console.log('Archive provenance check for Daisy AI OS release assets');
console.log('Repository root:', repoRoot);
console.log('Expected official assets:');
for (const entry of requiredFiles) {
  console.log(` - ${entry}`);
}

if (present.length === 0) {
  console.log('');
  console.log('BLOCKED: the official Daisy archive assets are not present in this checkout.');
  console.log('The repository documents the archive names and intended reconstruction order, but the real payload is missing.');
  console.log('This is an environment/provenance blocker, not a source-code validation pass.');
  console.log('');
  console.log('Expected reconstruction sequence:');
  console.log('  cat Daisy-AI-OS-Complete-With-ISO.tar.part-00 Daisy-AI-OS-Complete-With-ISO.tar.part-01 > Daisy-AI-OS-Complete-With-ISO.tar');
  console.log('  sha256sum -c Daisy-AI-OS-Complete-With-ISO.tar.sha256');
  process.exit(1);
}

for (const name of requiredFiles) {
  const match = files.find((file) => path.basename(file) === name);
  if (!match) {
    console.log(`MISSING: ${name}`);
    continue;
  }
  const size = statSync(match).size;
  console.log(`FOUND: ${name} (${size.toLocaleString()} bytes)`);
}

const checksumPath = files.find((file) => path.basename(file) === 'Daisy-AI-OS-Complete-With-ISO.tar.sha256');
if (checksumPath && existsSync(checksumPath)) {
  const checksumText = readFileSync(checksumPath, 'utf8').trim();
  if (!checksumText) {
    console.log('BLOCKED: checksum file is empty.');
    process.exit(1);
  }
  console.log('Checksum file present; ready for reconstruction and verification when the split archive parts are available.');
  console.log('Checksum contents:');
  console.log(checksumText);
}

if (present.length !== requiredFiles.length) {
  const missing = requiredFiles.filter((name) => !present.includes(name));
  console.log('');
  console.log('PARTIAL: missing official Daisy archive assets:');
  for (const entry of missing) console.log(` - ${entry}`);
  process.exit(1);
}

console.log('');
console.log('Detected the expected official asset names in the working tree.');
console.log('No checksum pass was claimed because the actual archive payload has not been reconstructed in this environment.');
