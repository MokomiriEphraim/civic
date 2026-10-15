import React, { useMemo, useState } from 'react';
import type { HazardReport, ReportStatus } from '../types';
import { reportPriority } from '../utils/priority';
import { daysBetween, parseLooseDate } from '../utils/dates';
import { BandBadge, EmptyState, SectionHeading, SeverityBadge, StatusBadge } from './ui';
import { Ban, CheckCircle2, HelpCircle, ImageOff, MapPin, Play, UserPlus } from 'lucide-react';

interface WorkerViewProps {
  reports: HazardReport[];
  onUpdateReportStatus: (id: string, status: ReportStatus) => Promise<HazardReport>;
}

type TabKey = 'active' | 'collect' | 'done';

const TABS: { key: TabKey; label: string; statuses: ReportStatus[] }[] = [
  { key: 'active', label: 'Active', statuses: ['Assigned', 'In Progress'] },
  { key: 'collect', label: 'To collect', statuses: ['Received', 'Verified'] },
  { key: 'done', label: 'Done today', statuses: ['Resolved'] },
];

const PhotoFrame: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div className="flex h-36 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-100 text-[11px] text-slate-400">
        <ImageOff className="w-4 h-4" />
        Photo unavailable
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-36 w-full rounded-xl object-cover"
    />
  );
};

const TicketCard: React.FC<{
  report: HazardReport;
  pending: boolean;
  error?: string;
  note?: string;
  onStatus: (report: HazardReport, status: ReportStatus) => void;
  onNeedsInfo: (id: string) => void;
  onDismissNote: (id: string) => void;
}> = ({ report, pending, error, note, onStatus, onNeedsInfo, onDismissNote }) => {
  const priority = reportPriority(report);
  const timeline = report.timeline ?? [];
  const doneCount = timeline.filter((entry) => entry.done).length;
  const progress = timeline.length === 0 ? 0 : Math.round((doneCount / timeline.length) * 100);

  const primary =
    report.status === 'Assigned'
      ? { label: 'Start work', next: 'In Progress' as ReportStatus, icon: <Play className="w-4 h-4" /> }
      : report.status === 'In Progress'
        ? { label: 'Mark resolved', next: 'Resolved' as ReportStatus, icon: <CheckCircle2 className="w-4 h-4" /> }
        : report.status === 'Received' || report.status === 'Verified'
          ? { label: 'Accept ticket', next: 'Assigned' as ReportStatus, icon: <UserPlus className="w-4 h-4" /> }
          : null;

  const canBlock = report.status === 'Assigned' || report.status === 'In Progress';

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-bold text-slate-400">{report.id}</span>
        <StatusBadge status={report.status} />
        <SeverityBadge severity={report.severity} />
        <BandBadge band={priority.band} score={priority.score} />
      </div>

      <p className="mt-2 text-sm font-bold text-slate-800">{report.subType}</p>
      <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
        <MapPin className="w-3.5 h-3.5 shrink-0 text-[#234E35]" />
        {report.location}
      </p>
      <p className="mt-1 text-[11px] text-slate-400">
        {report.department}
        {report.assignedTeam ? ` · ${report.assignedTeam}` : ''}
      </p>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Progress</span>
          <span>
            {doneCount}/{timeline.length} stages
          </span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#234E35] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-600">{report.description}</p>
      <div className="mt-3">
        <PhotoFrame src={report.photoUrl} alt={report.subType} />
      </div>

      {note && (
        <div
          role="status"
          className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
        >
          <p className="text-[11px] font-semibold text-amber-800">{note}</p>
          <button
            type="button"
            onClick={() => onDismissNote(report.id)}
            className="text-[11px] font-bold text-amber-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {primary && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onStatus(report, primary.next)}
            className="inline-flex items-center gap-2 rounded-full bg-[#234E35] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1A3D29] disabled:cursor-wait disabled:opacity-60"
          >
            {primary.icon}
            {pending ? 'Saving…' : primary.label}
          </button>
        )}
        {report.status === 'In Progress' && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onNeedsInfo(report.id)}
            className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
          >
            <HelpCircle className="w-4 h-4" />
            Needs more info
          </button>
        )}
        {canBlock && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onStatus(report, 'Verified')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-60"
          >
            <Ban className="w-4 h-4" />
            Report blocked
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-600">
          {error}
        </p>
      )}
    </article>
  );
};

