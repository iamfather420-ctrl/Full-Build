import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { submitAssertion } from './DiscoverEngineClient.ts';

function listen(handler: (body: string, response: import('node:http').ServerResponse) => void) {
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => handler(Buffer.concat(chunks).toString('utf8'), response));
  });
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

test('a 503 is retried once and a publishable response is rejected', async () => {
  let calls = 0;
  const server = await listen((_body, response) => {
    calls += 1;
    response.writeHead(calls === 1 ? 503 : 200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      service: 'test', publishable: false, withheld: true, reviewStatus: 'HUMAN_REVIEW_REQUIRED', passageValid: true, reason: 'withheld',
    }));
  });
  try {
    const result = await submitAssertion(server.url, 'discovery-test-token-32-characters-min', { claim: 'x' }, { attempts: 2, timeoutMs: 1000 });
    assert.equal(calls, 2);
    assert.equal(result.status, 200);
    assert.equal(result.review?.reviewStatus, 'HUMAN_REVIEW_REQUIRED');
  } finally {
    await server.close();
  }
});

test('an authentication failure is not retried', async () => {
  let calls = 0;
  const server = await listen((_body, response) => {
    calls += 1;
    response.writeHead(401, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'discovery_authentication_required' }));
  });
  try {
    const result = await submitAssertion(server.url, 'discovery-test-token-32-characters-min', {}, { attempts: 3, timeoutMs: 1000 });
    assert.equal(calls, 1);
    assert.equal(result.status, 401);
    assert.equal(result.review, null);
  } finally {
    await server.close();
  }
});

test('a publishable review response is rejected', async () => {
  const server = await listen((_body, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      service: 'test', publishable: true, withheld: false, reviewStatus: 'UNVERIFIED', passageValid: true, reason: 'not verified',
    }));
  });
  try {
    await assert.rejects(
      submitAssertion(server.url, 'discovery-test-token-32-characters-min', {}, { attempts: 1, timeoutMs: 1000 }),
      /would publish an unverified assertion/,
    );
  } finally {
    await server.close();
  }
});

test('an invalid review payload is rejected rather than trusted', async () => {
  const server = await listen((_body, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ service: 'test', publishable: false }));
  });
  try {
    await assert.rejects(
      submitAssertion(server.url, 'discovery-test-token-32-characters-min', {}, { attempts: 1, timeoutMs: 1000 }),
      /invalid review payload/,
    );
  } finally {
    await server.close();
  }
});
