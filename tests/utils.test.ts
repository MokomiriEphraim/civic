import assert from 'node:assert/strict';
import { test } from 'node:test';

import { answerQuestion, type AssistantContext } from '../src/utils/assistant';
import { dispatchTeam } from '../src/utils/dispatch';
import { findDuplicateReports } from '../src/utils/duplicate';
import { daysAgo, parseLooseDate } from '../src/utils/dates';
import { distanceMeters, parseCoordinates } from '../src/utils/proximity';
import { bandFor, priorityScore, reportPriority } from '../src/utils/priority';
import {
  computeAiReviewMetrics,
  computeDepartmentStats,
  computeInsights,
  computeMunicipalityStats,
} from '../src/utils/stats';
import type { HazardReport } from '../src/types';

function report(overrides: Partial<HazardReport> = {}): HazardReport {
  return {
    id: '#CF-10000',
    hazardType: 'Road Hazard (Pothole)',
    subType: 'Pothole',
    department: 'Roads & Stormwater',
    location: '-33.9249, 18.4241',
    address: 'Kloof Nek Rd, Cape Town',
    status: 'Assigned',
    date: '14 Oct 2026',
    severity: 'High',
    description: 'Test pothole',
    photoUrl: 'https://example.com/photo.jpg',
    ...overrides,
  };
}

test('parseCoordinates accepts valid pairs and rejects malformed input', () => {
  assert.deepEqual(parseCoordinates('-33.9249, 18.4241'), { lat: -33.9249, lon: 18.4241 });
  assert.deepEqual(parseCoordinates(' 45.5 , -90.125 '), { lat: 45.5, lon: -90.125 });
  assert.equal(parseCoordinates('Cape Town CBD'), null);
  assert.equal(parseCoordinates('91, 18.4'), null);
  assert.equal(parseCoordinates(''), null);
});

test('distanceMeters measures zero for identical points and roughly correct offsets', () => {
  const origin = { lat: -33.9249, lon: 18.4241 };
  assert.equal(distanceMeters(origin, origin), 0);

  const ninetyTwoMetres = distanceMeters(origin, { lat: -33.9249, lon: 18.4251 });
  assert.ok(ninetyTwoMetres > 80 && ninetyTwoMetres < 105, `got ${ninetyTwoMetres}`);

  const nineHundred = distanceMeters(origin, { lat: -33.9249, lon: 18.4341 });
  assert.ok(nineHundred > 850 && nineHundred < 1000, `got ${nineHundred}`);
});

test('parseLooseDate understands app formats and returns null for junk', () => {
  assert.equal(parseLooseDate('14 Oct 2026'), new Date(2026, 9, 14).getTime());
  assert.equal(parseLooseDate('14 Oct 2026, 09:14 AM'), new Date(2026, 9, 14, 9, 14).getTime());
  assert.equal(parseLooseDate('02 Oct 2026, 05:30 PM'), new Date(2026, 9, 2, 17, 30).getTime());
  assert.equal(parseLooseDate('14 Oct 2026, 12:05 AM'), new Date(2026, 9, 14, 0, 5).getTime());
  assert.equal(parseLooseDate('not a date'), null);
  assert.equal(parseLooseDate(undefined), null);
  assert.ok(parseLooseDate('2026-10-14') !== null);
});

test('daysAgo measures whole days against the supplied clock', () => {
  const now = new Date(2026, 9, 16).getTime();
  assert.equal(daysAgo('14 Oct 2026', now), 2);
  assert.equal(daysAgo('30 Sep 2026', now), 16);
  assert.equal(daysAgo('nonsense', now), null);
});

