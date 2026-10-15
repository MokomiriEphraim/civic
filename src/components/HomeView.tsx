import React, { useEffect, useMemo, useState } from 'react';
import type { ActiveView, HazardReport, ReportEngagement, ReportStatus, UserRole } from '../types';
import { OPEN_STATUSES } from '../types';
import type { CivicCollections } from '../api/collections';
import { getEngagement } from '../api/reports';
import { daysAgo } from '../utils/dates';
import { reportPriority } from '../utils/priority';
import { dispatchTeam, servesDepartment } from '../utils/dispatch';
import { distanceMeters, parseCoordinates } from '../utils/proximity';
import { FIELD_TEAMS } from '../data/teams';
import { crewEtaMinutes, MapCanvas, type CrewMarker } from './MapCanvas';
import { BandBadge, EmptyState, SeverityBadge, StatusBadge } from './ui';
import { RoleSwitcher } from './RoleSwitcher';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Droplets,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Map as MapIcon,
  Megaphone,
  MessageSquare,
  PackageSearch,
  PieChart,
  PlusCircle,
  Search,
  Trash2,
  TrafficCone,
  Truck,
  Users,
} from 'lucide-react';

interface HomeViewProps {
  reports: HazardReport[];
  collections: CivicCollections;
  role: UserRole;
  currentUser: { name: string; email: string };
  selectedId: string | null;
  onSelectReport: (id: string) => void;
  onUpdateReportStatus: (id: string, status: ReportStatus) => Promise<HazardReport>;
  onRefresh: () => void;
  onNavigate: (view: ActiveView) => void;
  onRoleChange: (role: UserRole) => void;
  onStartReport: () => void;
  onOpenReport: (id: string) => void;
}

type QueueChip = 'all' | 'risk' | 'crew' | 'progress' | 'resolved';

interface QueueGroup {
  key: string;
  label: string;
  reports: HazardReport[];
  tone: string;
}

