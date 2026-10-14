import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import type { HazardReport, ReportStatus } from '../src/types';

interface RunningApi {
  baseUrl: string;
  stop: () => Promise<void>;
}

async function startApi(dataFile: string): Promise<RunningApi> {
  const child: ChildProcess = spawn(
    process.execPath,
    ['--import', 'tsx', 'server/index.ts'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        API_PORT: '0',
        REPORTS_FILE: dataFile,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let output = '';
  let baseUrl: string | undefined;
  const ready = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`API did not start. ${output}`)), 10_000);
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      output += chunk;
      const match = output.match(/listening on http:\/\/localhost:(\d+)/);
      if (match && !baseUrl) {
        baseUrl = `http://localhost:${match[1]}`;
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      output += chunk;
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`API exited before becoming ready (${code}). ${output}`));
    });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  try {
    await ready;
  } catch (error) {
    child.kill();
    throw error;
  }
  if (!baseUrl) {
    child.kill();
    throw new Error(`API did not report a listening port. ${output}`);
  }
  return {
    baseUrl,
    stop: async () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
      child.kill();
      await Promise.race([
        exited,
        delay(3_000).then(() => {
          throw new Error(`API did not stop cleanly. ${output}`);
        }),
      ]);
    },
  };
}

async function jsonRequest<T>(
  api: RunningApi,
  route: string,
  init?: RequestInit
): Promise<{ response: Response; body: T }> {
  const response = await fetch(`${api.baseUrl}${route}`, init);
  const body = (await response.json()) as T;
  return { response, body };
}

function newReport(overrides: Partial<HazardReport> = {}) {
  return {
    id: '#CF-00001',
    hazardType: 'Road Damage',
    subType: 'Pothole',
    department: 'Roads and Stormwater',
    location: 'Test Street, Cape Town',
    status: 'Assigned' as ReportStatus,
    date: '14 Oct 2026',
    severity: 'High' as const,
    description: 'Test report: a pothole on the road.',
    photoUrl: 'https://example.com/test-pothole.jpg',
    ...overrides,
  };
}

async function createTemporaryDirectory(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), 'civicfix-api-test-'));
}