test('findDuplicateReports flags nearby same-hazard tickets and ignores far or stale ones', () => {
  const nowMs = new Date(2026, 9, 16).getTime();
  const candidate = { subType: 'Pothole', hazardType: 'Road Hazard', location: '-33.9249, 18.4241' };

  const reports = [
    report({ id: '#CF-1', location: '-33.9249, 18.4241' }),
    report({ id: '#CF-2', location: '-33.9249, 18.4251', status: 'In Progress' }),
    report({ id: '#CF-3', location: '-33.9249, 18.4341' }),
    report({ id: '#CF-4', subType: 'Illegal Dumping', hazardType: 'Waste Hazard' }),
    report({ id: '#CF-5', location: '-33.9249, 18.4251', date: '20 Sep 2026' }),
    report({ id: '#CF-6', location: '-33.9249, 18.4251', status: 'Rejected' }),
    report({ id: '#CF-7', location: '-33.9249, 18.4251', status: 'Resolved' }),
  ];

  const matches = findDuplicateReports(candidate, reports, { nowMs });
  const ids = matches.map((match) => match.id);

  assert.deepEqual(ids, ['#CF-1', '#CF-2', '#CF-7']);
  assert.equal(matches[0].distanceMeters, 0);
  assert.equal(matches[0].daysAgo, 2);
  assert.ok(matches[1].distanceMeters > 80 && matches[1].distanceMeters < 105);
});

test('findDuplicateReports returns nothing when the location is unusable', () => {
  const matches = findDuplicateReports(
    { subType: 'Pothole', location: 'somewhere in town' },
    [report()]
  );
  assert.deepEqual(matches, []);
});

test('findDuplicateReports honours a custom radius', () => {
  const nowMs = new Date(2026, 9, 16).getTime();
  const matches = findDuplicateReports(
    { subType: 'Pothole', location: '-33.9249, 18.4241' },
    [report({ id: '#CF-9', location: '-33.9249, 18.4251' })],
    { nowMs, radiusMetres: 10 }
  );
  assert.deepEqual(matches, []);
});

test('priority score keeps severity ahead of raw popularity', () => {
  const nowMs = new Date(2026, 9, 16).getTime();

  const severe = priorityScore({
    severity: 'Critical',
    status: 'Received',
    department: 'Roads & Stormwater',
    affected: 0,
    date: '16 Oct 2026',
    nowMs,
  });
  const popularButMinor = priorityScore({
    severity: 'Low',
    status: 'Assigned',
    department: 'City Parks',
    affected: 100,
    date: '16 Oct 2026',
    nowMs,
  });

  assert.ok(severe.score > popularButMinor.score, `${severe.score} !> ${popularButMinor.score}`);
  assert.ok(severe.score <= 100);
  assert.ok(popularButMinor.score <= 100);
});

test('priority score caps community impact and adds ageing + service-critical rules', () => {
  const nowMs = new Date(2026, 9, 16).getTime();
  const base = {
    severity: 'Medium' as const,
    status: 'Assigned' as const,
    department: 'City Parks',
    date: '16 Oct 2026',
    nowMs,
  };

  const manyAffected = priorityScore({ ...base, affected: 500 });
  const cappedPoints = manyAffected.factors.find((factor) => factor.label.includes('affected'));
  assert.equal(cappedPoints?.points, 20);

  const aged = priorityScore({ ...base, affected: 0, date: '01 Oct 2026' });
  const fresh = priorityScore({ ...base, affected: 0, date: '16 Oct 2026' });
  assert.ok(aged.score > fresh.score);

  const criticalService = priorityScore({
    ...base,
    affected: 0,
    department: 'Water & Sanitation',
  });
  assert.ok(criticalService.score > fresh.score);
});

test('priority bands map score ranges', () => {
  assert.equal(bandFor(95), 'Critical');
  assert.equal(bandFor(75), 'High');
  assert.equal(bandFor(50), 'Moderate');
  assert.equal(bandFor(12), 'Low');
});

test('reportPriority reads fields straight off a report', () => {
  const breakdown = reportPriority(
    report({ severity: 'Critical', status: 'Received' }),
    10,
    new Date(2026, 9, 16).getTime()
  );
  assert.equal(breakdown.score, 40 + 4 + 6 + 0 + 10);
  assert.equal(breakdown.band, 'High');
});

