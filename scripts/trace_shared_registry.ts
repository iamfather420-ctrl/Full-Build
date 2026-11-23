import { createHash } from 'node:crypto';
import {
  readSharedRegistryIndex,
  readSharedRegistryItem,
  SHARED_REGISTRY_REPOSITORY,
} from '../src/registry/sharedRegistry.ts';
import { submitAssertion } from '../src/discovery/DiscoverEngineClient.ts';
import { getLocalInferenceRuntime } from '../src/inference/LocalInferenceRuntime.ts';

const correlationFromArg = process.argv[2];

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

const read = await readSharedRegistryItem();
const correlationId = read.ok ? read.item.meta?.correlationId ?? '' : '';
if (correlationFromArg && correlationFromArg !== correlationId) {
  console.error(JSON.stringify({ status: 'BLOCKED', reason: 'Correlation id does not match the intact registry entry.' }));
  process.exit(2);
}

const hops: Array<Record<string, unknown>> = [{
  hop: 'full_build_registry_read',
  correlationId,
  repository: SHARED_REGISTRY_REPOSITORY,
  status: read.ok ? 'READ_BACK' : 'BLOCKED',
  at: new Date().toISOString(),
  via: read.via,
  url: read.url,
  blockReason: read.ok ? null : read.error,
  evidence: read.ok
    ? `Read ${read.item.name} correlation ${correlationId} via ${read.via} ${read.url}.`
    : read.error,
  inputHash: sha256(read.url || 'missing'),
  outputHash: read.ok ? sha256(JSON.stringify(read.item)) : null,
}];

const index = await readSharedRegistryIndex();
hops.push({
  hop: 'full_build_registry_index',
  correlationId,
  repository: SHARED_REGISTRY_REPOSITORY,
  status: index.ok && index.hasProof ? 'READ_BACK' : 'BLOCKED',
  at: new Date().toISOString(),
  url: index.url,
  blockReason: index.ok && index.hasProof ? null : (index.ok ? 'solvex-link is not on the live registry index.' : index.error),
  evidence: index.ok
    ? `Index HTTP ${index.status}. ${index.names.length} items. solvex-link ${index.hasProof ? 'present' : 'absent'}.`
    : index.error,
  outputHash: index.ok ? sha256(index.names.join('\n')) : null,
});

const discoverBase = process.env.DISCOVER_ENGINE_URL;
const discoverToken = process.env.DISCOVER_ENGINE_TOKEN;
if (!discoverBase || !discoverToken) {
  hops.push({
    hop: 'discover_engine_service',
    correlationId,
    status: 'BLOCKED',
    at: new Date().toISOString(),
    blockReason: 'DISCOVER_ENGINE_URL or DISCOVER_ENGINE_TOKEN is not set. No assertion was submitted and none was invented.',
    evidence: 'DiscoverEngineClient was not called.',
  });
} else {
  try {
    const review = await submitAssertion(discoverBase, discoverToken, {
      correlationId,
      claim: read.ok ? read.item.description : '',
    });
    hops.push({
      hop: 'discover_engine_service',
      correlationId,
      status: review.status,
      at: new Date().toISOString(),
      blockReason: review.review?.reason ?? null,
      evidence: JSON.stringify(review.review),
      inputHash: sha256(correlationId),
    });
  } catch (error) {
    hops.push({
      hop: 'discover_engine_service',
      correlationId,
      status: 'BLOCKED',
      at: new Date().toISOString(),
      blockReason: error instanceof Error ? error.message : 'Discover-Engine request failed.',
      evidence: 'submitAssertion threw. No publishable claim was accepted.',
    });
  }
}

const runtime = getLocalInferenceRuntime();
const info = await runtime.probe();
const generated = await runtime.generate({
  messages: [{ role: 'user', content: `correlation ${correlationId || 'missing'}` }],
});
hops.push({
  hop: 'model_runtime',
  correlationId,
  status: generated.status,
  at: new Date().toISOString(),
  engine: info.runtimeId,
  ready: info.ready,
  blockReason: generated.status === 'OK' ? null : generated.error,
  evidence: generated.error ?? 'Local runtime returned text.',
});

hops.push({
  hop: 'z3_120_corpus',
  correlationId,
  status: 'RETAINED',
  at: new Date().toISOString(),
  blockReason: null,
  evidence: 'This trace does not re-run verify:120 and does not change the historical corpus.',
});

const blocked = hops.some((hop) => hop.status === 'BLOCKED' || hop.status === 'MODEL_UNAVAILABLE');
console.log(JSON.stringify({
  schema: 'SOLVEX_SHARED_REGISTRY_TRACE_V1',
  correlationId,
  repository: SHARED_REGISTRY_REPOSITORY,
  productionReady: false,
  productionReason: 'A registry read is not production authorization. Model, discover service, activation, and sandbox gaps stay blocked.',
  blocked,
  hops,
}, null, 2));
process.exit(read.ok && index.ok && index.hasProof ? 0 : 2);
