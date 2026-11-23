import { createHash } from 'node:crypto';
import { readSharedRegistryItem } from '../src/registry/sharedRegistry.ts';
import { submitAssertion } from '../src/discovery/DiscoverEngineClient.ts';
import { getLocalInferenceRuntime } from '../src/inference/LocalInferenceRuntime.ts';

const correlationFromArg = process.argv[2];

type HopStatus = 'READ_BACK' | 'WITHHELD' | 'OK' | 'BLOCKED';

interface TraceHop {
  hop: string;
  correlationId: string | null;
  status: HopStatus;
  at: string;
  blockReason: string | null;
  evidence: string;
  [key: string]: unknown;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function blockedHop(
  hop: string,
  correlationId: string | null,
  reason: string,
  evidence: string,
): TraceHop {
  return {
    hop,
    correlationId,
    status: 'BLOCKED',
    at: new Date().toISOString(),
    blockReason: reason,
    evidence,
  };
}

const hops: TraceHop[] = [];
let correlationId: string | null = null;
let claimDescription: string | null = null;
let registryReadSucceeded = false;

try {
  const read = await readSharedRegistryItem();

  if (!read.ok) {
    hops.push(blockedHop(
      'full_build_contents_read',
      null,
      String(read.error ?? 'Shared registry read failed.'),
      'No registry entry was accepted.',
    ));
  } else {
    const candidate = read.item.meta?.correlationId;
    correlationId = typeof candidate === 'string' ? candidate.trim() : '';

    if (!correlationId) {
      hops.push(blockedHop(
        'full_build_contents_read',
        null,
        'Registry entry is missing a non-empty correlationId.',
        'Registry content was returned but failed identity validation.',
      ));
    } else if (correlationFromArg && correlationFromArg !== correlationId) {
      hops.push(blockedHop(
        'full_build_contents_read',
        correlationId,
        'Correlation id does not match the intact registry entry.',
        'The caller-supplied correlation id was rejected.',
      ));
    } else {
      registryReadSucceeded = true;
      claimDescription = read.item.description;
      hops.push({
        hop: 'full_build_contents_read',
        correlationId,
        status: 'READ_BACK',
        at: new Date().toISOString(),
        blockReason: null,
        evidence: 'Read ' + read.item.name + ' with validated correlation id ' + correlationId + '.',
      });
    }
  }
} catch (error) {
  hops.push(blockedHop(
    'full_build_contents_read',
    null,
    error instanceof Error ? error.message : 'Shared registry read threw an unknown error.',
    'Registry read did not complete.',
  ));
}

if (!registryReadSucceeded || !correlationId) {
  hops.push(blockedHop(
    'discover_engine_service',
    correlationId,
    'Skipped because the shared registry read and identity validation did not pass.',
    'No assertion was submitted.',
  ));
  hops.push(blockedHop(
    'model_runtime',
    correlationId,
    'Skipped because the shared registry read and identity validation did not pass.',
    'No inference request was issued.',
  ));
} else {
  const discoverBase = process.env.DISCOVER_ENGINE_URL;
  const discoverToken = process.env.DISCOVER_ENGINE_TOKEN;

  if (!discoverBase || !discoverToken) {
    hops.push(blockedHop(
      'discover_engine_service',
      correlationId,
      'DISCOVER_ENGINE_URL or DISCOVER_ENGINE_TOKEN is not set.',
      'DiscoverEngineClient was not called.',
    ));
  } else {
    try {
      const review = await submitAssertion(discoverBase, discoverToken, {
        correlationId,
        claim: claimDescription,
      });

      const safeWithheldResponse =
        review.status >= 200 &&
        review.status < 300 &&
        review.review !== null &&
        review.review.publishable === false &&
        review.review.withheld === true &&
        review.review.reviewStatus !== 'UNVERIFIED';

      if (safeWithheldResponse) {
        hops.push({
          hop: 'discover_engine_service',
          correlationId,
          status: 'WITHHELD',
          at: new Date().toISOString(),
          blockReason: review.review?.reason ?? null,
          evidence: JSON.stringify(review.review),
          httpStatus: review.status,
          inputHash: sha256(correlationId),
        });
      } else {
        hops.push(blockedHop(
          'discover_engine_service',
          correlationId,
          'Discover-Engine did not return a confirmed 2xx withheld/non-publishable review.',
          JSON.stringify({ httpStatus: review.status, review: review.review }),
        ));
      }
    } catch (error) {
      hops.push(blockedHop(
        'discover_engine_service',
        correlationId,
        error instanceof Error ? error.message : 'Discover-Engine request failed.',
        'No publishable claim was accepted.',
      ));
    }
  }

  try {
    const runtime = getLocalInferenceRuntime();
    const info = await runtime.probe();

    if (!info.ready) {
      hops.push(blockedHop(
        'model_runtime',
        correlationId,
        'First-party local inference runtime is not ready.',
        JSON.stringify({ runtimeId: info.runtimeId, ready: info.ready, notes: info.notes }),
      ));
    } else {
      const generated = await runtime.generate({
        messages: [{ role: 'user', content: 'correlation ' + correlationId }],
      });

      if (generated.status === 'OK' && typeof generated.text === 'string' && generated.text.trim()) {
        hops.push({
          hop: 'model_runtime',
          correlationId,
          status: 'OK',
          at: new Date().toISOString(),
          blockReason: null,
          evidence: 'First-party local inference returned a non-empty completion.',
          runtimeId: info.runtimeId,
          modelId: generated.modelId ?? null,
          modelVersion: generated.modelVersion ?? null,
          durationMs: generated.durationMs,
        });
      } else {
        hops.push(blockedHop(
          'model_runtime',
          correlationId,
          generated.error ?? 'Local inference returned status ' + generated.status + '.',
          JSON.stringify({ runtimeId: info.runtimeId, status: generated.status, code: generated.code }),
        ));
      }
    }
  } catch (error) {
    hops.push(blockedHop(
      'model_runtime',
      correlationId,
      error instanceof Error ? error.message : 'Local inference probe or generation failed.',
      'Local inference did not complete.',
    ));
  }
}

// This trace does not execute the 120-case corpus.
// Historical evidence is not a fresh execution.
const corpus = {
  status: 'NOT_RUN',
  command: 'bun run verify:120',
  note: 'Separate verification required; this trace does not execute or alter the formal corpus.',
};

const requiredStatuses: Record<string, HopStatus> = {
  full_build_contents_read: 'READ_BACK',
  discover_engine_service: 'WITHHELD',
  model_runtime: 'OK',
};

const failures = Object.entries(requiredStatuses)
  .filter(([name, expected]) => {
    const hop = hops.find((entry) => entry.hop === name);
    return !hop || hop.status !== expected;
  })
  .map(([name, expected]) => ({
    hop: name,
    expected,
    actual: hops.find((entry) => entry.hop === name)?.status ?? 'MISSING',
  }));

const passed = failures.length === 0;

console.log(JSON.stringify({
  schema: 'SOLVEX_SHARED_REGISTRY_TRACE_V2',
  status: passed ? 'PASS' : 'BLOCKED',
  exitCode: passed ? 0 : 2,
  correlationId,
  productionReady: false,
  productionReason: 'A successful trace is integration evidence only, not production authorization. Production still requires independent activation, security, sandbox, and human-authorization gates.',
  requiredStagesPassed: passed,
  failures,
  corpus,
  hops,
}, null, 2));

process.exitCode = passed ? 0 : 2;
