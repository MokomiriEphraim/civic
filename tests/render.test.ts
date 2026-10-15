import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  SEED_ALERTS,
  SEED_ANNOUNCEMENTS,
  SEED_DISCUSSIONS,
  SEED_DOCUMENTS,
  SEED_EVENTS,
  SEED_POLLS,
  SEED_PROJECTS,
} from '../src/data/seed';
import { SEED_REPORTS } from '../src/data/seedReports';
import type { ActiveView, HazardReport, ReportStatus, UserRole } from '../src/types';
import { AssistantDock } from '../src/components/AssistantDock';
import { BulletinsView } from '../src/components/BulletinsView';
import { CivicMapView } from '../src/components/CivicMapView';
import { CommunityView } from '../src/components/CommunityView';
import { DiscoverView } from '../src/components/DiscoverView';
import { HomeView } from '../src/components/HomeView';
import { Navbar } from '../src/components/Navbar';
import { OpsView } from '../src/components/OpsView';
import { RoleSwitcher } from '../src/components/RoleSwitcher';
import { TicketView } from '../src/components/TicketView';
import { TransparencyView } from '../src/components/TransparencyView';
import { WorkerView } from '../src/components/WorkerView';

const noop = () => {};
const asyncNoop = async (id: string): Promise<HazardReport> =>
  SEED_REPORTS.find((report) => report.id === id) ?? SEED_REPORTS[0];
const currentUser = { name: 'Demo Citizen', email: 'demo@example.com' };

function collections() {
  return {
    alerts: SEED_ALERTS,
    announcements: SEED_ANNOUNCEMENTS,
    discussions: SEED_DISCUSSIONS,
    polls: SEED_POLLS,
    events: SEED_EVENTS,
    documents: SEED_DOCUMENTS,
    projects: SEED_PROJECTS,
  };
}

function render(element: ReactElement, contains?: string): string {
  const html = renderToStaticMarkup(element);
  assert.ok(html.length > 200, `rendered markup is suspiciously short (${html.length})`);
  if (contains) {
    assert.ok(html.includes(contains), `expected rendered output to include "${contains}"`);
  }
  return html;
}

test('navigation and role chrome render for both roles', () => {
  render(
    createElement(Navbar, {
      activeView: 'home' as ActiveView,
      role: 'resident' as UserRole,
      onNavigate: noop,
      onRoleChange: noop,
      onStartReport: noop,
      user: currentUser,
      onToggleUser: noop,
    }),
    'Community'
  );
  render(
    createElement(Navbar, {
      activeView: 'ops' as ActiveView,
      role: 'staff' as UserRole,
      onNavigate: noop,
      onRoleChange: noop,
      onStartReport: noop,
      user: currentUser,
      onToggleUser: noop,
    }),
    'Field crew'
  );
  render(createElement(RoleSwitcher, { role: 'staff' as UserRole, onChange: noop }), 'Municipal');
});

test('resident home dashboard renders stats, alerts and the priority feed', () => {
  render(
    createElement(HomeView, {
      reports: SEED_REPORTS,
      collections: collections(),
      role: 'resident' as UserRole,
      currentUser,
      onNavigate: noop,
      onStartReport: noop,
      onOpenReport: noop,
    }),
    'Needs attention'
  );
});

test('map, ticket, transparency and assistant views render seed data', () => {
  render(
    createElement(CivicMapView, {
      reports: SEED_REPORTS,
      selectedId: SEED_REPORTS[0].id,
      onSelectReport: noop,
      onOpenTicket: noop,
    }),
    'Severity'
  );
  render(
    createElement(TicketView, {
      reports: SEED_REPORTS,
      selectedId: SEED_REPORTS[0].id,
      onSelectTicket: noop,
      onUpdateReportStatus: asyncNoop,
      onRefreshReports: noop,
      role: 'resident' as UserRole,
      currentUser,
    })
  );
  render(
    createElement(TransparencyView, { reports: SEED_REPORTS }),
    'resolution'
  );
  render(
    createElement(AssistantDock, {
      reports: SEED_REPORTS,
      alerts: SEED_ALERTS,
      announcements: SEED_ANNOUNCEMENTS,
      discussions: SEED_DISCUSSIONS,
      onNavigate: noop,
      onStartReport: noop,
      onOpenReport: noop,
    })
  );
});

test('community, bulletins and discover views render seed content', () => {
  render(
    createElement(CommunityView, {
      discussions: SEED_DISCUSSIONS,
      events: SEED_EVENTS,
      onRefresh: noop,
      onNavigate: noop,
    })
  );
  render(
    createElement(BulletinsView, {
      alerts: SEED_ALERTS,
      announcements: SEED_ANNOUNCEMENTS,
      onRefresh: noop,
    }),
    'Emergency'
  );
  render(
    createElement(DiscoverView, {
      projects: SEED_PROJECTS,
      polls: SEED_POLLS,
      documents: SEED_DOCUMENTS,
      onRefresh: noop,
    })
  );
});

test('municipal ops and field crew consoles render the work queue', () => {
  render(
    createElement(OpsView, {
      reports: SEED_REPORTS,
      onUpdateReportStatus: asyncNoop as (
        id: string,
        status: ReportStatus
      ) => Promise<HazardReport>,
      onRefresh: noop,
    })
  );
  render(
    createElement(WorkerView, {
      reports: SEED_REPORTS,
      onUpdateReportStatus: asyncNoop as (
        id: string,
        status: ReportStatus
      ) => Promise<HazardReport>,
    })
  );
});
