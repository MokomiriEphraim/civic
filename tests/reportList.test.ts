import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HazardReport, ReportStatus } from '../src/types';
import { filterReports, paginateReports } from '../src/utils/reportList';

function report(
  id: string,
  address: string,
  status: ReportStatus
): HazardReport {
  return {
    id,
    hazardType: 'Road hazard',
    subType: 'Pothole',
    department: 'Roads',
    location: '-33.9, 18.4',
    address,
    status,
    date: '14 Oct 2026',
    severity: 'High',
    description: 'Test report',
    photoUrl: 'https://example.com/report.jpg',
  };
}

test('dashboard search, status filters, and pagination compose over report data', () => {
  const reports = [
    report('#CF-1', 'North Road', 'Assigned'),
    report('#CF-2', 'North Street', 'Assigned'),
    report('#CF-3', 'North Avenue', 'Resolved'),
    report('#CF-4', 'South Road', 'Assigned'),
    report('#CF-5', 'South Street', 'In Progress'),
    report('#CF-6', 'East Road', 'Rejected'),
    report('#CF-7', 'West Road', 'Resolved'),
  ];

  assert.equal(filterReports(reports, '  NORTH ', 'ALL').length, 3);

  const matchingReports = filterReports(reports, 'north', 'Assigned');
  assert.deepEqual(matchingReports.map((item) => item.id), ['#CF-1', '#CF-2']);
  assert.deepEqual(paginateReports(matchingReports, 1, 1).map((item) => item.id), ['#CF-1']);
  assert.deepEqual(paginateReports(matchingReports, 2, 1).map((item) => item.id), ['#CF-2']);
  assert.deepEqual(filterReports(reports, 'no such location', 'ALL'), []);
});