test('dispatchTeam picks the nearest active crew for the department', () => {
  const roads = dispatchTeam('Roads & Stormwater', '-33.9249, 18.4241');
  assert.equal(roads.team?.name, 'Roads Crew Delta 4');
  assert.equal(roads.distanceMetres, 0);

  const water = dispatchTeam('Water & Sanitation', '-33.9152, 18.4087');
  assert.equal(water.team?.name, 'Rapid Water Response 2');

  const nearestWins = dispatchTeam('Roads & Stormwater', '-33.9210, 18.4230');
  assert.equal(nearestWins.team?.name, 'Roads Crew Beta');
});

test('dispatchTeam explains why it cannot assign', () => {
  const unknownDepartment = dispatchTeam('Marine & Harbour', '-33.9249, 18.4241');
  assert.equal(unknownDepartment.team, null);
  assert.match(unknownDepartment.reason, /No active field team/);

  const badLocation = dispatchTeam('Roads & Stormwater', 'not a coordinate');
  assert.equal(badLocation.team, null);
  assert.match(badLocation.reason, /not usable/);
});

test('dispatchTeam never dispatches an inactive crew', () => {
  const teams = [
    {
      id: 'T-TEST-1',
      name: 'Parked Crew',
      departments: ['City Parks'],
      lat: -33.9295,
      lon: 18.4162,
      active: false,
      members: 3,
      zone: 'Garden',
    },
  ];
  const result = dispatchTeam('City Parks', '-33.9295, 18.4162', teams);
  assert.equal(result.team, null);
  assert.match(result.reason, /No active field team/);
});

test('municipality stats compute rates, open work and resolution averages', () => {
  const nowMs = new Date(2026, 9, 16).getTime();
  const reports = [
    report({
      id: '#CF-1',
      status: 'Resolved',
      department: 'Water & Sanitation',
      timeline: [
        { stage: 'Reported', timestamp: '10 Oct 2026, 11:05 AM', done: true },
        { stage: 'Repaired', timestamp: '13 Oct 2026, 16:30 PM', done: true },
      ],
    }),
    report({ id: '#CF-2', status: 'In Progress', department: 'Roads & Stormwater' }),
    report({ id: '#CF-3', status: 'Received', department: 'Waste Management' }),
    report({ id: '#CF-4', status: 'Resolved', department: 'Waste Management' }),
  ];

  const stats = computeMunicipalityStats(reports, nowMs);
  assert.equal(stats.reportsReceived, 4);
  assert.equal(stats.resolved, 2);
  assert.equal(stats.resolutionRate, 50);
  assert.equal(stats.avgResolutionDays, 3);
  assert.equal(stats.open, 2);
  assert.equal(stats.awaitingAssignment, 1);

  const departments = computeDepartmentStats(reports, nowMs);
  assert.equal(departments.length, 3);
  const waste = departments.find((entry) => entry.department === 'Waste Management');
  assert.equal(waste?.resolved, 1);
  assert.equal(waste?.open, 1);
});

test('AI review metrics count resident acceptance separately from unclassified results', () => {
  const metrics = computeAiReviewMetrics([
    report({
      aiAssessment: {
        model: 'Xenova/clip-vit-base-patch32@d15189d7028b43f1d3e65039190477f6af591c2a',
        label: 'Pothole or damaged road surface',
        score: 0.62,
        inferenceMs: 120,
        outcome: 'accepted',
      },
    }),
    report({
      id: '#CF-10001',
      aiAssessment: {
        model: 'Xenova/clip-vit-base-patch32@d15189d7028b43f1d3e65039190477f6af591c2a',
        label: 'Broken water pipe or water leak',
        score: 0.37,
        inferenceMs: 220,
        outcome: 'edited',
      },
    }),
    report({
      id: '#CF-10002',
      aiAssessment: {
        model: 'Xenova/clip-vit-base-patch32@d15189d7028b43f1d3e65039190477f6af591c2a',
        label: 'No clear municipal infrastructure hazard',
        score: 0.51,
        inferenceMs: 50,
        outcome: 'unclassified',
      },
    }),
  ]);

  assert.deepEqual(metrics, {
    reportsAnalysed: 3,
    reviewed: 2,
    accepted: 1,
    edited: 1,
    unclassified: 1,
    acceptanceRate: 50,
    averageInferenceMs: 130,
  });
  assert.equal(computeAiReviewMetrics([]).acceptanceRate, null);
  assert.equal(computeAiReviewMetrics([]).averageInferenceMs, null);
});