export const WorkerView: React.FC<WorkerViewProps> = ({ reports, onUpdateReportStatus }) => {
  const [tab, setTab] = useState<TabKey>('active');
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const summary = useMemo(() => {
    const assigned = reports.filter((report) => report.status === 'Assigned').length;
    const inProgress = reports.filter((report) => report.status === 'In Progress').length;
    const resolvedToday = reports.filter((report) => {
      if (report.status !== 'Resolved') return false;
      const completed = [...(report.timeline ?? [])]
        .reverse()
        .find((entry) => entry.done && parseLooseDate(entry.timestamp) !== null);
      const resolvedAt = completed ? parseLooseDate(completed.timestamp) : parseLooseDate(report.date);
      return resolvedAt !== null && daysBetween(resolvedAt, Date.now()) === 0;
    }).length;
    return { assigned, inProgress, resolvedToday };
  }, [reports]);

  const changeStatus = async (report: HazardReport, status: ReportStatus) => {
    if (pending[report.id] || status === report.status) return;
    setPending((prev) => ({ ...prev, [report.id]: true }));
    setErrors((prev) => ({ ...prev, [report.id]: '' }));
    try {
      await onUpdateReportStatus(report.id, status);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [report.id]: error instanceof Error ? error.message : 'Could not update the ticket.',
      }));
    } finally {
      setPending((prev) => ({ ...prev, [report.id]: false }));
    }
  };

  const activeTab = TABS.find((entry) => entry.key === tab) ?? TABS[0];
  const queue = reports.filter((report) => activeTab.statuses.includes(report.status));
  const counts: Record<TabKey, number> = {
    active: reports.filter((report) =>
      ['Assigned', 'In Progress'].includes(report.status)
    ).length,
    collect: reports.filter((report) => ['Received', 'Verified'].includes(report.status)).length,
    done: reports.filter((report) => report.status === 'Resolved').length,
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#234E35]/70">
          Field crew
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">My crew queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tickets routed to your team — start, close or flag them from the field.
        </p>
      </header>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: 'Assigned', value: summary.assigned, accent: 'text-amber-700' },
          { label: 'In progress', value: summary.inProgress, accent: 'text-indigo-700' },
          { label: 'Resolved today', value: summary.resolvedToday, accent: 'text-emerald-700' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs sm:p-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {stat.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${stat.accent}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xs">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              tab === entry.key
                ? 'bg-[#234E35] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {entry.label}
            <span className="ml-1.5 opacity-70">{counts[entry.key]}</span>
          </button>
        ))}
      </div>

      <section className="mt-6">
        <SectionHeading
          title={activeTab.label}
          hint={
            tab === 'done'
              ? 'Tickets your crew closed.'
              : tab === 'collect'
                ? 'Pick these up and take ownership.'
                : 'Work currently in your hands.'
          }
        />
        {queue.length === 0 ? (
          <EmptyState
            title="No tickets here"
            hint={
              tab === 'done'
                ? 'Tickets you close today will be listed here.'
                : 'New assignments land here as dispatch routes them.'
            }
          />
        ) : (
          <div className="space-y-3">
            {queue.map((report) => (
              <TicketCard
                key={report.id}
                report={report}
                pending={!!pending[report.id]}
                error={errors[report.id]}
                note={notes[report.id]}
                onStatus={(target, status) => void changeStatus(target, status)}
                onNeedsInfo={(id) =>
                  setNotes((prev) => ({
                    ...prev,
                    [id]: 'More info requested from the reporter — ticket stays In Progress.',
                  }))
                }
                onDismissNote={(id) =>
                  setNotes((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
