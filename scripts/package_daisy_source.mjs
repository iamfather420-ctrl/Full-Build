import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.resolve(repositoryRoot, process.argv[2] || 'dist');

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: repositoryRoot, ...options });
}

const worktreeStatus = git(['status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' }).trim();
if (worktreeStatus) {
  throw new Error('Refusing to package a dirty worktree. Commit intended source changes first; ignored local weights are not included.');
}

const commit = git(['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const trackedFiles = git(['ls-tree', '-r', '--name-only', '-z', commit])
  .toString('utf8')
  .split('\0')
  .filter(Boolean);
const excludedFiles = trackedFiles.filter((file) => {
  const basename = path.posix.basename(file);
  const isWeight = /\.gguf(?:\.part.*)?$/i.test(basename);
  const isPrivateEnvFile = basename === '.env' || (basename.startsWith('.env.') && basename !== '.env.example');
  return isWeight || isPrivateEnvFile;
});
const includedFiles = trackedFiles.filter((file) => !excludedFiles.includes(file));
if (!includedFiles.length) throw new Error('The source archive would be empty.');

const archivePath = path.join(outputDirectory, `Full-Build-source-${commit.slice(0, 12)}.zip`);
const checksumPath = `${archivePath}.sha256`;
await mkdir(outputDirectory, { recursive: true });

try {
  const pathspecs = includedFiles.map((file) => `:(top,literal)${file}`);
  git([
    'archive',
    '--format=zip',
    '--prefix=Full-Build/',
    `--output=${archivePath}`,
    commit,
    '--',
    ...pathspecs,
  ], { stdio: 'inherit' });

  const digest = createHash('sha256');
  for await (const chunk of createReadStream(archivePath)) digest.update(chunk);
  const sha256 = digest.digest('hex');
  await writeFile(checksumPath, `${sha256}  ${path.basename(archivePath)}\n`, { mode: 0o600 });
  console.log(`Source archive: ${archivePath}`);
  console.log(`Commit: ${commit}`);
  console.log(`SHA-256: ${sha256}`);
  console.log(`Included committed files: ${includedFiles.length}`);
  console.log(`Excluded GGUF/partial and private env files: ${excludedFiles.length}`);
} catch (error) {
  await Promise.all([
    rm(archivePath, { force: true }),
    rm(checksumPath, { force: true }),
  ]);
  throw error;
}
