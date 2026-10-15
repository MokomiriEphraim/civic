import 'dotenv/config';
import express from 'express';
import { randomInt, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { HazardReport } from '../src/types';
import { SEED_REPORTS } from '../src/data/seedReports';
import { formatTimestamp } from '../src/utils/dates';
import { dispatchTeam } from '../src/utils/dispatch';
import {
  DUPLICATE_RADIUS_METRES,
  DUPLICATE_WINDOW_DAYS,
  findDuplicateReports,
} from '../src/utils/duplicate';
import { applyStatusToTimeline, markResidentConfirmation } from '../src/utils/timeline';
import { createCollectionsRouter, createStores, requireStore } from './collections';
import {
  isHazardReport,
  isPhotoReference,
  isRecord,
  statuses,
} from './validation';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(serverDirectory, '..');
const dataFile = path.resolve(
  projectDirectory,
  process.env.REPORTS_FILE ?? 'data/reports.json'
);
const dataDirectory = path.dirname(dataFile);
const port = Number(process.env.API_PORT ?? 3001);
if (!Number.isInteger(port) || port < 0 || port > 65_535) {
  throw new Error('API_PORT must be an integer between 0 and 65535.');
}

const seedEnabled = !['0', 'false', 'no', 'off'].includes(
  (process.env.CIVIC_SEED ?? '1').toLocaleLowerCase()
);

const app = express();
let reports: HazardReport[] | undefined;
let writeQueue = Promise.resolve();
const writeAttempts = new Map<string, { count: number; windowStartedAt: number }>();

app.use(express.json({ limit: '15mb' }));

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

app.use('/api', (request, response, next) => {
  if (!WRITE_METHODS.has(request.method)) {
    next();
    return;
  }

  const now = Date.now();
  const clientKey = request.socket.remoteAddress ?? 'unknown';
  let limit = writeAttempts.get(clientKey);
  if (!limit || now - limit.windowStartedAt >= 60_000) {
    limit = { count: 0, windowStartedAt: now };
    writeAttempts.set(clientKey, limit);
  }
  limit.count += 1;

  if (writeAttempts.size > 10_000) {
    for (const [key, entry] of writeAttempts) {
      if (now - entry.windowStartedAt >= 60_000) writeAttempts.delete(key);
    }
  }

  if (limit.count > 30) {
    response.setHeader(
      'Retry-After',
      Math.ceil((60_000 - (now - limit.windowStartedAt)) / 1000)
    );
    response.status(429).json({ error: 'Too many changes. Please wait before trying again.' });
    return;
  }
  next();
});

const stores = createStores(dataDirectory, seedEnabled);
const engagementStore = requireStore(stores, 'engagements');
const resolutionStore = requireStore(stores, 'resolutions');
const ratingStore = requireStore(stores, 'ratings');
const threadStore = requireStore(stores, 'threads');

async function loadReports(): Promise<HazardReport[]> {
  if (reports) return reports;

  try {
    const parentDirectory = await stat(path.dirname(dataFile));
    if (!parentDirectory.isDirectory()) {
      throw new Error('The configured report storage parent is not a directory.');
    }
  } catch (error) {
    if (!isRecord(error) || error.code !== 'ENOENT') {
      throw error;
    }
  }

  try {
    const contents = await readFile(dataFile, 'utf8');
    const parsed: unknown = JSON.parse(contents);
    if (!Array.isArray(parsed) || !parsed.every(isHazardReport)) {
      throw new Error(`Report data at ${dataFile} has an invalid format.`);
    }
    reports = parsed;
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') {
      reports = seedEnabled ? [...SEED_REPORTS] : [];
      return reports;
    }
    throw error;
  }

  return reports;
}

async function persistReports(nextReports: HazardReport[]): Promise<void> {
  await mkdir(path.dirname(dataFile), { recursive: true });
  const temporaryFile = `${dataFile}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryFile, `${JSON.stringify(nextReports, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    await rename(temporaryFile, dataFile);
  } catch (error) {
    try {
      await unlink(temporaryFile);
    } catch (cleanupError) {
      console.error('Could not remove temporary report file:', cleanupError);
    }
    throw error;
  }
  reports = nextReports;
}

function queueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation);
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function makeReportId(existingReports: HazardReport[]): string {
  let id: string;
  do {
    id = `#CF-${randomInt(10000, 100000)}`;
  } while (existingReports.some((report) => report.id === id));
  return id;
}

async function findReport(id: string): Promise<HazardReport | undefined> {
  return (await loadReports()).find((report) => report.id === id);
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/reports', async (_request, response, next) => {
  try {
    response.json(await loadReports());
  } catch (error) {
    next(error);
  }
});

app.get('/api/reports/:id', async (request, response, next) => {
  try {
    const report = await findReport(request.params.id);
    if (!report) {
      response.status(404).json({ error: 'Report not found.' });
      return;
    }
    response.json(report);
  } catch (error) {
    next(error);
  }
});

