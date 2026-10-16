import type {
  AiInsight,
  DepartmentStat,
  HazardReport,
  MunicipalityStats,
} from '../types';
import { OPEN_STATUSES } from '../types';
import { daysBetween, parseLooseDate } from './dates';
import { reportPriority } from './priority';

/** Days between the first and last completed timeline entry, when parseable. */
function resolutionDays(report: HazardReport): number | null {
  const timeline = report.timeline ?? [];
  const start = timeline
    .map((entry) => parseLooseDate(entry.timestamp))
    .find((value): value is number => value !== null);
  const completed = [...timeline]
    .reverse()
    .filter((entry) => entry.done)
    .map((entry) => parseLooseDate(entry.timestamp))
    .find((value): value is number => value !== null);

  if (start === undefined || completed === undefined) return null;
  const days = daysBetween(start, completed);
  return days >= 0 ? days : null;
}

export function computeMunicipalityStats(
  reports: HazardReport[],
  nowMs: number = Date.now()
): MunicipalityStats {
  const resolvedReports = reports.filter((report) => report.status === 'Resolved');
  const durations = resolvedReports
    .map(resolutionDays)
    .filter((value): value is number => value !== null);

  const avgResolutionDays =
    durations.length === 0
      ? 0
      : Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10;

  const highPriority = reports.filter(
    (report) =>
      OPEN_STATUSES.includes(report.status) &&
      reportPriority(report, 0, nowMs).score >= 60
  ).length;

  return {
    reportsReceived: reports.length,
    resolved: resolvedReports.length,
    resolutionRate:
      reports.length === 0 ? 0 : Math.round((resolvedReports.length / reports.length) * 100),
    avgResolutionDays,
    open: reports.filter((report) => OPEN_STATUSES.includes(report.status)).length,
    highPriority,
    awaitingAssignment: reports.filter(
      (report) => report.status === 'Received' || report.status === 'Verified'
    ).length,
  };
}

export function computeDepartmentStats(
  reports: HazardReport[],
  nowMs: number = Date.now()
): DepartmentStat[] {
  const groups = new Map<string, HazardReport[]>();
  for (const report of reports) {
    const key = report.department || 'Unassigned';
    const bucket = groups.get(key);
    if (bucket) bucket.push(report);
    else groups.set(key, [report]);
  }

  return [...groups.entries()]
    .map(([department, items]) => {
      const resolved = items.filter((item) => item.status === 'Resolved');
      const durations = resolved.map(resolutionDays).filter((value): value is number => value !== null);
      const avgDays =
        durations.length === 0
          ? 0
          : Math.round(
              (durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10
            ) / 10;

      return {
        department,
        open: items.filter((item) => OPEN_STATUSES.includes(item.status)).length,
        resolved: resolved.length,
        avgDays,
      };
    })
    .sort((left, right) => right.open + right.resolved - (left.open + left.resolved));
}

/**
 * Deterministic trend analysis over the live report feed — no model call.
 * Compares the last 30 days against the previous 30 days per department.
 */
export function computeInsights(
  reports: HazardReport[],
  nowMs: number = Date.now()
): AiInsight[] {
  const insights: AiInsight[] = [];
  const recent: Record<string, number> = {};
  const previous: Record<string, number> = {};
  let backlog = 0;

  for (const report of reports) {
    const age = parseLooseDate(report.date) === null ? null : daysBetween(parseLooseDate(report.date)!, nowMs);
    const department = report.department || 'Unassigned';
    if (age !== null && age <= 30) recent[department] = (recent[department] ?? 0) + 1;
    else if (age !== null && age <= 60) previous[department] = (previous[department] ?? 0) + 1;
    if (OPEN_STATUSES.includes(report.status) && age !== null && age >= 7) backlog += 1;
  }

  for (const [department, count] of Object.entries(recent)) {
    const before = previous[department] ?? 0;
    if (count < 3) continue;
    if (before === 0) {
      insights.push({
        id: `trend-${department}`,
        tone: 'info',
        title: `New activity in ${department}`,
        detail: `${count} report${count === 1 ? '' : 's'} filed against this department in the last 30 days with no comparable volume in the prior period.`,
        action: `Review incoming ${department.toLocaleLowerCase()} work before the backlog grows.`,
      });
      continue;
    }
    const change = Math.round(((count - before) / before) * 100);
    if (change >= 30) {
      insights.push({
        id: `trend-${department}`,
        tone: 'warning',
        title: 'Emerging infrastructure problem',
        detail: `Reports concerning ${department.toLocaleLowerCase()} have increased ${change}% in the last 30 days (${before} → ${count}).`,
        action: `Inspect infrastructure around the affected zone and pre-dispatch a ${department.toLocaleLowerCase()} crew.`,
      });
    }
  }

  if (backlog > 0) {
    insights.push({
      id: 'ageing-backlog',
      tone: backlog >= 3 ? 'warning' : 'info',
      title: 'Ageing open tickets',
      detail: `${backlog} ticket${backlog === 1 ? '' : 's'} have been open for more than a week without resolution.`,
      action: 'Reassign or escalate the oldest tickets to keep resolution times inside target.',
    });
  }

  const stats = computeDepartmentStats(reports, nowMs);
  const fastest = stats
    .filter((entry) => entry.resolved > 0 && entry.avgDays > 0)
    .sort((left, right) => left.avgDays - right.avgDays)[0];
  if (fastest) {
    insights.push({
      id: `fastest-${fastest.department}`,
      tone: 'info',
      title: `${fastest.department} is resolving fastest`,
      detail: `${fastest.resolved} resolved ticket${fastest.resolved === 1 ? '' : 's'} at an average of ${fastest.avgDays} days.`,
      action: `Reuse the ${fastest.department} dispatch pattern for slower queues.`,
    });
  }

  return insights;
}

export interface AiReviewMetrics {
  reportsAnalysed: number;
  reviewed: number;
  accepted: number;
  edited: number;
  unclassified: number;
  acceptanceRate: number | null;
  averageInferenceMs: number | null;
}

/** Resident acceptance is a workflow signal, not a measure of model accuracy. */
export function computeAiReviewMetrics(reports: HazardReport[]): AiReviewMetrics {
  const assessments = reports.flatMap((report) =>
    report.aiAssessment ? [report.aiAssessment] : []
  );
  const accepted = assessments.filter((assessment) => assessment.outcome === 'accepted').length;
  const edited = assessments.filter((assessment) => assessment.outcome === 'edited').length;
  const reviewed = accepted + edited;

  return {
    reportsAnalysed: assessments.length,
    reviewed,
    accepted,
    edited,
    unclassified: assessments.filter((assessment) => assessment.outcome === 'unclassified').length,
    acceptanceRate: reviewed === 0 ? null : Math.round((accepted / reviewed) * 100),
    averageInferenceMs:
      assessments.length === 0
        ? null
        : Math.round(
            assessments.reduce((total, assessment) => total + assessment.inferenceMs, 0) /
              assessments.length
          ),
  };
}
