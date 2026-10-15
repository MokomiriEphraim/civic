import type { DuplicateMatch, HazardReport } from '../types';
import { daysAgo } from './dates';
import { distanceMeters, parseCoordinates } from './proximity';

export const DUPLICATE_RADIUS_METRES = 250;
export const DUPLICATE_WINDOW_DAYS = 14;

export interface DuplicateCandidate {
  subType: string;
  hazardType?: string;
  location: string;
  id?: string;
}

export interface DuplicateOptions {
  radiusMetres?: number;
  windowDays?: number;
  nowMs?: number;
}

function sameHazard(candidate: DuplicateCandidate, report: HazardReport): boolean {
  const a = candidate.subType.trim().toLocaleLowerCase();
  const b = report.subType.trim().toLocaleLowerCase();
  if (a.length > 0 && a === b) return true;

  if (candidate.hazardType) {
    const category = candidate.hazardType.split('(')[0].trim().toLocaleLowerCase();
    const other = report.hazardType.split('(')[0].trim().toLocaleLowerCase();
    if (category.length > 0 && category === other) return true;
  }
  return false;
}

/**
 * Finds open reports describing the same hazard close to the candidate,
 * so residents can confirm an existing ticket instead of filing a duplicate.
 */
export function findDuplicateReports(
  candidate: DuplicateCandidate,
  reports: HazardReport[],
  options: DuplicateOptions = {}
): DuplicateMatch[] {
  const radius = options.radiusMetres ?? DUPLICATE_RADIUS_METRES;
  const window = options.windowDays ?? DUPLICATE_WINDOW_DAYS;
  const nowMs = options.nowMs ?? Date.now();
  const origin = parseCoordinates(candidate.location);
  if (!origin) return [];

  const matches: (DuplicateMatch & { sortKey: number })[] = [];

  for (const report of reports) {
    if (candidate.id && report.id === candidate.id) continue;
    if (report.status === 'Rejected') continue;
    if (!sameHazard(candidate, report)) continue;

    const target = parseCoordinates(report.location);
    if (!target) continue;

    const distance = distanceMeters(origin, target);
    if (distance > radius) continue;

    const age = daysAgo(report.date, nowMs);
    if (age !== null && age > window) continue;

    matches.push({
      id: report.id,
      distanceMeters: distance,
      daysAgo: age ?? 0,
      subType: report.subType,
      address: report.address,
      status: report.status,
      affected: 0,
      sortKey: report.status === 'Resolved' ? 1 : 0,
    });
  }

  return matches
    .sort((left, right) => left.sortKey - right.sortKey || left.distanceMeters - right.distanceMeters)
    .map(({ sortKey: _sortKey, ...match }) => match);
}