test('report API validates, persists updates, serializes writes, and reloads stored data', async () => {
  const directory = await createTemporaryDirectory();
  const dataFile = path.join(directory, 'reports.json');
  let api: RunningApi | undefined;

  try {
    api = await startApi(dataFile);
    const health = await jsonRequest<{ status: string }>(api, '/api/health');
    assert.equal(health.response.status, 200);
    assert.deepEqual(health.body, { status: 'ok' });

    const emptyList = await jsonRequest<HazardReport[]>(api, '/api/reports');
    assert.equal(emptyList.response.status, 200);
    assert.deepEqual(emptyList.body, []);

    const missing = await jsonRequest<{ error: string }>(api, '/api/reports/%23CF-40404');
    assert.equal(missing.response.status, 404);
    const missingStatus = await jsonRequest<{ error: string }>(
      api,
      '/api/reports/%23CF-40404/status',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Resolved' }),
      }
    );
    assert.equal(missingStatus.response.status, 404);

    const invalid = await jsonRequest<{ error: string }>(api, '/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Unknown' }),
    });
    assert.equal(invalid.response.status, 400);

    const invalidImage = await jsonRequest<{ error: string }>(api, '/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReport({ photoUrl: 'data:image/png;base64,dGVzdA==' })),
    });
    assert.equal(invalidImage.response.status, 400);

    const malformed = await fetch(`${api.baseUrl}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: 'Request body must contain valid JSON.' });

    const first = await jsonRequest<HazardReport>(api, '/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReport()),
    });
    assert.equal(first.response.status, 201);
    assert.match(first.body.id, /^#CF-\d{5}$/);
    assert.notEqual(first.body.id, '#CF-00001');

    const second = await jsonRequest<HazardReport>(api, '/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReport({ description: 'Second independent test report.' })),
    });
    assert.equal(second.response.status, 201);
    assert.notEqual(second.body.id, first.body.id);

    const detail = await jsonRequest<HazardReport>(
      api,
      `/api/reports/${encodeURIComponent(first.body.id)}`
    );
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.id, first.body.id);

    const invalidStatus = await jsonRequest<{ error: string }>(
      api,
      `/api/reports/${encodeURIComponent(first.body.id)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Unknown' }),
      }
    );
    assert.equal(invalidStatus.response.status, 400);

    const [firstUpdate, secondUpdate, thirdCreate] = await Promise.all([
      jsonRequest<HazardReport>(
        api,
        `/api/reports/${encodeURIComponent(first.body.id)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Resolved' }),
        }
      ),
      jsonRequest<HazardReport>(
        api,
        `/api/reports/${encodeURIComponent(second.body.id)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Rejected' }),
        }
      ),
      jsonRequest<HazardReport>(api, '/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport({ description: 'Created concurrently with status changes.' })),
      }),
    ]);
    assert.equal(firstUpdate.body.status, 'Resolved');
    assert.equal(firstUpdate.body.description, 'Test report: a pothole on the road.');
    assert.equal(firstUpdate.body.location, 'Test Street, Cape Town');
    assert.equal(secondUpdate.body.status, 'Rejected');
    assert.equal(secondUpdate.body.description, 'Second independent test report.');

    const listed = await jsonRequest<HazardReport[]>(api, '/api/reports');
    assert.equal(listed.body.length, 3);
    assert.ok(listed.body.some((report) => report.id === thirdCreate.body.id));

    const writeFlood = await Promise.all(
      Array.from({ length: 24 }, () =>
        fetch(`${api!.baseUrl}/api/reports/%23CF-40404/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Resolved' }),
        })
      )
    );
    assert.ok(writeFlood.some((response) => response.status === 429));

    await api.stop();
    api = await startApi(dataFile);
    const persisted = await jsonRequest<HazardReport[]>(api, '/api/reports');
    assert.equal(persisted.body.find((report) => report.id === first.body.id)?.status, 'Resolved');
    assert.equal(persisted.body.find((report) => report.id === second.body.id)?.status, 'Rejected');
    const storedFile = JSON.parse(await readFile(dataFile, 'utf8')) as HazardReport[];
    assert.equal(storedFile.length, 3);
    assert.equal(storedFile.find((report) => report.id === first.body.id)?.severity, 'High');
  } finally {
    await api?.stop();
    await rm(directory, { recursive: true, force: true });
  }
});

test('invalid stored JSON returns a safe error and leaves the file unchanged', async () => {
  const directory = await createTemporaryDirectory();
  const dataFile = path.join(directory, 'reports.json');
  const corruptContents = '[{"id":';
  await writeFile(dataFile, corruptContents, 'utf8');
  let api: RunningApi | undefined;

  try {
    api = await startApi(dataFile);
    const result = await fetch(`${api.baseUrl}/api/reports`);
    assert.equal(result.status, 500);
    const errorBody = await result.json() as { error: string };
    assert.equal(errorBody.error, 'The reports service encountered an unexpected error.');
    assert.ok(!JSON.stringify(errorBody).includes(directory));
    assert.equal(await readFile(dataFile, 'utf8'), corruptContents);
  } finally {
    await api?.stop();
    await rm(directory, { recursive: true, force: true });
  }
});

test('storage failures return 500 without exposing server details', async () => {
  const directory = await createTemporaryDirectory();
  const blockingFile = path.join(directory, 'not-a-directory');
  await writeFile(blockingFile, 'keep this file', 'utf8');
  const dataFile = path.join(blockingFile, 'reports.json');
  let api: RunningApi | undefined;

  try {
    api = await startApi(dataFile);
    const result = await jsonRequest<{ error: string }>(api, '/api/reports');
    assert.equal(result.response.status, 500);
    assert.equal(result.body.error, 'The reports service encountered an unexpected error.');
    assert.equal(await readFile(blockingFile, 'utf8'), 'keep this file');
  } finally {
    await api?.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