const NAV_SECTIONS: {
  title: string;
  items: { view: ActiveView; label: string; icon: React.ReactNode }[];
}[] = [
  {
    title: 'Operations',
    items: [
      { view: 'home', label: 'Live queue', icon: <LayoutDashboard className="w-4 h-4" /> },
      { view: 'ticket', label: 'Tickets', icon: <ClipboardList className="w-4 h-4" /> },
      { view: 'map', label: 'Civic map', icon: <MapIcon className="w-4 h-4" /> },
      { view: 'bulletins', label: 'Bulletins', icon: <Megaphone className="w-4 h-4" /> },
    ],
  },
  {
    title: 'People',
    items: [
      { view: 'community', label: 'Community', icon: <Users className="w-4 h-4" /> },
      { view: 'discover', label: 'Discover', icon: <PackageSearch className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Performance',
    items: [
      { view: 'transparency', label: 'Transparency', icon: <PieChart className="w-4 h-4" /> },
      { view: 'dashboard', label: 'My reports', icon: <FileText className="w-4 h-4" /> },
    ],
  },
];

function hazardIcon(subType: string): React.ReactNode {
  const value = subType.toLowerCase();
  if (value.includes('water') || value.includes('drain') || value.includes('leak')) {
    return <Droplets className="w-4 h-4" />;
  }
  if (value.includes('dump') || value.includes('waste') || value.includes('bin')) {
    return <Trash2 className="w-4 h-4" />;
  }
  if (value.includes('light') || value.includes('lamp') || value.includes('signal')) {
    return <Lightbulb className="w-4 h-4" />;
  }
  return <TrafficCone className="w-4 h-4" />;
}

function ageDays(report: HazardReport): number {
  return daysAgo(report.date) ?? 0;
}

function isOpen(report: HazardReport): boolean {
  return OPEN_STATUSES.includes(report.status);
}

function isOverdue(report: HazardReport): boolean {
  return isOpen(report) && (ageDays(report) >= 5 || report.severity === 'Critical');
}

function groupReports(reports: HazardReport[], expanded: Set<string>): QueueGroup[] {
  const byAge = (a: HazardReport, b: HazardReport) => ageDays(b) - ageDays(a);
  const groups: QueueGroup[] = [
    {
      key: 'risk',
      label: 'At risk',
      tone: 'text-rose-600',
      reports: reports.filter(isOverdue).sort(byAge),
    },
    {
      key: 'triage',
      label: 'Needs a crew',
      tone: 'text-slate-500',
      reports: reports
        .filter((report) => report.status === 'Received' || report.status === 'Verified')
        .sort(byAge),
    },
    {
      key: 'assigned',
      label: 'Crew assigned',
      tone: 'text-amber-600',
      reports: reports.filter((report) => report.status === 'Assigned').sort(byAge),
    },
    {
      key: 'progress',
      label: 'In progress',
      tone: 'text-indigo-600',
      reports: reports.filter((report) => report.status === 'In Progress').sort(byAge),
    },
    {
      key: 'resolved',
      label: 'Closed',
      tone: 'text-emerald-600',
      reports: reports
        .filter((report) => report.status === 'Resolved' || report.status === 'Rejected')
        .sort(byAge),
    },
  ];
  return groups
    .filter((group) => group.reports.length > 0)
    .map((group) => ({
      ...group,
      reports: expanded.has(group.key) ? group.reports : group.reports.slice(0, 4),
    }));
}

function narrative(report: HazardReport, crewName: string | null, affected: number): string {
  const age = ageDays(report);
  const where = report.address || report.location;
  const days = `${age} day${age === 1 ? '' : 's'}`;
  switch (report.status) {
    case 'Received':
      return `Received ${days} ago and waiting for verification. ${
        crewName ? `${crewName} is the nearest matching crew` : 'No crew is registered for this department'
      } for ${where}.`;
    case 'Verified':
      return `Verified and queued for dispatch — ${crewName ?? 'no crew assigned yet'}. ${affected} resident${
        affected === 1 ? '' : 's'
      } confirmed this is still a problem around ${where}.`;
    case 'Assigned':
      return `${crewName ?? 'A crew'} was assigned${
        age > 0 ? ` ${days} ago` : ''
      } but work has not started. ${affected} resident${affected === 1 ? '' : 's'} affected near ${where}.`;
    case 'In Progress':
      return `${crewName ?? 'The crew'} is working on the ${report.subType.toLowerCase()} at ${where}. Severity is ${report.severity} — it stays in this lane until the fix is confirmed.`;
    case 'Resolved':
      return `Fixed and closed after ${days}. The ${report.subType.toLowerCase()} at ${where} is done — residents can still confirm or rate the work on the ticket.`;
    case 'Rejected':
      return `Closed without action at ${where}. The ticket was assessed as not actionable; a new report can be filed if it changes.`;
  }
}

export const HomeView: React.FC<HomeViewProps> = ({
  reports,
  collections,
  role,
  currentUser,
  selectedId,
  onSelectReport,
  onUpdateReportStatus,
  onRefresh,
  onNavigate,
  onRoleChange,
  onStartReport,
  onOpenReport,
}) => {
  const [chip, setChip] = useState<QueueChip>('all');
  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());
  const [engagement, setEngagement] = useState<ReportEngagement | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleReports = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return reports.filter((report) => {
      if (departmentFilter && report.department !== departmentFilter) return false;
      if (!needle) return true;
      return `${report.id} ${report.subType} ${report.location} ${report.department} ${report.description}`
        .toLocaleLowerCase()
        .includes(needle);
    });
  }, [reports, query, departmentFilter]);

  const counts = useMemo(
    () => ({
      all: visibleReports.length,
      risk: visibleReports.filter(isOverdue).length,
      crew: visibleReports.filter((report) =>
        ['Received', 'Verified', 'Assigned'].includes(report.status)
      ).length,
      progress: visibleReports.filter((report) => report.status === 'In Progress').length,
      resolved: visibleReports.filter(
        (report) => report.status === 'Resolved' || report.status === 'Rejected'
      ).length,
    }),
    [visibleReports]
  );

  const chipFiltered = useMemo(() => {
    switch (chip) {
      case 'risk':
        return visibleReports.filter(isOverdue);
      case 'crew':
        return visibleReports.filter((report) =>
          ['Received', 'Verified', 'Assigned'].includes(report.status)
        );
      case 'progress':
        return visibleReports.filter((report) => report.status === 'In Progress');
      case 'resolved':
        return visibleReports.filter(
          (report) => report.status === 'Resolved' || report.status === 'Rejected'
        );
      default:
        return visibleReports;
    }
  }, [visibleReports, chip]);

  const groups = useMemo(() => groupReports(chipFiltered, expanded), [chipFiltered, expanded]);

  const selected = useMemo(
    () =>
      reports.find((report) => report.id === selectedId) ??
      chipFiltered[0] ??
      reports[0] ??
      null,
    [reports, chipFiltered, selectedId]
  );

  const selectedIdKey = selected?.id ?? null;
  useEffect(() => {
    let cancelled = false;
    if (!selectedIdKey) {
      setEngagement(null);
      return;
    }
    setEngagement(null);
    getEngagement(selectedIdKey)
      .then((record) => {
        if (!cancelled) setEngagement(record);
      })
      .catch(() => {
        if (!cancelled) setEngagement(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIdKey]);

  const dispatch = useMemo(
    () => (selected ? dispatchTeam(selected.department, selected.location) : null),
    [selected]
  );

  const crews: CrewMarker[] = useMemo(() => {
    if (!selected) return [];
    const origin = parseCoordinates(selected.location);
    return FIELD_TEAMS.filter((team) => team.active && servesDepartment(team, selected.department))
      .map((team) => {
        const metres = origin ? distanceMeters(origin, { lat: team.lat, lon: team.lon }) : null;
        return {
          id: team.id,
          label: team.name,
          lat: team.lat,
          lon: team.lon,
          minutes: metres !== null ? crewEtaMinutes(metres) : undefined,
        };
      })
      .sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0))
      .slice(0, 3);
  }, [selected]);

  const departmentCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const report of reports) {
      if (!isOpen(report)) continue;
      map.set(report.department, (map.get(report.department) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [reports]);

  const activeAlerts = collections.alerts.filter((alert) => alert.active).length;
  const priority = selected ? reportPriority(selected, engagement?.affected ?? 0) : null;
  const selectedAge = selected ? ageDays(selected) : 0;
  const stages = selected?.timeline ?? [];
  const doneStages = stages.filter((stage) => stage.done).length;
  const progressPct = stages.length === 0 ? 0 : Math.round((doneStages / stages.length) * 100);
  const matchPct =
    dispatch?.distanceMetres !== null && dispatch?.distanceMetres !== undefined
      ? Math.max(62, 100 - Math.round(crewEtaMinutes(dispatch.distanceMetres) / 2))
      : null;
  const affected = engagement?.affected ?? 0;

  const chips: { key: QueueChip; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'risk', label: 'At risk', count: counts.risk },
    { key: 'crew', label: 'Awaiting crew', count: counts.crew },
    { key: 'progress', label: 'In progress', count: counts.progress },
    { key: 'resolved', label: 'Closed', count: counts.resolved },
  ];

  const toggleGroup = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDispatch = async () => {
    if (!selected || dispatching) return;
    setDispatching(true);
    setDispatchError(null);
    try {
      await onUpdateReportStatus(selected.id, 'Assigned');
      onRefresh();
    } catch (error) {
      setDispatchError(
        error instanceof Error ? error.message : 'The crew could not be assigned.'
      );
    } finally {
      setDispatching(false);
    }
  };

  const sidebarNav = (
    <nav className="flex flex-col gap-5">
      <div className="space-y-1">
        <button
          type="button"
          onClick={onStartReport}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16140F] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-black"
        >
          <PlusCircle className="h-4 w-4" />
          Report a hazard
        </button>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tickets…"
            aria-label="Search tickets"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#234E35] focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => onNavigate('ops')}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-[#234E35]/30 bg-[#234E35]/5 px-3 py-2.5 text-xs font-bold text-[#1A4329] transition hover:bg-[#234E35]/12"
        >
          <Building2 className="h-4 w-4" />
          Municipal dashboard
        </button>
        {role === 'staff' && (
          <button
            type="button"
            onClick={() => onNavigate('worker')}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <Truck className="h-3.5 w-3.5" />
            Field crew console
          </button>
        )}
      </div>

      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = item.view === 'home';
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => onNavigate(item.view)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                  }`}
                >
                  <span className={active ? 'text-[#234E35]' : 'text-slate-400'}>{item.icon}</span>
                  {item.label}
                  {item.view === 'bulletins' && activeAlerts > 0 && (
                    <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                      {activeAlerts}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Open by department
        </p>
        <div className="space-y-0.5">
          {departmentCounts.slice(0, 6).map(([department, count]) => {
            const active = departmentFilter === department;
            return (
              <button
                key={department}
                type="button"
                onClick={() => setDepartmentFilter(active ? null : department)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition ${
                  active
                    ? 'bg-[#234E35]/10 font-bold text-[#1A4329]'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#234E35]' : 'bg-slate-300'}`}
                />
                <span className="truncate">{department}</span>
                <span className="ml-auto font-mono text-[11px] text-slate-400">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full bg-[#F2F1EC] text-slate-800">
      {/* ------------------------------------------------ */}
      {/* SIDEBAR (lg+) / horizontal strip on small screens */}
      {/* ------------------------------------------------ */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-slate-200/80 bg-[#F7F6F2] p-4 lg:flex">
        <div>
          <div className="mb-5 flex items-center gap-2.5 px-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16140F] text-xs font-black text-white">
              CF
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">CivicFix</p>
              <p className="text-[10px] text-slate-500">Cape Town Metro</p>
            </div>
            <span className="ml-auto text-slate-400">
              <Building2 className="h-4 w-4" />
            </span>
          </div>
          {sidebarNav}
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4">
          <RoleSwitcher role={role} onChange={onRoleChange} compact />
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            title="Open my reports"
            className="flex w-full items-center gap-2.5 rounded-xl bg-white p-2.5 text-left ring-1 ring-slate-200 transition hover:ring-slate-300"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#234E35] text-[11px] font-bold text-white">
              {currentUser.name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-xs font-bold text-slate-800">
                {currentUser.name}
              </span>
              <span className="block text-[10px] text-slate-500">
                {role === 'staff' ? 'Care coordinator' : 'Resident'} · My reports
              </span>
            </span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ------------------------------------------------ */}
        {/* TOP BAR                                           */}
        {/* ------------------------------------------------ */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-[#F7F6F2] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="hidden sm:inline">CivicFix</span>
            <span className="hidden sm:inline text-slate-300">›</span>
            <span className="text-slate-800">Live queue</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
              · {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('bulletins')}
              className="relative rounded-full bg-white p-2 text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-800"
              aria-label="Bulletins"
            >
              <Megaphone className="h-4 w-4" />
              {activeAlerts > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#F7F6F2]" />
              )}
            </button>
          </div>
        </header>

        {/* Small-screen nav strip */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-200/70 bg-[#F7F6F2] px-4 py-2 lg:hidden">
          {[
            ...NAV_SECTIONS.flatMap((section) => section.items),
            { view: 'ops' as ActiveView, label: 'Municipal dashboard' },
            ...(role === 'staff'
              ? [{ view: 'worker' as ActiveView, label: 'Field crew' }]
              : []),
          ].map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => onNavigate(item.view)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                item.view === 'home'
                  ? 'bg-[#16140F] text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <main className="flex-1 px-4 py-5 sm:px-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Live queue</h1>
              <p className="text-xs text-slate-500">
                {counts.all} ticket{counts.all === 1 ? '' : 's'}
                {departmentFilter ? ` in ${departmentFilter}` : ''} · sorted by urgency
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setChip(item.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                    chip === item.key
                      ? 'bg-[#16140F] text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  <span
                    className={`font-mono text-[10px] ${
                      chip === item.key ? 'text-white/70' : 'text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            {/* ---------------- LIVE QUEUE ---------------- */}
            <section className="lg:col-span-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-3">
                <div className="mb-1 flex items-center justify-between px-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Live ticket queue
                  </p>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {chipFiltered.length} shown
                  </span>
                </div>

                {groups.length === 0 ? (
                  <div className="p-2">
                    <EmptyState
                      title="Nothing in this lane"
                      hint="Try another filter or clear the search."
                    />
                  </div>
                ) : (
                  <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-0.5">
                    {groups.map((group) => (
                      <div key={group.key}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          className="flex w-full items-center gap-2 px-1 pb-1.5 pt-1 text-left"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              group.key === 'risk'
                                ? 'bg-rose-500'
                                : group.key === 'assigned'
                                  ? 'bg-amber-500'
                                  : group.key === 'progress'
                                    ? 'bg-indigo-500'
                                    : group.key === 'resolved'
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-400'
                            }`}
                          />
                          <span
                            className={`text-[10px] font-bold uppercase tracking-[0.14em] ${group.tone}`}
                          >
                            {group.label}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {group.reports.length}
                          </span>
                          <ChevronDown
                            className={`ml-auto h-3.5 w-3.5 text-slate-400 transition ${
                              expanded.has(group.key) ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        <div className="space-y-1.5">
                          {group.reports.map((report) => {
                            const active = selected?.id === report.id;
                            const overdue = isOverdue(report);
                            const rowPriority = reportPriority(report, 0);
                            const iconTone = overdue
                              ? 'bg-rose-50 text-rose-600'
                              : report.status === 'Resolved' || report.status === 'Rejected'
                                ? 'bg-emerald-50 text-emerald-600'
                                : report.status === 'In Progress'
                                  ? 'bg-indigo-50 text-indigo-600'
                                  : report.status === 'Assigned'
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-slate-100 text-slate-500';
                            const badge = overdue ? (
                              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                Overdue {ageDays(report)}d
                              </span>
                            ) : report.status === 'Received' || report.status === 'Verified' ? (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                                No crew
                              </span>
                            ) : report.status === 'Assigned' ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                                P{rowPriority.score}
                              </span>
                            ) : report.status === 'In Progress' ? (
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700">
                                Working
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                                Closed
                              </span>
                            );
                            return (
                              <button
                                key={report.id}
                                type="button"
                                onClick={() => onSelectReport(report.id)}
                                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                                  active
                                    ? 'border-[#234E35] bg-white shadow-xs'
                                    : 'border-slate-200/70 bg-white/70 hover:bg-white'
                                }`}
                              >
                                <span
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconTone}`}
                                >
                                  {hazardIcon(report.subType)}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-1.5">
                                    <span className="truncate text-xs font-bold text-slate-800">
                                      {report.subType}
                                    </span>
                                    {report.severity === 'Critical' && (
                                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                                    )}
                                  </span>
                                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                                    <span className="font-mono">{report.id}</span>
                                    <span className="text-slate-300">·</span>
                                    <span className="truncate">{report.department}</span>
                                  </span>
                                </span>
                                {badge}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ---------------- DETAIL + MAP + ACTIONS ---------------- */}
            <div className="space-y-4 lg:col-span-8">
              {selected && priority ? (
                <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={selected.status} />
                      <SeverityBadge severity={selected.severity} />
                      <BandBadge band={priority.band} score={priority.score} />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                      <span className="font-mono">{selected.id}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {selectedAge}d open
                      </span>
                    </div>
                  </div>

                  <h2 className="mt-3 text-base font-bold text-slate-900">{selected.subType}</h2>
                  <p className="text-xs text-slate-500">
                    {selected.address || selected.location} · {selected.department}
                  </p>
                  <p className="mt-3 rounded-xl bg-[#F7F6F2] p-3 text-xs leading-relaxed text-slate-600">
                    {narrative(selected, dispatch?.team?.name ?? null, affected)}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200/80 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Nearest crew
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Truck className="h-3.5 w-3.5 text-[#234E35]" />
                        {dispatch?.team ? dispatch.team.name : 'Unassigned'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {dispatch?.team && dispatch.distanceMetres !== null
                          ? `${crewEtaMinutes(dispatch.distanceMetres)} min · ${(dispatch.distanceMetres / 1000).toFixed(1)} km`
                          : dispatch?.reason ?? '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Residents affected
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Users className="h-3.5 w-3.5 text-[#234E35]" />
                        {affected} confirmed
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {engagement?.confirmations.length ?? 0} confirmation
                        {(engagement?.confirmations.length ?? 0) === 1 ? '' : 's'} on this ticket
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Civic priority
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-800">
                        {priority.score}/100 · {priority.band}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {priority.factors[0]?.label ?? '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span>Progress {progressPct}%</span>
                      <span>{selected.status === 'Resolved' ? 'Resolved' : 'Due'}</span>
                    </div>
                    <div className="relative mt-2 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-[#234E35] transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                      <span
                        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow"
                        style={{ left: `${progressPct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">
                        {stages.filter((stage) => stage.done).at(-1)?.stage ?? 'Report received'}
                      </span>
                      <span className="text-slate-400">
                        {stages.at(-1)?.stage ?? selected.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenReport(selected.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#16140F] px-4 py-2 text-xs font-bold text-white transition hover:bg-black"
                    >
                      Open ticket
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    {role === 'staff' &&
                      (selected.status === 'Received' || selected.status === 'Verified') && (
                        <button
                          type="button"
                          onClick={handleDispatch}
                          disabled={dispatching}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-60"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          {dispatching ? 'Assigning…' : 'Assign crew'}
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={() => onNavigate('map')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      <MapIcon className="h-3.5 w-3.5" />
                      View on map
                    </button>
                  </div>
                  {dispatchError && (
                    <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">
                      {dispatchError}
                    </p>
                  )}
                </section>
              ) : (
                <EmptyState
                  title="No ticket selected"
                  hint="Pick a ticket from the queue to see its live status."
                />
              )}

              {/* Crew map */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Where crews are
                    </p>
                    <p className="text-xs font-semibold text-slate-700">
                      {selected
                        ? `${selected.subType} · ${selected.department}`
                        : 'Cape Town Metro'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                </div>
                <div className="relative h-64 overflow-hidden rounded-xl ring-1 ring-slate-200">
                  <MapCanvas
                    reports={chipFiltered.length > 0 ? chipFiltered : reports}
                    selectedId={selected?.id ?? null}
                    onSelectReport={onSelectReport}
                    crews={crews}
                    overlay={
                      <>
                        {selected && (
                          <span className="absolute left-3 top-3 rounded-full bg-[#16140F]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                            {selected.id} · {selected.status}
                          </span>
                        )}
                        <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                          {crews.length} crew nearby
                        </span>
                      </>
                    }
                  />
                </div>
              </section>

              {/* Suggested dispatch + watch-outs */}
              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Suggested dispatch
                    </p>
                    <span className="rounded-full bg-[#234E35]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#1A4329]">
                      Suggested
                    </span>
                  </div>

                  {selected && dispatch?.team ? (
                    <>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-slate-900">
                          {matchPct ?? '—'}%
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          route match for {dispatch.team.name}
                        </span>
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {[
                          `Nearest active crew serving ${selected.department}`,
                          dispatch.distanceMetres !== null
                            ? `${crewEtaMinutes(dispatch.distanceMetres)} min drive · ${(dispatch.distanceMetres / 1000).toFixed(1)} km away`
                            : dispatch.reason,
                          `Priority ${priority?.score ?? 0} (${priority?.band ?? '—'}) · ${selectedAge}d open`,
                          affected > 0
                            ? `${affected} resident${affected === 1 ? '' : 's'} confirmed impact`
                            : 'No confirmations yet — first to report',
                        ].map((line) => (
                          <li
                            key={line}
                            className="flex items-start gap-2 text-[11px] leading-snug text-slate-600"
                          >
                            <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            {line}
                          </li>
                        ))}
                      </ul>
                      {role === 'staff' ? (
                        <button
                          type="button"
                          onClick={handleDispatch}
                          disabled={dispatching}
                          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#16140F] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-black disabled:opacity-60"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          {dispatching ? 'Assigning…' : 'Dispatch crew'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenReport(selected.id)}
                          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-slate-400"
                        >
                          Follow this dispatch
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="mt-3 text-xs leading-relaxed text-slate-600">
                        {dispatch?.reason ?? 'Select a ticket to see a dispatch suggestion.'}
                      </p>
                      {selected && (
                        <button
                          type="button"
                          onClick={() => onOpenReport(selected.id)}
                          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-slate-400"
                        >
                          Open ticket
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </section>

                <section className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                      Contact / watch-outs
                    </p>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>

                  {selected ? (
                    <ul className="mt-3 space-y-1.5">
                      {[
                        selectedAge >= 3
                          ? `Open ${selectedAge} days — past the 3-day service target`
                          : `Opened ${selectedAge} day${selectedAge === 1 ? '' : 's'} ago — inside the service target`,
                        affected > 0
                          ? `${affected} resident${affected === 1 ? '' : 's'} confirmed it is still happening`
                          : 'No resident confirmations yet — monitor for duplicates',
                        selected.severity === 'Critical'
                          ? 'Critical severity — escalate if it has not moved today'
                          : `${selected.severity} severity · ${selected.department} owns this`,
                        `${
                          departmentCounts.find(([name]) => name === selected.department)?.[1] ?? 0
                        } open ticket${
                          (departmentCounts.find(([name]) => name === selected.department)?.[1] ??
                            0) === 1
                            ? ''
                            : 's'
                        } in ${selected.department}`,
                      ].map((line) => (
                        <li
                          key={line}
                          className="flex items-start gap-2 text-[11px] leading-snug text-amber-900/80"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-amber-900/70">
                      Select a ticket to see watch-outs.
                    </p>
                  )}

                  {selected && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenReport(selected.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 text-[11px] font-bold text-amber-900 transition hover:border-amber-400"
                      >
                        Open ticket
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenReport(selected.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 text-[11px] font-bold text-amber-900 transition hover:border-amber-400"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Message crew
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
