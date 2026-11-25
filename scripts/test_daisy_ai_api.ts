import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { after, before, test } from 'node:test';
import daisyBackendRouter from '../src/api/DaisyBackendRouter';
import { createInferenceChildEnvironment } from '../src/inference/LocalInferenceRuntime';

const app = express();
app.use(express.json({ limit: '64kb' }));
app.use((req, _res, next) => {
  if (req.header('x-test-auth') === 'authenticated-test-session') {
    Object.assign(req, {
      user: { id: 'test-user' },
      tenantClaims: { user_id: 'test-user', tenant_id: 'test-tenant' },
      tenantToken: 'test-session-credential-not-used-as-a-real-token',
      isAuthenticated: () => true,
    });
  }
  next();
});
app.use('/api/daisy', daisyBackendRouter);
const server = app.listen(0, '127.0.0.1');
let baseUrl = '';

before(async () => {
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

const authenticated = { 'x-test-auth': 'authenticated-test-session' };

test('Daisy endpoints deny requests without server-resolved tenant identity', async () => {
  const response = await fetch(`${baseUrl}/api/daisy/status`);
  assert.equal(response.status, 401);
  const body = await response.json() as { status: string; code: string };
  assert.equal(body.status, 'BLOCKED');
  assert.equal(body.code, 'AUTHENTICATED_TENANT_REQUIRED');
});

test('status reports the existing runtime without exposing host paths or claiming offline isolation', async () => {
  const response = await fetch(`${baseUrl}/api/daisy/status`, { headers: authenticated });
  assert.equal(response.status, 200);
  const body = await response.json() as Record<string, any>;
  assert.equal(body.inference.offlineCapable, false);
  assert.equal('modelPath' in body.inference, false);
  assert.equal('enginePath' in body.inference, false);
  assert.equal(body.brain.nodeExecutionRunByThisRequest, false);
  assert.equal(body.discovery.sourceSearchAvailable, false);
  assert.equal(body.discovery.resultPolicy, 'WITHHELD_ONLY');
});

test('chat returns a real blocked state when first-party model assets are unavailable', async () => {
  const response = await fetch(`${baseUrl}/api/daisy/chat`, {
    method: 'POST',
    headers: { ...authenticated, 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: 'Do not synthesize a response when the local model is unavailable.', history: [] }),
  });
  const body = await response.json() as Record<string, unknown>;
  assert.equal(response.status, 503);
  assert.equal(body.success, false);
  assert.equal(body.status, 'MODEL_UNAVAILABLE');
  assert.equal(typeof body.text, 'undefined');
});

test('invalid chat input is rejected before inference', async () => {
  const response = await fetch(`${baseUrl}/api/daisy/chat`, {
    method: 'POST',
    headers: { ...authenticated, 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: '', system: 'A caller cannot override the canonical instruction.' }),
  });
  assert.equal(response.status, 400);
  const body = await response.json() as { code: string };
  assert.equal(body.code, 'INVALID_CHAT_REQUEST');
});

test('invalid discovery assertions are rejected before any outbound request', async () => {
  const response = await fetch(`${baseUrl}/api/daisy/discovery/review`, {
    method: 'POST',
    headers: { ...authenticated, 'content-type': 'application/json' },
    body: JSON.stringify({ discovery: {}, claim: {} }),
  });
  assert.equal(response.status, 400);
  const body = await response.json() as { code: string };
  assert.equal(body.code, 'INVALID_DISCOVERY_ASSERTION');
});


test('valid discovery assertions remain blocked without configuration and make no outbound request', async () => {
  const previousUrl = process.env.DAISY_DISCOVER_ENGINE_URL;
  const previousToken = process.env.DAISY_DISCOVER_ENGINE_TOKEN;
  delete process.env.DAISY_DISCOVER_ENGINE_URL;
  delete process.env.DAISY_DISCOVER_ENGINE_TOKEN;
  const url = 'https://arxiv.org/abs/2401.00001';
  const response = await fetch(`${baseUrl}/api/daisy/discovery/review`, {
    method: 'POST',
    headers: { ...authenticated, 'content-type': 'application/json' },
    body: JSON.stringify({
      discovery: {
        id: 'source-1', source: 'arxiv', title: 'A source title', abstract: 'Evidence sentence.',
        year: 2024, url, field: 'computer science', lens: 'verification',
        keywords: [], metrics: [], citations: 0, type: 'paper',
      },
      claim: {
        id: 'claim-1', text: 'A descriptive claim.', kind: 'descriptive',
        sourceId: 'source-1', sourceUrl: url, sourceTitle: 'A source title',
        locator: { kind: 'abstract_sentence', sentenceIndex: 0, quote: 'Evidence sentence.' },
        quantitativeTokens: [], corroboratingSourceIds: [],
        corroborationStatus: 'candidate_only_unassessed',
        reviewStatus: 'human_review_required',
        evidenceGrade: 'metadata_verified_abstract_only', limitations: [],
      },
    }),
  });
  if (previousUrl !== undefined) process.env.DAISY_DISCOVER_ENGINE_URL = previousUrl;
  if (previousToken !== undefined) process.env.DAISY_DISCOVER_ENGINE_TOKEN = previousToken;
  assert.equal(response.status, 503);
  const body = await response.json() as { code: string; status: string };
  assert.equal(body.status, 'BLOCKED');
  assert.equal(body.code, 'DISCOVERY_NOT_CONFIGURED');
});

test('local inference child environment excludes application credentials', () => {
  const childEnvironment = createInferenceChildEnvironment({
    PATH: '/usr/bin',
    HOME: '/home/test',
    OPENAI_API_KEY: 'must-not-be-inherited',
    GEMINI_API_KEY: 'must-not-be-inherited',
    DATABASE_URL: 'must-not-be-inherited',
  });
  assert.equal(childEnvironment.PATH, '/usr/bin');
  assert.equal(childEnvironment.HOME, '/home/test');
  assert.equal(childEnvironment.OPENAI_API_KEY, undefined);
  assert.equal(childEnvironment.GEMINI_API_KEY, undefined);
  assert.equal(childEnvironment.DATABASE_URL, undefined);
  assert.equal(childEnvironment.DAISY_INFERENCE_OFFLINE, '1');
});
