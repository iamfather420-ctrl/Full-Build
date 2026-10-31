import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getModelRegistryStatus, type ModelRegistryDocument } from '../src/model-registry/ModelRegistry.ts';

async function main() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'daisy-model-registry-'));
  const bytes = Buffer.from('registered-local-weights');
  const hash = createHash('sha256').update(bytes).digest('hex');
  const modelPath = path.join(directory, 'test-model.gguf');
  const enginePath = path.join(directory, 'llama-cli');
  const wrongEnginePath = path.join(directory, 'engine.sh');
  const document: ModelRegistryDocument = {
    schemaVersion: 1,
    defaultModelId: 'test-local-q4',
    models: [{
      id: 'test-local-q4', displayName: 'Test local Q4 model', version: 'test-v1',
      architecture: 'test', parameterCount: 10, contextLength: 128, format: 'GGUF', quantization: 'Q4_K_M',
      license: 'test-only', licenseUrl: 'https://example.invalid/license', baseModel: 'test/base',
      modelCardUrl: 'https://example.invalid/model', sourceRepository: 'test/model', sourceRevision: 'test-revision',
      file: { name: 'test-model.gguf', sizeBytes: bytes.length, sha256: hash, downloadUrl: 'https://example.invalid/file' },
      runtime: { engine: 'llama.cpp', executable: 'llama-cli', minimumQwen3Support: 'n/a', promptTemplate: 'test' },
      description: 'Test fixture only.',
    }],
  };
  try {
    const missing = await getModelRegistryStatus({ document, modelPath, enginePath });
    assert.equal(missing.ready, false);
    assert.equal(missing.models[0]?.weights.status, 'not_installed');
    assert.equal(missing.models[0]?.engine.status, 'not_executable');

    await writeFile(modelPath, bytes);
    await writeFile(enginePath, '#!/bin/sh\nprintf local-test\n');
    await writeFile(wrongEnginePath, '#!/bin/sh\nprintf wrong-engine\n');
    await chmod(enginePath, 0o700);
    await chmod(wrongEnginePath, 0o700);
    const verified = await getModelRegistryStatus({ document, modelPath, enginePath });
    assert.equal(verified.ready, true);
    assert.equal(verified.models[0]?.weights.status, 'verified');
    assert.equal(verified.models[0]?.engine.status, 'executable');
    assert.equal('modelPath' in verified.models[0]!, false, 'HTTP-ready registry data must not expose the local filesystem path.');
    assert.equal('enginePath' in verified.models[0]!, false, 'HTTP-ready registry data must not expose the engine filesystem path.');

    const wrongEngine = await getModelRegistryStatus({ document, modelPath, enginePath: wrongEnginePath });
    assert.equal(wrongEngine.ready, false);
    assert.equal(wrongEngine.models[0]?.engine.status, 'wrong_executable');

    const wrongHashDocument: ModelRegistryDocument = {
      ...document,
      models: [{ ...document.models[0]!, file: { ...document.models[0]!.file, sha256: '0'.repeat(64) } }],
    };
    const mismatch = await getModelRegistryStatus({ document: wrongHashDocument, modelPath, enginePath });
    assert.equal(mismatch.ready, false);
    assert.equal(mismatch.models[0]?.weights.status, 'sha256_mismatch');

    const wrongSizeDocument: ModelRegistryDocument = {
      ...document,
      models: [{ ...document.models[0]!, file: { ...document.models[0]!.file, sizeBytes: bytes.length + 1 } }],
    };
    const sizeMismatch = await getModelRegistryStatus({ document: wrongSizeDocument, modelPath, enginePath });
    assert.equal(sizeMismatch.ready, false);
    assert.equal(sizeMismatch.models[0]?.weights.status, 'size_mismatch');
    console.log('PASS: model registry blocks missing, wrong-size, and wrong-hash weights; exact SHA plus executable engine is required for READY.');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
