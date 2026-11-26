import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LocalInferenceRuntime } from '../src/inference/LocalInferenceRuntime';
import { VERIFIED_DAISY_GGUF } from '../src/inference/verifiedDaisyModel';

async function main() {
  const runtime = new LocalInferenceRuntime({
    modelPath: null,
    enginePath: null,
    modelId: null,
    modelVersion: null,
  });

  const info = await runtime.probe();
  assert.equal(info.ready, false, 'Missing model/engine must never report ready.');
  assert.equal(runtime.publicStatus().loadState, 'UNAVAILABLE');
  assert.equal(runtime.publicStatus().activationAuthorized, false);
  assert.equal('modelPath' in runtime.publicStatus(), false);
  assert.equal(info.offlineCapable, false, 'The runtime must not attest offline capability without enforced network isolation.');

  const directoriesAreNotAssets = new LocalInferenceRuntime({
    modelPath: process.cwd(),
    enginePath: process.cwd(),
    modelId: null,
    modelVersion: null,
  });
  const directoryProbe = await directoriesAreNotAssets.probe();
  assert.equal(directoryProbe.ready, false, 'Directories must not be accepted as model weights or an executable engine.');

  const dir = await mkdtemp(path.join(tmpdir(), 'daisy-bad-model-'));
  const badModel = path.join(dir, 'not-the-model.gguf');
  await writeFile(badModel, 'not a daisy model');
  const mismatched = new LocalInferenceRuntime({
    modelPath: badModel,
    enginePath: process.execPath,
    modelId: VERIFIED_DAISY_GGUF.release,
    modelVersion: null,
  });
  const mismatchProbe = await mismatched.probe();
  assert.equal(mismatchProbe.ready, false);
  assert.equal(mismatched.publicStatus().loadState, 'CHECKSUM_MISMATCH');
  const rejected = await mismatched.generate({ messages: [{ role: 'user', content: 'A noun is a word that' }] });
  assert.equal(rejected.code, 'CHECKSUM_MISMATCH');
  assert.equal(rejected.text, undefined);

  const unavailable = await runtime.generate({
    messages: [{ role: 'user', content: 'A real inference request' }],
  });
  assert.equal(unavailable.status, 'MODEL_UNAVAILABLE');
  assert.equal(unavailable.code, 'FIRST_PARTY_MODEL_UNAVAILABLE');
  assert.equal(unavailable.text, undefined, 'Missing model must not return fabricated output.');

  const malformed = await runtime.generate({
    messages: [{ role: 'invalid-role' as 'user', content: 'bad role' }],
  });
  assert.equal(malformed.status, 'MALFORMED_INPUT');
  assert.equal(malformed.code, 'MALFORMED_INPUT');
  assert.equal(malformed.text, undefined, 'Malformed input must not return output.');

  const oversized = await runtime.generate({
    messages: [{ role: 'user', content: 'x'.repeat(20_001) }],
  });
  assert.equal(oversized.status, 'MALFORMED_INPUT');
  assert.equal(oversized.text, undefined);

  console.log('PASS: local inference fails closed for missing assets, checksum mismatch, malformed roles, and oversized messages.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
