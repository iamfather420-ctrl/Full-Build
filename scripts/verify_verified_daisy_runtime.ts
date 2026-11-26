import assert from 'node:assert/strict';
import { LocalInferenceRuntime } from '../src/inference/LocalInferenceRuntime';
import { VERIFIED_DAISY_GGUF } from '../src/inference/verifiedDaisyModel';

async function main() {
  const modelPath = process.env.DAISY_MODEL_PATH;
  const enginePath = process.env.DAISY_INFERENCE_ENGINE;
  if (!modelPath || !enginePath) {
    console.error('NOT RUN: DAISY_MODEL_PATH and DAISY_INFERENCE_ENGINE are required for verified generation.');
    process.exit(2);
  }
  const first = new LocalInferenceRuntime({
    modelPath,
    enginePath,
    modelId: VERIFIED_DAISY_GGUF.release,
    modelVersion: VERIFIED_DAISY_GGUF.sha256,
  });
  const before = await first.probe();
  assert.equal(before.ready, false, 'Checksum match alone must not report READY.');
  assert.equal(first.publicStatus().loadState, 'LOADABLE');
  assert.equal(first.publicStatus().modelSha256, VERIFIED_DAISY_GGUF.sha256);
  const result = await first.generate({
    messages: [{ role: 'user', content: 'A noun is a word that' }],
    timeoutMs: 120_000,
  });
  assert.equal(result.status, 'OK');
  assert.equal(typeof result.text, 'string');
  assert.ok((result.text ?? '').length > 0);
  assert.equal(first.publicStatus().ready, true);
  assert.equal(first.publicStatus().loadState, 'READY');
  assert.equal('modelPath' in first.publicStatus(), false);

  const restarted = new LocalInferenceRuntime({
    modelPath,
    enginePath,
    modelId: VERIFIED_DAISY_GGUF.release,
    modelVersion: VERIFIED_DAISY_GGUF.sha256,
  });
  const restartProbe = await restarted.probe();
  assert.equal(restartProbe.ready, false, 'A new process must not inherit READY.');
  assert.equal(restarted.publicStatus().loadState, 'LOADABLE');
  console.log(JSON.stringify({
    status: 'PASS',
    sha256: first.publicStatus().modelSha256,
    text: result.text,
    durationMs: result.durationMs,
    restartReady: restartProbe.ready,
    activationAuthorized: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
