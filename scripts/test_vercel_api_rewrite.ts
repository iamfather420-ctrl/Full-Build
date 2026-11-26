import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('API routes are not rewritten to the static frontend', () => {
  const rewrites = config.rewrites as Array<{ source: string; destination: string }>;
  const spa = rewrites.findIndex((rule) => rule.destination === '/index.html');
  const health = rewrites.findIndex((rule) => rule.source === '/healthz' && rule.destination === '/api/healthz');
  assert.equal(rewrites[spa]?.source, '/((?!api/).*)');
  assert.equal(rewrites.some((rule) => rule.source === '/(.*)' || rule.source === '/api/(.*)'), false);
  assert.ok(health >= 0 && spa > health, 'the index.html rewrite must not come before /healthz');
});

test('Daisy Preview paths call the shared proxy without the bracketed entry', () => {
  const root = new URL('../api/', import.meta.url);
  const health = readFileSync(new URL('healthz.ts', root), 'utf8');
  assert.match(health, /payments_enabled: false/);
  assert.doesNotMatch(health, /\[\.\.\.path\]/);
  for (const rel of ['daisy/status.ts', 'daisy/chat.ts']) {
    const source = readFileSync(new URL(rel, root), 'utf8');
    assert.match(source, /_daisy-app\.js/);
    assert.match(source, /\/api\/daisy\/(?:status|chat)/);
    assert.doesNotMatch(source, /\[\.\.\.path\]/);
  }
  const shared = readFileSync(new URL('_daisy-app.ts', root), 'utf8');
  assert.match(shared, /DaisyVercelProxyRouter\.js/);
  assert.match(shared, /authMiddleware\.js/);
});
