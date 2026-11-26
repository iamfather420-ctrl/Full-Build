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

test('Daisy Preview paths are explicit function entrypoints', () => {
  const root = new URL('../api/', import.meta.url);
  for (const rel of ['healthz.ts', 'daisy/status.ts', 'daisy/chat.ts']) {
    const source = readFileSync(new URL(rel, root), 'utf8');
    assert.match(source, /export default function handler/);
    assert.match(source, /\/api\/(?:healthz|daisy\/(?:status|chat))/);
  }
});
