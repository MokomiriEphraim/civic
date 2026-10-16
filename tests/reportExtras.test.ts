import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import type {
  HazardReport,
  ReportEngagement,
  ReportStatus,
  ResidentRating,
  ResolutionProof,
  TicketMessage,
} from '../src/types';
import { createTemporaryDirectory, jsonRequest, startApi, type RunningApi } from './helpers';

interface DuplicateResponse {
  matches: { id: string; distanceMeters: number; affected: number }[];
  radiusMetres: number;
  windowDays: number;
}

function newReport(overrides: Partial<HazardReport> = {}): HazardReport {
  return {
    id: '#CF-00000',
    hazardType: 'Road Damage',
    subType: 'Pothole',
    department: 'Roads & Stormwater',
    location: '-33.9249, 18.4241',
    status: 'Received' as ReportStatus,
    date: '15 Oct 2026',
    severity: 'High',
    description: 'Fresh pothole opened up next to the taxi rank after last night s rain.',
    photoUrl: 'https://example.com/new-pothole.jpg',
    ...overrides,
  };
}

test('report extras: duplicates, confirmations, proof, ratings, messages, dispatch', async () => {
  const directory = await createTemporaryDirectory();
  const dataFile = path.join(directory, 'reports.json');
  let api: RunningApi | undefined;

  try {
    api = await startApi(dataFile);

    const reports = await jsonRequest<HazardReport[]>(api, '/api/reports');
    assert.equal(reports.response.status, 200);
    assert.ok(reports.body.length >= 20, `expected seeded reports, got ${reports.body.length}`);

    const nearby = await jsonRequest<DuplicateResponse>(api, '/api/reports/detect-duplicates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subType: 'Pothole',
        hazardType: 'Road Hazard (Pothole)',
        location: '-33.9275, 18.4186',
      }),
    });
    assert.equal(nearby.response.status, 200);
    assert.ok(
      nearby.body.matches.some(
        (match) => match.id === '#CF-45824' && match.affected === 27
      ),
      'expected the seeded pothole to match with its confirmed impact count'
    );
    assert.ok(nearby.body.matches.every((match) => match.distanceMeters <= nearby.body.radiusMetres));

    const farAway = await jsonRequest<DuplicateResponse>(api, '/api/reports/detect-duplicates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subType: 'Pothole', location: '-34.05, 18.6' }),
    });
    assert.deepEqual(farAway.body.matches, []);

    const invalidDetection = await jsonRequest<{ error: string }>(
      api,
      '/api/reports/detect-duplicates',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
    );
    assert.equal(invalidDetection.response.status, 400);

    const beforeConfirm = await jsonRequest<ReportEngagement>(
      api,
      '/api/reports/%23CF-45821/engagement'
    );
    assert.equal(beforeConfirm.body.affected, 126);

    const confirm = await jsonRequest<ReportEngagement>(api, '/api/reports/%23CF-45821/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resident: 'Test Resident' }),
    });
    assert.equal(confirm.response.status, 201);
    assert.equal(confirm.body.affected, 127);
    assert.ok(confirm.body.confirmations.includes('Test Resident'));

    const confirmAgain = await jsonRequest<ReportEngagement>(
      api,
      '/api/reports/%23CF-45821/confirm',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resident: 'Test Resident' }),
      }
    );
    assert.equal(confirmAgain.response.status, 200);
    assert.equal(confirmAgain.body.affected, 127);

    const missingConfirm = await jsonRequest<{ error: string }>(
      api,
      '/api/reports/%23CF-40404/confirm',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resident: 'Test Resident' }),
      }
    );
    assert.equal(missingConfirm.response.status, 404);

    const seededResolution = await jsonRequest<ResolutionProof>(
      api,
      '/api/reports/%23CF-45824/resolution'
    );
    assert.match(seededResolution.body.after, /^\/api\/assets\//);

    const noResolution = await jsonRequest<null>(api, '/api/reports/%23CF-45820/resolution');
    assert.equal(noResolution.body, null);

    const uploadProof = await jsonRequest<ResolutionProof>(api, '/api/reports/%23CF-45820/resolution', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        before: '/api/assets/pothole_road_hazard_1791996006345.jpg',
        after: '/api/assets/road_repaired_after.svg',
        note: 'Valve isolated, pipe patched and the trench reinstated.',
      }),
    });
    assert.equal(uploadProof.response.status, 201);
    assert.equal(uploadProof.body.residentConfirmed, null);

    const rejected = await jsonRequest<{
      resolution: ResolutionProof;
      report: HazardReport;
    }>(api, '/api/reports/%23CF-45820/resolution', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ residentConfirmed: false }),
    });
    assert.equal(rejected.response.status, 200);
    assert.equal(rejected.body.resolution.residentConfirmed, false);
    assert.equal(rejected.body.report.status, 'In Progress');
    assert.ok(
      rejected.body.report.timeline?.some(
        (stage) => stage.stage === 'Resident confirmation' && stage.done
      )
    );

    const accepted = await jsonRequest<{
      resolution: ResolutionProof;
      report: HazardReport;
    }>(api, '/api/reports/%23CF-45820/resolution', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ residentConfirmed: true }),
    });
    assert.equal(accepted.body.resolution.residentConfirmed, true);
    assert.ok(
      accepted.body.report.timeline?.some(
        (stage) =>
          stage.stage === 'Resident confirmation' && /confirmed the fix/.test(stage.note ?? '')
      )
    );

    const invalidProof = await jsonRequest<{ error: string }>(
      api,
      '/api/reports/%23CF-45820/resolution',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ before: 'data:image/png;base64,dGVzdA==' }),
      }
    );
    assert.equal(invalidProof.response.status, 400);

    const invalidRating = await jsonRequest<{ error: string }>(
      api,
      '/api/reports/%23CF-45814/rating',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars: 0 }),
      }
    );
    assert.equal(invalidRating.response.status, 400);

    const rating = await jsonRequest<ResidentRating>(api, '/api/reports/%23CF-45814/rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stars: 3, comment: 'Fixed, though it took two visits.' }),
    });
    assert.equal(rating.response.status, 201);
    assert.equal(rating.body.stars, 3);

    const seededRating = await jsonRequest<ResidentRating>(
      api,
      '/api/reports/%23CF-45818/rating'
    );
    assert.equal(seededRating.body.stars, 5);

    const noThread = await jsonRequest<TicketMessage[]>(api, '/api/reports/%23CF-45815/messages');
    assert.deepEqual(noThread.body, []);

    const seededThread = await jsonRequest<TicketMessage[]>(
      api,
      '/api/reports/%23CF-45820/messages'
    );
    assert.equal(seededThread.body.length, 4);

    const sent = await jsonRequest<TicketMessage>(api, '/api/reports/%23CF-45815/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'municipality',
        author: 'Roads & Stormwater',
        text: 'The patch team arrives on site at 07:30 tomorrow.',
      }),
    });
    assert.equal(sent.response.status, 201);
    assert.equal(sent.body.from, 'municipality');

    const threaded = await jsonRequest<TicketMessage[]>(
      api,
      '/api/reports/%23CF-45815/messages'
    );
    assert.equal(threaded.body.length, 1);
    assert.equal(threaded.body[0].id, 'M-1');

    const emptyMessage = await jsonRequest<{ error: string }>(
      api,
      '/api/reports/%23CF-45815/messages',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '   ' }),
      }
    );
    assert.equal(emptyMessage.response.status, 400);

    const created = await jsonRequest<HazardReport>(api, '/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReport()),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.assignedTeam, 'Roads Crew Delta 4');
    assert.ok(
      created.body.timeline?.some(
        (stage) => stage.stage === 'Auto-dispatched' && stage.done === true
      )
    );
  } finally {
    await api?.stop();
    await rm(directory, { recursive: true, force: true });
  }
});

