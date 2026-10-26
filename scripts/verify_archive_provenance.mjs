import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, copyFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const archiveName = 'Daisy-AI-OS-Complete-With-ISO.tar';
const requiredFiles = [
  'Daisy-AI-OS-Complete-With-ISO.tar.part-00',
  'Daisy-AI-OS-Complete-With-ISO.tar.part-01',
  'Daisy-AI-OS-Complete-With-ISO.tar.sha256',
];

function collectFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '.git' && entry.name !== 'node_modules' && entry.name !== 'dist') collectFiles(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

const files = collectFiles(repoRoot);
const locate = (name) => files.find((file) => path.basename(file) === name);
const present = requiredFiles.filter((name) => Boolean(locate(name)));

console.log('Archive provenance and SHA-256 verification for Daisy AI OS release assets');
console.log('Repository root:', repoRoot);
for (const entry of requiredFiles) console.log(` - ${entry}`);

if (present.length !== requiredFiles.length) {
  console.error('BLOCKED: the official split archive and checksum must all be present before verification.');
  for (const name of requiredFiles.filter((entry) => !present.includes(entry))) console.error(`MISSING: ${name}`);
  console.error('No archive reconstruction or checksum pass is claimed.');
  process.exit(1);
}

const part0 = locate(requiredFiles[0]);
const part1 = locate(requiredFiles[1]);
const checksumPath = locate(requiredFiles[2]);
for (const file of [part0, part1, checksumPath]) {
  console.log(`FOUND: ${path.basename(file)} (${statSync(file).size.toLocaleString()} bytes)`);
}

const checksumText = readFileSync(checksumPath, 'utf8').trim();
const match = checksumText.match(/^([a-fA-F0-9]{64})\s+[* ]?(.+)$/);
if (!match) {
  console.error('BLOCKED: checksum file must contain a SHA-256 digest and the expected archive filename.');
  process.exit(1);
}
const checksumTarget = path.basename(match[2].trim());
if (checksumTarget !== archiveName) {
  console.error(`BLOCKED: checksum target "${checksumTarget}" does not match expected "${archiveName}".`);
  process.exit(1);
}

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'daisy-archive-verify-'));
try {
  const reconstructed = path.join(tempDir, archiveName);
  console.log('Reconstructing archive in temporary storage; source parts are left unchanged.');
  execFileSync('bash', ['-c', 'cat "$1" "$2" > "$3"', 'archive-concat', part0, part1, reconstructed], { stdio: 'inherit' });
  const reconstructedSize = statSync(reconstructed).size;
  const expectedSize = statSync(part0).size + statSync(part1).size;
  if (reconstructedSize !== expectedSize) {
    console.error(`FAIL: reconstructed size ${reconstructedSize} does not equal combined part size ${expectedSize}.`);
    process.exitCode = 1;
  } else {
    console.log(`Combined size verified: ${reconstructedSize.toLocaleString()} bytes.`);
  }

  const expectedDigest = match[1].toLowerCase();
  const actualDigest = execFileSync('sha256sum', [reconstructed], { encoding: 'utf8' }).trim().split(' ')[0].toLowerCase();
  console.log('Expected SHA-256:', expectedDigest);
  console.log('Actual SHA-256:', actualDigest);
  if (actualDigest !== expectedDigest) {
    console.error('FAIL: reconstructed archive does not match the official SHA-256 checksum.');
    process.exitCode = 1;
  } else {
    console.log('PASS: reconstructed archive matches the official SHA-256 checksum.');
  }
} catch (error) {
  console.error('FAIL: archive reconstruction or SHA-256 verification failed.');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