app.post('/api/reports/detect-duplicates', async (request, response, next) => {
  try {
    const body = request.body;
    if (
      !isRecord(body) ||
      typeof body.subType !== 'string' ||
      typeof body.location !== 'string'
    ) {
      response
        .status(400)
        .json({ error: 'Send subType and location to check for similar reports.' });
      return;
    }

    const existing = await loadReports();
    const engagements = await engagementStore.list();
    const matches = findDuplicateReports(
      {
        subType: body.subType,
        hazardType: typeof body.hazardType === 'string' ? body.hazardType : undefined,
        location: body.location,
        id: typeof body.id === 'string' ? body.id : undefined,
      },
      existing
    ).map((match) => ({
      ...match,
      affected: engagements.find((entry) => entry.id === match.id)?.affected ?? 0,
    }));

    response.json({
      matches,
      radiusMetres: DUPLICATE_RADIUS_METRES,
      windowDays: DUPLICATE_WINDOW_DAYS,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/reports/:id/engagement', async (request, response, next) => {
  try {
    const record = await engagementStore.get(request.params.id);
    response.json(record ?? { id: request.params.id, affected: 0, confirmations: [] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/reports/:id/confirm', async (request, response, next) => {
  try {
    const id = request.params.id;
    if (!(await findReport(id))) {
      response.status(404).json({ error: 'Report not found.' });
      return;
    }

    const resident =
      isRecord(request.body) && typeof request.body.resident === 'string'
        ? request.body.resident.trim()
        : '';
    if (resident.length === 0 || resident.length > 80) {
      response
        .status(400)
        .json({ error: 'Send the resident name confirming this issue.' });
      return;
    }

    const existing = await engagementStore.get(id);
    const confirmations: string[] = Array.isArray(existing?.confirmations)
      ? existing.confirmations
      : [];
    if (confirmations.includes(resident)) {
      response.json(existing);
      return;
    }

    const record = await engagementStore.upsert(id, {
      affected: (Number(existing?.affected) || 0) + 1,
      confirmations: [...confirmations, resident],
    });
    response.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

app.get('/api/reports/:id/resolution', async (request, response, next) => {
  try {
    response.json((await resolutionStore.get(request.params.id)) ?? null);
  } catch (error) {
    next(error);
  }
});

app.put('/api/reports/:id/resolution', async (request, response, next) => {
  try {
    const id = request.params.id;
    if (!(await findReport(id))) {
      response.status(404).json({ error: 'Report not found.' });
      return;
    }
    if (
      !isRecord(request.body) ||
      !isPhotoReference(request.body.before) ||
      !isPhotoReference(request.body.after)
    ) {
      response
        .status(400)
        .json({ error: 'A proof of resolution needs a before and an after image.' });
      return;
    }

    const record = await resolutionStore.upsert(id, {
      before: request.body.before,
      after: request.body.after,
      note:
        typeof request.body.note === 'string' && request.body.note.length <= 1000
          ? request.body.note
          : undefined,
      at: formatTimestamp(new Date()),
      residentConfirmed: null,
    });
    response.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/reports/:id/resolution', async (request, response, next) => {
  try {
    const id = request.params.id;
    const existing = await resolutionStore.get(id);
    if (!existing) {
      response.status(404).json({ error: 'No proof of resolution has been uploaded.' });
      return;
    }
    if (
      !isRecord(request.body) ||
      typeof request.body.residentConfirmed !== 'boolean'
    ) {
      response
        .status(400)
        .json({ error: 'Send residentConfirmed as true or false.' });
      return;
    }

    const confirmed = request.body.residentConfirmed;
    const timestamp = formatTimestamp(new Date());
    const record = await resolutionStore.patch(id, { residentConfirmed: confirmed });

    const report = await queueWrite(async () => {
      const items = await loadReports();
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return null;
      const next = [...items];
      next[index] = {
        ...items[index],
        status: confirmed ? items[index].status : 'In Progress',
        timeline: markResidentConfirmation(items[index].timeline, confirmed, timestamp),
      };
      await persistReports(next);
      return next[index];
    });

    response.json({ resolution: record, report });
  } catch (error) {
    next(error);
  }
});

app.get('/api/reports/:id/rating', async (request, response, next) => {
  try {
    response.json((await ratingStore.get(request.params.id)) ?? null);
  } catch (error) {
    next(error);
  }
});

app.post('/api/reports/:id/rating', async (request, response, next) => {
  try {
    const id = request.params.id;
    if (!(await findReport(id))) {
      response.status(404).json({ error: 'Report not found.' });
      return;
    }
    const stars = isRecord(request.body) ? request.body.stars : undefined;
    if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 1 || stars > 5) {
      response.status(400).json({ error: 'Rating must be a whole number from 1 to 5.' });
      return;
    }

    const comment =
      isRecord(request.body) && typeof request.body.comment === 'string'
        ? request.body.comment.slice(0, 1000)
        : undefined;

    const record = await ratingStore.upsert(id, {
      stars,
      comment: comment || undefined,
      at: formatTimestamp(new Date()),
    });
    response.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

app.get('/api/reports/:id/messages', async (request, response, next) => {
  try {
    const thread = await threadStore.get(request.params.id);
    response.json(thread?.messages ?? []);
  } catch (error) {
    next(error);
  }
});

app.post('/api/reports/:id/messages', async (request, response, next) => {
  try {
    const id = request.params.id;
    if (!(await findReport(id))) {
      response.status(404).json({ error: 'Report not found.' });
      return;
    }
    const body = request.body;
    const from = isRecord(body) && body.from === 'municipality' ? 'municipality' : 'resident';
    const text = isRecord(body) && typeof body.text === 'string' ? body.text.trim() : '';
    const author =
      isRecord(body) && typeof body.author === 'string' && body.author.trim().length > 0
        ? body.author.trim().slice(0, 80)
        : from === 'municipality'
          ? 'Municipality'
          : 'Resident';

    if (text.length === 0 || text.length > 2000) {
      response.status(400).json({ error: 'Message text is required (2000 characters max).' });
      return;
    }

    const thread = await threadStore.get(id);
    const messages = Array.isArray(thread?.messages) ? [...thread.messages] : [];
    let counter = messages.length + 1;
    while (messages.some((message) => message.id === `M-${counter}`)) counter += 1;

    const message = {
      id: `M-${counter}`,
      from,
      author,
      text,
      at: formatTimestamp(new Date()),
    };
    messages.push(message);
    await threadStore.upsert(id, { messages });
    response.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/reports/:id/status', async (request, response, next) => {
  try {
    const requestedStatus: unknown = request.body?.status;

    if (
      typeof requestedStatus !== 'string' ||
      !statuses.includes(requestedStatus as HazardReport['status'])
    ) {
      response.status(400).json({
        error: 'Status must be Received, Verified, Assigned, In Progress, Resolved, or Rejected.',
      });
      return;
    }

    const updatedReport = await queueWrite(async () => {
      const existingReports = await loadReports();
      const reportIndex = existingReports.findIndex(
        (item) => item.id === request.params.id
      );

      if (reportIndex === -1) {
        return null;
      }

      const current = existingReports[reportIndex];
      const nextReports = [...existingReports];
      nextReports[reportIndex] = {
        ...current,
        status: requestedStatus as HazardReport['status'],
        timeline: applyStatusToTimeline(
          current.timeline,
          requestedStatus as HazardReport['status'],
          formatTimestamp(new Date())
        ),
      };

      await persistReports(nextReports);
      return nextReports[reportIndex];
    });

    if (!updatedReport) {
      response.status(404).json({ error: 'Report not found.' });
      return;
    }

    response.json(updatedReport);
  } catch (error) {
    next(error);
  }
});

app.post('/api/reports', async (request, response, next) => {
  try {
    if (!isRecord(request.body) || !isHazardReport({ ...request.body, id: '#CF-00000' })) {
      response.status(400).json({ error: 'Report is missing required or valid fields.' });
      return;
    }

    const createdReport = await queueWrite(async () => {
      const existingReports = await loadReports();
      const submittedAt = formatTimestamp(new Date());
      const dispatch = dispatchTeam(
        String(request.body.department),
        String(request.body.location)
      );

      const timeline = Array.isArray(request.body.timeline)
        ? [...(request.body.timeline as NonNullable<HazardReport['timeline']>)]
        : [];
      if (dispatch.team) {
        timeline.push({
          stage: 'Auto-dispatched',
          timestamp: submittedAt,
          done: true,
          note: `${dispatch.team.name} — ${dispatch.reason}`,
        });
      }

      const report = {
        id: makeReportId(existingReports),
        hazardType: request.body.hazardType as string,
        subType: request.body.subType as string,
        department: request.body.department as string,
        departmentUnit: request.body.departmentUnit as string | undefined,
        location: request.body.location as string,
        address: request.body.address as string | undefined,
        status: request.body.status as HazardReport['status'],
        date: request.body.date as string,
        severity: request.body.severity as HazardReport['severity'],
        description: request.body.description as string,
        photoUrl: request.body.photoUrl as string,
        contact: request.body.contact as string | undefined,
        assignedTeam:
          dispatch.team?.name ?? (request.body.assignedTeam as string | undefined),
        notes: request.body.notes as string | undefined,
        detectedAt: request.body.detectedAt as string | undefined,
        timeline,
      } as HazardReport;
      const nextReports = [report, ...existingReports];
      await persistReports(nextReports);
      return report;
    });
    response.status(201).json(createdReport);
  } catch (error) {
    next(error);
  }
});

app.use('/api/c', createCollectionsRouter(stores));

app.use(
  '/api/assets',
  express.static(path.join(projectDirectory, 'src', 'assets', 'images'))
);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (isRecord(error) && error.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'Request body must contain valid JSON.' });
    return;
  }
  if (isRecord(error) && error.type === 'entity.too.large') {
    response.status(413).json({ error: 'Request body exceeds the 15 MB limit.' });
    return;
  }
  console.error('API request failed:', error);
  response.status(500).json({ error: 'The reports service encountered an unexpected error.' });
});

const server = app.listen(port, () => {
  const address = server.address();
  const listeningPort = typeof address === 'object' && address ? address.port : port;
  console.log(`CivicFix API listening on http://localhost:${listeningPort}`);
});
