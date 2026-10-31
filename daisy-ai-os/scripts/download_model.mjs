import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = path.join(ROOT, 'models', 'registry.json');
const registry = JSON.parse(await readFile(REGISTRY_PATH, 'utf8'));
const model = registry.models.find((entry) => entry.id === registry.defaultModelId);
if (!model) throw new Error('The default model is missing from the local registry.');
if (!/^[A-Za-z0-9._-]+$/.test(model.file?.name || '') || model.file.name === '.' || model.file.name === '..'
  || !Number.isSafeInteger(model.file.sizeBytes) || model.file.sizeBytes <= 0
  || !/^[a-f0-9]{64}$/i.test(model.file.sha256) || !/^https:\/\//.test(model.file.downloadUrl)) {
  throw new Error('The default model entry has unsafe or invalid file metadata.');
}

const outputDirectory = path.resolve(process.argv[2] || path.join(ROOT, 'models'));
const outputPath = path.join(outputDirectory, model.file.name);
const temporaryPath = `${outputPath}.part-${process.pid}`;

async function getSha256(filePath) {
  const hash = createHash('sha256');
  const { createReadStream } = await import('node:fs');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

await mkdir(outputDirectory, { recursive: true });
try {
  const existing = await stat(outputPath);
  if (existing.isFile() && existing.size === model.file.sizeBytes && await getSha256(outputPath) === model.file.sha256) {
    console.log(`Already installed and verified: ${outputPath}`);
    process.exit(0);
  }
} catch {
  // Missing output is the normal first-install state.
}

console.log(`Downloading ${model.displayName} (${model.file.sizeBytes} bytes) from its registered static file URL.`);
const response = await fetch(model.file.downloadUrl, { redirect: 'follow' });
if (!response.ok || !response.body) {
  throw new Error(`Static model download failed with HTTP ${response.status}.`);
}
const contentLength = response.headers.get('content-length');
const announcedSize = contentLength === null ? null : Number(contentLength);
if (contentLength !== null && (!Number.isSafeInteger(announcedSize) || announcedSize !== model.file.sizeBytes)) {
  throw new Error(`Remote content length ${announcedSize} does not match registered size ${model.file.sizeBytes}.`);
}

const hash = createHash('sha256');
let bytes = 0;
const meter = new Transform({
  transform(chunk, _encoding, callback) {
    bytes += chunk.length;
    if (bytes > model.file.sizeBytes) {
      callback(new Error('Downloaded content exceeds the registered file size.'));
      return;
    }
    hash.update(chunk);
    callback(null, chunk);
  },
});

try {
  await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(temporaryPath, { flags: 'wx', mode: 0o600 }));
  const sha256 = hash.digest('hex');
  if (bytes !== model.file.sizeBytes) throw new Error(`Downloaded ${bytes} bytes; expected ${model.file.sizeBytes}.`);
  if (sha256 !== model.file.sha256) throw new Error(`Downloaded SHA-256 ${sha256} does not match the registry.`);
  await rename(temporaryPath, outputPath);
  console.log(`Verified ${model.file.name}\nBytes: ${bytes}\nSHA-256: ${sha256}\nSaved: ${outputPath}`);
} catch (error) {
  await rm(temporaryPath, { force: true });
  throw error;
}
