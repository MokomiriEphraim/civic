import type { HazardReport, ReportStatus } from '../types';

/** Canonical public ticket pipeline shown by the transparency tracker. */
export const PIPELINE_STAGES = [
  'Report submitted',
  'AI classified',
  'Verified by municipality',
  'Assigned to crew',
  'Repair in progress',
  'Repair completed',
  'Resident confirmation',
] as const;

const PENDING_TIMESTAMP = 'Pending';

const STATUS_STAGE: Record<ReportStatus, string> = {
  Received: 'Report submitted',
  Verified: 'Verified by municipality',
  Assigned: 'Assigned to crew',
  'In Progress': 'Repair in progress',
  Resolved: 'Repair completed',
  Rejected: 'Rejected by municipality',
};

function orderIndex(stage: string): number {
  return (PIPELINE_STAGES as readonly string[]).indexOf(stage);
}

function clone(timeline: HazardReport['timeline']): NonNullable<HazardReport['timeline']> {
  return (timeline ?? []).map((entry) => ({ ...entry }));
}

function ensureStage(
  list: NonNullable<HazardReport['timeline']>,
  stage: string,
  order: number
): void {
  if (list.some((entry) => entry.stage === stage)) return;

  let insertAt = list.length;
  if (order >= 0) {
    insertAt = 0;
    for (const entry of list) {
      const existing = orderIndex(entry.stage);
      if (existing < 0 || existing < order) insertAt = list.indexOf(entry) + 1;
      else break;
    }
  }
  list.splice(insertAt, 0, { stage, timestamp: PENDING_TIMESTAMP, done: false });
}

/**
 * Keeps the public timeline in sync with a status change. Stages only ever
 * move forward — a status edit can never erase completed history.
 */
export function applyStatusToTimeline(
  timeline: HazardReport['timeline'],
  status: ReportStatus,
  timestamp: string
): NonNullable<HazardReport['timeline']> {
  const next = clone(timeline);
  const target = STATUS_STAGE[status];
  const targetIndex = orderIndex(target);

  if (targetIndex === -1) {
    const existing = next.find((entry) => entry.stage === target);
    if (existing) {
      existing.done = true;
      if (!existing.timestamp || existing.timestamp === PENDING_TIMESTAMP) {
        existing.timestamp = timestamp;
      }
    } else {
      next.push({ stage: target, timestamp, done: true });
    }
    return next;
  }

  for (let index = 0; index < PIPELINE_STAGES.length; index += 1) {
    ensureStage(next, PIPELINE_STAGES[index], index);
  }

  for (let index = 0; index <= targetIndex; index += 1) {
    const entry = next.find((item) => item.stage === PIPELINE_STAGES[index]);
    if (!entry || entry.done) continue;
    entry.done = true;
    if (entry.timestamp === PENDING_TIMESTAMP) entry.timestamp = timestamp;
  }

  return next;
}

/** Records the resident's verdict after a fix, closing or reopening the ticket. */
export function markResidentConfirmation(
  timeline: HazardReport['timeline'],
  confirmed: boolean,
  timestamp: string
): NonNullable<HazardReport['timeline']> {
  const next = clone(timeline);
  const stage = 'Resident confirmation';
  const existing = next.find((entry) => entry.stage === stage);
  const note = confirmed
    ? 'Resident confirmed the fix.'
    : 'Resident reported the issue is still not fixed.';

  if (existing) {
    existing.done = true;
    existing.timestamp = timestamp;
    existing.note = note;
    return next;
  }

  next.push({ stage, timestamp, done: true, note });
  return next;
}

/** Stages shown as complete for a freshly submitted report. */
export function initialTimeline(
  submittedAt: string,
  detectionNote: string
): NonNullable<HazardReport['timeline']> {
  return [
    { stage: 'Report submitted', timestamp: submittedAt, done: true, note: 'Received via CivicFix' },
    { stage: 'AI classified', timestamp: submittedAt, done: true, note: detectionNote },
  ];
}
