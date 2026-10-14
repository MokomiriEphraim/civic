import type { HazardReport, ReportStatus } from '../types';

export type ReportStatusFilter = 'ALL' | ReportStatus;

export function filterReports(
  reports: HazardReport[],
  searchQuery: string,
  statusFilter: ReportStatusFilter
): HazardReport[] {
  const query = searchQuery.trim().toLocaleLowerCase();
  return reports.filter((report) => {
    const matchesSearch =
      query.length === 0 ||
      [
        report.id,
        report.hazardType,
        report.subType,
        report.department,
        report.location,
        report.address ?? '',
      ].some((field) => field.toLocaleLowerCase().includes(query));

    return matchesSearch && (statusFilter === 'ALL' || report.status === statusFilter);
  });
}

export function paginateReports<T>(
  items: T[],
  currentPage: number,
  pageSize: number
): T[] {
  const start = Math.max(currentPage - 1, 0) * pageSize;
  return items.slice(start, start + pageSize);
}
