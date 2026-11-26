import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('API routes are preserved before the static frontend rewrite', () => {
  const rewrites = config.rewrites as Array<{ source: string; destination: string }>;
  const api = rewrites.findIndex((rule) => rule.source === '/api/(.*)' && rule.destination === '/api/$1');
  const spa = rewrites.findIndex((rule) => rule.source === '/(.*)' && rule.destination === '/index.html');
  assert.ok(api >= 0, 'missing explicit /api rewrite');
  assert.ok(spa > api, 'the index.html rewrite must not come before the API rewrite');
});
