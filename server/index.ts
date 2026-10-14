import 'dotenv/config';
import express from 'express';
import { randomInt, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HazardReport, HazardSeverity, ReportStatus } from '../src/types';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(serverDirectory, '..');
const dataFile = path.resolve(
  projectDirectory,
  process.env.REPORTS_FILE ?? 'data/reports.json'
);
const port = Number(process.env.API_PORT ?? 3001);
if (!Number.isInteger(port) || port < 0 || port > 65_535) {
  throw new Error('API_PORT must be an integer between 0 and 65535.');
}
const app = express();

const severities: HazardSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
const statuses: ReportStatus[] = ['Assigned', 'In Progress', 'Resolved', 'Rejected'];
let reports: HazardReport[] | undefined;
let writeQueue = Promise.resolve();
const writeAttempts = new Map<string, { count: number; windowStartedAt: number }>();

app.use(express.json({ limit: '15mb' }));

app.use('/api', (request, response, next) => {
  if (request.method !== 'POST' && request.method !== 'PATCH') {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function hasOptionalString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number
): boolean {
  const value = record[key];
  return value === undefined || (typeof value === 'string' && value.length <= maxLength);
}

function isPhotoReference(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 14_500_000) {
    return false;
  }
  const dataImage = value.match(
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/
  );
  if (dataImage) {
    const bytes = Buffer.from(dataImage[2], 'base64');
    switch (dataImage[1]) {
      case 'jpeg':
        return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      case 'png':
        return (
          bytes.length >= 8 &&
          bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        );
      case 'webp':
        return (
          bytes.length >= 12 &&
          bytes.toString('ascii', 0, 4) === 'RIFF' &&
          bytes.toString('ascii', 8, 12) === 'WEBP'
        );
    }
  }
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isTimeline(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every(
        (entry) =>
          isRecord(entry) &&
          isBoundedString(entry.stage, 120) &&
          isBoundedString(entry.timestamp, 80) &&
          typeof entry.done === 'boolean' &&
          hasOptionalString(entry, 'note', 1000)
      ))
  );
}

function isHazardReport(value: unknown): value is HazardReport {
  if (!isRecord(value)) return false;

  return (
    isBoundedString(value.id, 40) &&
    isBoundedString(value.hazardType, 120) &&
    isBoundedString(value.subType, 120) &&
    isBoundedString(value.department, 120) &&
    isBoundedString(value.location, 200) &&
    isBoundedString(value.status, 30) &&
    statuses.includes(value.status as ReportStatus) &&
    isBoundedString(value.date, 50) &&
    isBoundedString(value.severity, 20) &&
    severities.includes(value.severity as HazardSeverity) &&
    isBoundedString(value.description, 5000) &&
    isPhotoReference(value.photoUrl) &&
    hasOptionalString(value, 'departmentUnit', 120) &&
    hasOptionalString(value, 'address', 300) &&
    hasOptionalString(value, 'contact', 254) &&
    hasOptionalString(value, 'assignedTeam', 120) &&
    hasOptionalString(value, 'notes', 5000) &&
    hasOptionalString(value, 'detectedAt', 80) &&
    isTimeline(value.timeline)
  );
}

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
      reports = [];
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
    const report = (await loadReports()).find((item) => item.id === request.params.id);
    if (!report) {
      response.status(404).json({ error: 'Report not found.' });
      return;
    }
    response.json(report);
  } catch (error) {
    next(error);
  }
});


app.patch('/api/reports/:id/status', async (request, response, next) => {
  try {
    const requestedStatus: unknown = request.body?.status;

    if (
      typeof requestedStatus !== 'string' ||
      !statuses.includes(requestedStatus as ReportStatus)
    ) {
      response.status(400).json({
        error: 'Status must be Assigned, In Progress, Resolved, or Rejected.',
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

      const updatedReport: HazardReport = {
        ...existingReports[reportIndex],
        status: requestedStatus as ReportStatus,
      };

      const nextReports = [...existingReports];
      nextReports[reportIndex] = updatedReport;

      await persistReports(nextReports);
      return updatedReport;
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
      const report = {
        id: makeReportId(existingReports),
        hazardType: request.body.hazardType as string,
        subType: request.body.subType as string,
        department: request.body.department as string,
        departmentUnit: request.body.departmentUnit as string | undefined,
        location: request.body.location as string,
        address: request.body.address as string | undefined,
        status: request.body.status as ReportStatus,
        date: request.body.date as string,
        severity: request.body.severity as HazardSeverity,
        description: request.body.description as string,
        photoUrl: request.body.photoUrl as string,
        contact: request.body.contact as string | undefined,
        assignedTeam: request.body.assignedTeam as string | undefined,
        notes: request.body.notes as string | undefined,
        detectedAt: request.body.detectedAt as string | undefined,
        timeline: request.body.timeline as HazardReport['timeline'],
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
