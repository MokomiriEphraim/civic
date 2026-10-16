import assert from 'node:assert/strict';
import { test } from 'node:test';

import { restoreVercelApiUrl } from '../server/vercelRouting';

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
