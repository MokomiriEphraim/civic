import React from 'react';
import { ActiveView, HazardReport, UserRole } from '../types';
import { OPEN_STATUSES } from '../types';
import type { CivicCollections } from '../api/collections';
import { computeMunicipalityStats } from '../utils/stats';
import { reportPriority } from '../utils/priority';
import { BandBadge, Card, SectionHeading, SeverityBadge, StatusBadge, EmptyState } from './ui';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Handshake,
  Map as MapIcon,
  Megaphone,
  MessageSquareText,
  PackageSearch,
  PieChart,
  PlusCircle,
  Sparkles,
} from 'lucide-react';

interface HomeViewProps {
  reports: HazardReport[];
  collections: CivicCollections;
  role: UserRole;
  currentUser: { name: string; email: string };
  onNavigate: (view: ActiveView) => void;
  onStartReport: () => void;
  onOpenReport: (id: string) => void;
}

function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const QUICK_LINKS: { view: ActiveView; label: string; hint: string; icon: React.ReactNode }[] = [
  { view: 'map', label: 'Civic map', hint: 'Every issue, plotted', icon: <MapIcon className="w-4 h-4" /> },
  { view: 'ticket', label: 'Track tickets', hint: 'Status & proof', icon: <ClipboardList className="w-4 h-4" /> },
  { view: 'community', label: 'Community', hint: 'Discussions', icon: <MessageSquareText className="w-4 h-4" /> },
  { view: 'discover', label: 'Discover', hint: 'Projects & polls', icon: <PackageSearch className="w-4 h-4" /> },
  { view: 'transparency', label: 'Transparency', hint: 'How we perform', icon: <PieChart className="w-4 h-4" /> },
  { view: 'bulletins', label: 'Bulletins', hint: 'Alerts & notices', icon: <Megaphone className="w-4 h-4" /> },
];

export const HomeView: React.FC<HomeViewProps> = ({
  reports,
  collections,
  role,
  currentUser,
  onNavigate,
  onStartReport,
  onOpenReport,
}) => {
  const now = new Date();
  const stats = computeMunicipalityStats(reports);
  const openReports = reports.filter((report) => OPEN_STATUSES.includes(report.status));
  const priorityFeed = [...openReports]
    .map((report) => ({ report, priority: reportPriority(report) }))
    .sort((a, b) => b.priority.score - a.priority.score)
    .slice(0, 6);

  const attentionAlerts = collections.alerts
    .filter((alert) => alert.active && alert.level !== 'info')
    .slice(0, 2);
  const latestAnnouncement = collections.announcements[0];
  const nextEvent = collections.events[0];

  const statCards = [
    { label: 'Open issues', value: stats.open, accent: 'text-slate-800' },
    { label: 'Resolved', value: stats.resolved, accent: 'text-emerald-700' },
    { label: 'Avg. resolution', value: `${stats.avgResolutionDays} d`, accent: 'text-sky-700' },
    { label: 'High priority', value: stats.highPriority, accent: 'text-rose-700' },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#234E35]/70">
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {greeting(now)}, {currentUser.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {role === 'staff'
              ? 'Municipal workspace overview — field load, urgent tickets and live bulletins.'
              : 'Your neighbourhood at a glance: what is open, what got fixed, and what needs you.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStartReport}
            className="inline-flex items-center gap-2 rounded-full bg-[#234E35] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1A3D29]"
          >
            <PlusCircle className="w-4 h-4" />
            Report a hazard
          </button>
          {role === 'staff' ? (
            <button
              type="button"
              onClick={() => onNavigate('ops')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              <Handshake className="w-4 h-4" />
              Ops console
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              <MapIcon className="w-4 h-4" />
              Open the map
            </button>
          )}
        </div>
      </header>

      {attentionAlerts.length > 0 && (
        <div className="mt-5 space-y-2">
          {attentionAlerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => onNavigate('bulletins')}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                alert.level === 'emergency'
                  ? 'border-rose-200 bg-rose-50 hover:bg-rose-100'
                  : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle
                className={`mt-0.5 w-4 h-4 shrink-0 ${
                  alert.level === 'emergency' ? 'text-rose-600' : 'text-amber-600'
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-800">{alert.title}</span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  {alert.area} · {alert.body}
                </span>
              </span>
              <ArrowRight className="mt-0.5 w-4 h-4 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-3 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {stat.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${stat.accent}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeading
            title="Needs attention"
            hint="Ranked by priority score — severity, impact, ageing and service rules."
            action={
              <button
                type="button"
                onClick={() => onNavigate('ticket')}
                className="text-xs font-semibold text-[#234E35] hover:underline"
              >
                All tickets
              </button>
            }
          />
          {priorityFeed.length === 0 ? (
            <EmptyState
              title="No open issues right now"
              hint="Everything reported in this demo has been resolved."
            />
          ) : (
            <div className="space-y-2.5">
              {priorityFeed.map(({ report, priority }) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => onOpenReport(report.id)}
                  className="group block w-full rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-xs transition hover:border-[#234E35]/40 hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{report.id}</span>
                    <BandBadge band={priority.band} score={priority.score} />
                    <SeverityBadge severity={report.severity} />
                    <StatusBadge status={report.status} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-800 group-hover:text-[#1A4329]">
                    {report.subType} · {report.location}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{report.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span>{report.department}</span>
                    <span>·</span>
                    <span>{report.date}</span>
                    {priority.factors.slice(0, 2).map((factor) => (
                      <span key={factor.label} className="text-slate-500">
                        {factor.label} +{factor.points}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <SectionHeading title="Quick actions" />
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.view}
                  type="button"
                  onClick={() => onNavigate(link.view)}
                  className="rounded-xl border border-slate-200/80 bg-white p-3 text-left shadow-xs transition hover:border-[#234E35]/40 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <span className="text-[#234E35]">{link.icon}</span>
                    {link.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">{link.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {latestAnnouncement && (
            <div>
              <SectionHeading title="Latest notice" />
              <Card>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                  <Sparkles className="w-3.5 h-3.5" />
                  {latestAnnouncement.municipality}
                </div>
                <p className="mt-1.5 text-sm font-bold text-slate-800">
                  {latestAnnouncement.title}
                </p>
                <p className="mt-1 line-clamp-3 text-xs text-slate-500">
                  {latestAnnouncement.body}
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  {latestAnnouncement.date}
                  {latestAnnouncement.verified ? ' · Verified' : ''}
                </p>
              </Card>
            </div>
          )}

          {nextEvent && (
            <div>
              <SectionHeading title="Coming up" />
              <Card>
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-sky-50 p-2 text-sky-700">
                    <CalendarDays className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{nextEvent.title}</p>
                    <p className="text-xs text-slate-500">
                      {nextEvent.date} · {nextEvent.time} · {nextEvent.location}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
