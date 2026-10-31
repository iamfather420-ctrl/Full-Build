import { InferenceRouter } from '../inference/InferenceRouter';
import { publicModelRegistry } from '../inference/modelRegistry';

const absent = publicModelRegistry(null);
const daisy = absent.find((model) => model.id === 'daisy-local-generative');
if (!daisy || daisy.weightStatus !== 'ABSENT' || daisy.weightBytes !== null || daisy.inference !== 'BLOCKED') {
  throw new Error('missing weights were marked present');
}
const bogus = publicModelRegistry({ bytes: 0, sha256: 'not-a-hash' });
if (bogus[0]?.weightStatus !== 'ABSENT') throw new Error('empty probe counted as weights');

const hash = 'a'.repeat(64);
const measured = publicModelRegistry({ bytes: 12, sha256: hash });
if (measured[0]?.weightStatus !== 'PRESENT' || measured[0]?.inference !== 'BLOCKED') {
  throw new Error('weights were treated as a running model');
}
if (JSON.stringify(absent).includes('gguf-bytes')) throw new Error('registry leaked weight bytes');

const router = new InferenceRouter();
const outcome = await router.resolveChat({ messages: [{ role: 'user', content: 'status' }] });
if (outcome.result.status !== 'MODEL_UNAVAILABLE') {
  throw new Error(`expected model unavailable, got ${outcome.result.status}`);
}
if (outcome.result.text) throw new Error('unavailable model returned text');

console.log('model-registry-ok', daisy.weightStatus, outcome.result.code);
