import React, { useMemo, useState } from 'react';
import type { HazardReport, HazardSeverity, ReportStatus } from '../types';
import { HAZARD_SEVERITIES, REPORT_STATUSES } from '../types';
import { reportPriority } from '../utils/priority';
import { daysAgo, parseLooseDate } from '../utils/dates';
import { BandBadge, EmptyState, SectionHeading, SeverityBadge, StatusBadge } from './ui';
import { ChevronRight, ImageOff, RefreshCw, Search, Truck } from 'lucide-react';

interface OpsViewProps {
  reports: HazardReport[];
  onUpdateReportStatus: (id: string, status: ReportStatus) => Promise<HazardReport>;
  onRefresh: () => void;
}

type SortKey = 'priority' | 'newest' | 'status';

const ROW_GRID =
  'lg:grid lg:grid-cols-[7rem_minmax(11rem,1.5fr)_9rem_6rem_7rem_7rem_4rem_9.5rem] lg:items-start lg:gap-3';

const PhotoFrame: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div className="flex h-32 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-100 text-[11px] text-slate-400">
        <ImageOff className="w-4 h-4" /> Photo unavailable
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-32 w-full rounded-xl object-cover"
    />
  );
};


const RowDetail: React.FC<{ report: HazardReport }> = ({ report }) => (
  <div className="grid gap-4 border-t border-slate-100 bg-slate-50/60 p-4 md:grid-cols-2">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{report.description}</p>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Assigned team
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-700">
        {report.assignedTeam ?? 'Not yet assigned'}
      </p>
      {report.address && <p className="mt-2 text-[11px] text-slate-500">{report.address}</p>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <PhotoFrame src={report.photoUrl} alt={report.subType} />
      <ol className="space-y-1.5">
        {(report.timeline ?? []).map((entry, index) => (
          <li key={`${report.id}-timeline-${index}`} className="flex items-start gap-2 text-[11px]">
            <span
              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                entry.done ? 'bg-[#234E35]' : 'bg-slate-300'
              }`}
            />
            <span className={entry.done ? 'text-slate-700' : 'text-slate-400'}>
              {entry.stage} · {entry.timestamp}
            </span>
          </li>
        ))}
        {(report.timeline ?? []).length === 0 && (
          <li className="text-[11px] text-slate-400">No timeline entries yet.</li>
        )}
      </ol>
    </div>
  </div>
);

const StatusControl: React.FC<{
  report: HazardReport;
  pending: boolean;
  error?: string;
  onStatus: (report: HazardReport, status: ReportStatus) => void;
}> = ({ report, pending, error, onStatus }) => (
  <div onClick={(event) => event.stopPropagation()}>
    <select
      aria-label={`Status for ${report.id}`}
      value={report.status}
      disabled={pending}
      onChange={(event) => onStatus(report, event.target.value as ReportStatus)}
      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-wait disabled:opacity-60"
    >
      {REPORT_STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
    {pending && (
      <span role="status" className="text-[10px] text-slate-400">
        Saving…
      </span>
    )}
    {error && (
      <span role="alert" className="block max-w-[15rem] text-[10px] font-semibold text-rose-600">
        {error}
      </span>
    )}
  </div>
);

const formatAge = (report: HazardReport): string => {
  const age = daysAgo(report.date);
  if (age === null) return '—';
  return age <= 0 ? 'today' : `${age}d`;
};

export const OpsView: React.FC<OpsViewProps> = ({
  reports,
  onUpdateReportStatus,
  onRefresh,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | ReportStatus>('All');
  const [severityFilter, setSeverityFilter] = useState<'All' | HazardSeverity>('All');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const changeStatus = async (report: HazardReport, status: ReportStatus) => {
    if (pending[report.id] || status === report.status) return;
    setPending((prev) => ({ ...prev, [report.id]: true }));
    setErrors((prev) => ({ ...prev, [report.id]: '' }));
    try {
      await onUpdateReportStatus(report.id, status);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [report.id]: error instanceof Error ? error.message : 'Could not update the status.',
      }));
    } finally {
      setPending((prev) => ({ ...prev, [report.id]: false }));
    }
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const filtered = reports.filter(
      (report) =>
        (statusFilter === 'All' || report.status === statusFilter) &&
        (severityFilter === 'All' || report.severity === severityFilter) &&
        (needle.length === 0 ||
          [report.id, report.subType, report.location, report.description].some((field) =>
            field.toLocaleLowerCase().includes(needle)
          ))
    );
    const sorted = [...filtered];
    if (sortKey === 'priority') {
      sorted.sort((left, right) => reportPriority(right).score - reportPriority(left).score);
    } else if (sortKey === 'newest') {
      sorted.sort(
        (left, right) => (parseLooseDate(right.date) ?? 0) - (parseLooseDate(left.date) ?? 0)
      );
    } else {
      sorted.sort(
        (left, right) =>
          REPORT_STATUSES.indexOf(left.status) - REPORT_STATUSES.indexOf(right.status) ||
          reportPriority(right).score - reportPriority(left).score
      );
    }
    return sorted;
  }, [reports, statusFilter, severityFilter, query, sortKey]);

  const dispatchQueue = useMemo(
    () =>
      reports
        .filter((report) => report.status === 'Received' || report.status === 'Verified')
        .sort((left, right) => reportPriority(right).score - reportPriority(left).score),
    [reports]
  );

  const workload = REPORT_STATUSES.map((status) => ({
    status,
    count: reports.filter((report) => report.status === status).length,
  }));

  const toggle = (id: string) => setExpandedId((current) => (current === id ? null : id));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#234E35]/70">
            Staff workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Operations console
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Dispatch, reassign and close tickets across every department.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        {workload.map((entry) => (
          <span
            key={entry.status}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-xs"
          >
            <StatusBadge status={entry.status} />
            <span className="text-slate-800">{entry.count}</span>
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(['All', ...REPORT_STATUSES] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                statusFilter === status
                  ? 'bg-[#234E35] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            aria-label="Filter by severity"
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value as HazardSeverity)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="All">All severities</option>
            {HAZARD_SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search id, hazard, location…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#234E35] focus:outline-none sm:w-64"
            />
          </div>
        </div>
      </div>

      <section className="mt-6">
        <SectionHeading
          title="Needs dispatch"
          hint="Received or verified tickets waiting for a crew."
        />
        {dispatchQueue.length === 0 ? (
          <EmptyState title="Nothing waiting for dispatch" hint="Every ticket has a crew." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dispatchQueue.map((report) => {
              const priority = reportPriority(report);
              return (
                <div
                  key={report.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{report.id}</span>
                    <SeverityBadge severity={report.severity} />
                    <BandBadge band={priority.band} score={priority.score} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {report.subType} · {report.location}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400">{report.department}</span>
                    <button
                      type="button"
                      disabled={pending[report.id]}
                      onClick={() => void changeStatus(report, 'Assigned')}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#234E35] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1A3D29] disabled:cursor-wait disabled:opacity-60"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      {pending[report.id] ? 'Assigning…' : 'Assign'}
                    </button>
                  </div>
                  {errors[report.id] && (
                    <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-600">
                      {errors[report.id]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionHeading
          title="Tickets"
          hint="Click a row to open the full detail."
          action={
            <select
              aria-label="Sort tickets"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="priority">Sort: priority</option>
              <option value="newest">Sort: newest</option>
              <option value="status">Sort: status</option>
            </select>
          }
        />
        {visible.length === 0 ? (
          <EmptyState
            title={reports.length === 0 ? 'No tickets yet' : 'No tickets match your filters'}
            hint={
              reports.length === 0
                ? 'Reports filed by residents will appear here.'
                : 'Try clearing the search or status filter.'
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div
              className={`hidden border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 ${ROW_GRID}`}
            >
              <span>Ticket</span>
              <span>Hazard</span>
              <span>Department</span>
              <span>Severity</span>
              <span>Priority</span>
              <span>Status</span>
              <span>Age</span>
              <span>Update</span>
            </div>
            {visible.map((report) => {
              const priority = reportPriority(report);
              const expanded = expandedId === report.id;
              return (
                <div key={report.id} className="border-b border-slate-100 last:border-b-0">
                  <div
                    onClick={() => toggle(report.id)}
                    className={`cursor-pointer px-4 py-3 transition hover:bg-slate-50 ${
                      expanded ? 'bg-slate-50/80' : ''
                    } ${ROW_GRID}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-900">
                        <ChevronRight
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                            expanded ? 'rotate-90' : ''
                          }`}
                        />
                        {report.id}
                      </span>
                      <span className="text-[11px] text-slate-400 lg:hidden">
                        {formatAge(report)}
                      </span>
                    </div>
                    <div className="mt-1.5 lg:mt-0">
                      <p className="text-xs font-semibold text-slate-800">{report.subType}</p>
                      <p className="font-mono text-[11px] text-slate-400">{report.location}</p>
                    </div>
                    <div className="mt-1.5 text-xs text-slate-600 lg:mt-0">
                      {report.department}
                    </div>
                    <div className="mt-1.5 lg:mt-0">
                      <SeverityBadge severity={report.severity} />
                    </div>
                    <div className="mt-1.5 lg:mt-0">
                      <BandBadge band={priority.band} score={priority.score} />
                    </div>
                    <div className="mt-1.5 lg:mt-0">
                      <StatusBadge status={report.status} />
                    </div>
                    <div className="mt-1.5 hidden text-xs text-slate-500 lg:mt-0 lg:block">
                      {formatAge(report)}
                    </div>
                    <div className="mt-2 lg:mt-0">
                      <StatusControl
                        report={report}
                        pending={!!pending[report.id]}
                        error={errors[report.id]}
                        onStatus={changeStatus}
                      />
                    </div>
                  </div>
                  {expanded && <RowDetail report={report} />}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
