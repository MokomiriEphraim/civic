import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import type {
  Announcement,
  CivicAlert,
  ReportEngagement,
  ResolutionProof,
  TicketThread,
} from '../src/types';
import { createTemporaryDirectory, jsonRequest, startApi, type RunningApi } from './helpers';

interface CollectionRecord {
  id: string;
}

function newAlert(): Omit<CivicAlert, 'id'> {
  return {
    level: 'important',
    title: 'Scheduled water shutdown in Ward 115',
    body: 'Supply will be interrupted between 09:00 and 16:00 for valve replacement.',
    category: 'Water',
    area: 'Ward 115',
    createdAt: '15 Oct 2026, 08:30',
    active: true,
  };
}

test('collection API seeds, validates, and persists shared civic content', async () => {
  const directory = await createTemporaryDirectory();
  const dataFile = path.join(directory, 'reports.json');
  let api: RunningApi | undefined;

  try {
    api = await startApi(dataFile);

    const alerts = await jsonRequest<CivicAlert[]>(api, '/api/c/alerts');
    assert.equal(alerts.response.status, 200);
    assert.ok(alerts.body.length > 0, 'expected seeded alerts');
    assert.ok(alerts.body.some((alert) => alert.level === 'emergency'));

    const announcements = await jsonRequest<Announcement[]>(api, '/api/c/announcements');
    assert.ok(announcements.body.some((item) => item.verified === true));

    const threads = await jsonRequest<TicketThread[]>(api, '/api/c/threads');
    assert.ok(threads.body.some((thread) => thread.messages.length > 0));

    const resolutions = await jsonRequest<ResolutionProof[]>(api, '/api/c/resolutions');
    assert.ok(
      resolutions.body.some(
        (record) => record.id === '#CF-45824' && record.residentConfirmed === null
      )
    );

    const unknown = await jsonRequest<{ error: string }>(api, '/api/c/nowhere');
    assert.equal(unknown.response.status, 404);

    const missingField = await jsonRequest<{ error: string }>(api, '/api/c/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'info' }),
    });
    assert.equal(missingField.response.status, 400);

    const providedId = await jsonRequest<{ error: string }>(api, '/api/c/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'AL-999', ...newAlert() }),
    });
    assert.equal(providedId.response.status, 400);

    const created = await jsonRequest<CivicAlert>(api, '/api/c/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAlert()),
    });
    assert.equal(created.response.status, 201);
    assert.match(created.body.id, /^AL-\d+$/);

    const updated = await jsonRequest<CivicAlert>(
      api,
      `/api/c/alerts/${created.body.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      }
    );
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.active, false);
    assert.equal(updated.body.title, 'Scheduled water shutdown in Ward 115');

    const missingRecord = await jsonRequest<{ error: string }>(
      api,
      '/api/c/alerts/AL-000000',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      }
    );
    assert.equal(missingRecord.response.status, 404);

    const removed = await fetch(`${api.baseUrl}/api/c/alerts/${created.body.id}`, {
      method: 'DELETE',
    });
    assert.equal(removed.status, 204);
    const afterDelete = await jsonRequest<CollectionRecord[]>(api, '/api/c/alerts');
    assert.ok(!afterDelete.body.some((record) => record.id === created.body.id));

    const threadWithoutId = await jsonRequest<{ error: string }>(api, '/api/c/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    });
    assert.equal(threadWithoutId.response.status, 400);

    const threadBody = { id: '#CF-45815', messages: [] };
    const thread = await jsonRequest<TicketThread>(api, '/api/c/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(threadBody),
    });
    assert.equal(thread.response.status, 201);
    const threadAgain = await jsonRequest<TicketThread>(api, '/api/c/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(threadBody),
    });
    assert.equal(threadAgain.response.status, 200);

    const asset = await fetch(`${api.baseUrl}/api/assets/road_repaired_after.svg`);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('content-type') ?? '', /svg/);
    assert.match(await asset.text(), /<svg/);
  } finally {
    await api?.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