test('concurrent confirmations and messages are persisted without lost updates', async () => {
  const directory = await createTemporaryDirectory();
  const dataFile = path.join(directory, 'reports.json');
  let api: RunningApi | undefined;

  try {
    api = await startApi(dataFile);

    const initialEngagement = await jsonRequest<ReportEngagement>(
      api,
      '/api/reports/%23CF-45821/engagement'
    );
    const residentNames = Array.from(
      { length: 8 },
      (_, index) => `Concurrent Test Resident ${index}`
    );
    const confirmations = await Promise.all(
      [...residentNames, residentNames[0]].map((resident) =>
        jsonRequest<ReportEngagement>(api!, '/api/reports/%23CF-45821/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resident }),
        })
      )
    );
    assert.ok(confirmations.every(({ response }) => [200, 201].includes(response.status)));

    const finalEngagement = await jsonRequest<ReportEngagement>(
      api,
      '/api/reports/%23CF-45821/engagement'
    );
    assert.equal(finalEngagement.body.affected, initialEngagement.body.affected + residentNames.length);
    assert.ok(
      residentNames.every((resident) =>
        finalEngagement.body.confirmations.includes(resident)
      )
    );

    const messages = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        jsonRequest<TicketMessage>(api!, '/api/reports/%23CF-45815/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `Concurrent test message ${index}` }),
        })
      )
    );
    assert.ok(
      messages.every(({ response }) => response.status === 201),
      JSON.stringify(messages.map(({ response, body }) => ({ status: response.status, body })))
    );
    assert.equal(new Set(messages.map(({ body }) => body.id)).size, messages.length);

    const finalMessages = await jsonRequest<TicketMessage[]>(
      api,
      '/api/reports/%23CF-45815/messages'
    );
    assert.equal(finalMessages.body.length, messages.length);
    assert.equal(new Set(finalMessages.body.map((message) => message.id)).size, messages.length);
  } finally {
    await api?.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