test('empty report feeds produce zeroed stats instead of NaN', () => {
  const stats = computeMunicipalityStats([]);
  assert.equal(stats.reportsReceived, 0);
  assert.equal(stats.resolutionRate, 0);
  assert.equal(stats.avgResolutionDays, 0);
  assert.deepEqual(computeDepartmentStats([]), []);
  assert.deepEqual(computeInsights([]), []);
});

test('insights flag a department whose volume is climbing', () => {
  const nowMs = new Date(2026, 9, 16).getTime();
  const reports = [
    report({ id: '#CF-1', department: 'Water & Sanitation', date: '16 Oct 2026' }),
    report({ id: '#CF-2', department: 'Water & Sanitation', date: '14 Oct 2026' }),
    report({ id: '#CF-3', department: 'Water & Sanitation', date: '10 Oct 2026' }),
    report({ id: '#CF-4', department: 'Water & Sanitation', date: '10 Sep 2026' }),
  ];

  const insights = computeInsights(reports, nowMs);
  const trend = insights.find((insight) => insight.id === 'trend-Water & Sanitation');
  assert.ok(trend, 'expected a trend insight');
  assert.equal(trend?.tone, 'warning');
  assert.match(trend!.detail, /increased 200%/);
  assert.match(trend!.detail, /\(1 → 3\)/);
});

function assistantContext(overrides: Partial<AssistantContext> = {}): AssistantContext {
  return { alerts: [], announcements: [], reports: [], discussions: [], ...overrides };
}

test('assistant answers ticket lookups', () => {
  const ctx = assistantContext({ reports: [report({ id: '#CF-45821', status: 'In Progress' })] });
  const reply = answerQuestion('What is happening with CF-45821?', ctx);
  assert.match(reply.text, /#CF-45821/);
  assert.match(reply.text, /In Progress/);
  assert.equal(reply.suggestions[0]?.view, 'ticket');
});

test('assistant reports an unknown ticket instead of guessing', () => {
  const reply = answerQuestion('status of CF-99999', assistantContext());
  assert.match(reply.text, /could not find/i);
});

test('assistant surfaces active water alerts with restoration time', () => {
  const ctx = assistantContext({
    alerts: [
      {
        id: 'AL-1',
        level: 'important',
        title: 'Water interruption',
        body: 'Planned maintenance in the CBD. Expected restoration: 16:00.',
        category: 'Water',
        area: 'Cape Town Central',
        createdAt: '15 Oct 2026',
        active: true,
      },
    ],
  });

  const reply = answerQuestion('Why is there no water in my area?', ctx);
  assert.match(reply.text, /Water interruption/);
  assert.match(reply.text, /16:00/);
});

test('assistant routes reporting intent into the report flow', () => {
  const reply = answerQuestion('Where can I report illegal dumping?', assistantContext());
  assert.match(reply.text, /report/i);
  assert.ok(reply.suggestions.some((suggestion) => suggestion.startReport === true));
});

test('assistant counts open issues for a theme', () => {
  const ctx = assistantContext({
    reports: [
      report({ id: '#CF-1', status: 'In Progress' }),
      report({ id: '#CF-2', status: 'Assigned' }),
      report({ id: '#CF-3', status: 'Resolved' }),
    ],
  });
  const reply = answerQuestion('Are there any potholes near me?', ctx);
  assert.match(reply.text, /2 open/i);
});

test('assistant falls back with a helpful menu for unmatched input', () => {
  const reply = answerQuestion('zzz qqq unknown', assistantContext());
  assert.match(reply.text, /could not match/i);
  assert.ok(reply.suggestions.length >= 2);
});
