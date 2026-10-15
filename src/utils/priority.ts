import type {
  HazardReport,
  HazardSeverity,
  PriorityBreakdown,
  ReportStatus,
} from '../types';
import { OPEN_STATUSES } from '../types';
import { daysAgo } from './dates';

const SEVERITY_POINTS: Record<HazardSeverity, number> = {
  Low: 10,
  Medium: 20,
  High: 30,
  Critical: 40,
};

const STATUS_POINTS: Record<ReportStatus, number> = {
  Received: 6,
  Verified: 4,
  Assigned: 3,
  'In Progress': 2,
  Resolved: 0,
  Rejected: 0,
};

/** Departments where a delayed fix has outsized public-safety impact. */
const CRITICAL_DEPARTMENTS = [
  'water & sanitation',
  'electricity services',
  'traffic & transport',
  'roads & stormwater',
];

export interface PriorityInput {
  severity: HazardSeverity;
  status: ReportStatus;
  department: string;
  affected: number;
  date: string;
  nowMs?: number;
}

/**
 * Civic Priority Score — severity, community impact, age and municipal rules
 * combined into a 0-100 score. Popularity alone can never dominate it:
 * upvotes cap out at 20 points while severity alone can reach 40.
 */
export function priorityScore(input: PriorityInput): PriorityBreakdown {
  const nowMs = input.nowMs ?? Date.now();
  const factors: { label: string; points: number }[] = [];

  const severityPoints = SEVERITY_POINTS[input.severity];
  factors.push({ label: `Severity ${input.severity}`, points: severityPoints });

  const affectedPoints = Math.min(Math.max(input.affected, 0) * 0.4, 20);
  factors.push({
    label: `${Math.max(input.affected, 0)} residents affected`,
    points: Math.round(affectedPoints * 10) / 10,
  });

  const age = daysAgo(input.date, nowMs) ?? 0;
  const agePoints =
    OPEN_STATUSES.includes(input.status) && age >= 7 ? 15 : age >= 3 ? 8 : 0;
  factors.push({ label: `Open ${age} day${age === 1 ? '' : 's'}`, points: agePoints });

  const statusPoints = STATUS_POINTS[input.status];
  factors.push({ label: `Status ${input.status}`, points: statusPoints });

  const department = input.department.trim().toLocaleLowerCase();
  const rulePoints = CRITICAL_DEPARTMENTS.some((name) => department.includes(name)) ? 10 : 0;
  factors.push({ label: 'Municipal service-critical rule', points: rulePoints });

  const raw =
    severityPoints + affectedPoints + agePoints + statusPoints + rulePoints;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return { score, band: bandFor(score), factors };
}

export function bandFor(score: number): PriorityBreakdown['band'] {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Moderate';
  return 'Low';
}

export function reportPriority(
  report: HazardReport,
  affected: number = 0,
  nowMs: number = Date.now()
): PriorityBreakdown {
  return priorityScore({
    severity: report.severity,
    status: report.status,
    department: report.department,
    affected,
    date: report.date,
    nowMs,
  });
}
