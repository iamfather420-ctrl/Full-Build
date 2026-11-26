import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDaisyRenderBaseUrl, hasSameOrigin } from './DaisyVercelProxyRouter';

test('Render origin requires exact pinned HTTPS hostname', () => {
  const valid = resolveDaisyRenderBaseUrl({
    DAISY_RENDER_BASE_URL: 'https://daisy-example.onrender.com/',
    DAISY_RENDER_ALLOWED_HOST: 'daisy-example.onrender.com',
  });
  assert.equal(valid?.origin, 'https://daisy-example.onrender.com');
});

test('Render origin fails closed for missing, mismatched or unsafe origins', () => {
  assert.equal(resolveDaisyRenderBaseUrl({}), null);
  assert.equal(resolveDaisyRenderBaseUrl({
    DAISY_RENDER_BASE_URL: 'http://daisy-example.onrender.com',
    DAISY_RENDER_ALLOWED_HOST: 'daisy-example.onrender.com',
  }), null);
  assert.equal(resolveDaisyRenderBaseUrl({
    DAISY_RENDER_BASE_URL: 'https://attacker.example',
    DAISY_RENDER_ALLOWED_HOST: 'daisy-example.onrender.com',
  }), null);
  assert.equal(resolveDaisyRenderBaseUrl({
    DAISY_RENDER_BASE_URL: 'https://user:pass@daisy-example.onrender.com',
    DAISY_RENDER_ALLOWED_HOST: 'daisy-example.onrender.com',
  }), null);
  assert.equal(resolveDaisyRenderBaseUrl({
    DAISY_RENDER_BASE_URL: 'https://daisy-example.onrender.com/other',
    DAISY_RENDER_ALLOWED_HOST: 'daisy-example.onrender.com',
  }), null);
  assert.equal(resolveDaisyRenderBaseUrl({
    DAISY_RENDER_BASE_URL: 'https://127.0.0.1',
    DAISY_RENDER_ALLOWED_HOST: '127.0.0.1',
  }), null);
});

test('chat mutation requires exact same-origin HTTPS request', () => {
  const makeRequest = (headers: Record<string, string>) => ({
    get: (name: string) => headers[name.toLowerCase()],
  }) as never;
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    assert.equal(hasSameOrigin(makeRequest({
      origin: 'https://full-build.example',
      host: 'full-build.example',
      'x-forwarded-proto': 'https',
    })), true);
    assert.equal(hasSameOrigin(makeRequest({
      origin: 'https://attacker.example',
      host: 'full-build.example',
      'x-forwarded-proto': 'https',
    })), false);
    assert.equal(hasSameOrigin(makeRequest({
      host: 'full-build.example',
      'x-forwarded-proto': 'https',
    })), false);
    assert.equal(hasSameOrigin(makeRequest({
      origin: 'http://full-build.example',
      host: 'full-build.example',
      'x-forwarded-proto': 'https',
    })), false);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
