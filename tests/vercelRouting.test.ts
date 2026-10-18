import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { restoreVercelApiUrl } from '../server/vercelRouting';

test('Vercel rewrites the API path through the Express function', async () => {
  const config: {
    rewrites: Array<{ source: string; destination: string }>;
  } = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

  assert.deepEqual(config.rewrites[0], {
    source: '/api/:path*',
    destination: '/api/index?__vercel_path=/:path*',
  });
});

test('restores the original API path and query after a Vercel rewrite', () => {
  assert.equal(
    restoreVercelApiUrl('/api/index?__vercel_path=%2Freports%2F%23CF-12345&limit=5', '/reports/%23CF-12345'),
    '/api/reports/%23CF-12345?limit=5'
  );
});

test('restores a slash-prefixed API path without adding a duplicate slash', () => {
  assert.equal(
    restoreVercelApiUrl('/api/index?__vercel_path=/health', '/health'),
    '/api/health'
  );
});
