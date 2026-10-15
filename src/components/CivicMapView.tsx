import React, { useMemo, useState } from 'react';
import type { HazardReport, HazardSeverity, ReportStatus } from '../types';
import { HAZARD_SEVERITIES, REPORT_STATUSES } from '../types';
import { parseCoordinates } from '../utils/proximity';
import { reportPriority } from '../utils/priority';
import { EmptyState, SectionHeading, SeverityBadge, StatusBadge } from './ui';
import { MapCanvas, SEVERITY_FILL } from './MapCanvas';
import { ChevronRight, MapPin, MapPinOff } from 'lucide-react';

interface CivicMapViewProps {
  reports: HazardReport[];
  selectedId: string | null;
  onSelectReport: (id: string) => void;
  onOpenTicket: (id: string) => void;
}

export const CivicMapView: React.FC<CivicMapViewProps> = ({
  reports,
  selectedId,
  onSelectReport,
  onOpenTicket,
}) => {
  const [statusFilter, setStatusFilter] = useState<Set<ReportStatus>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<HazardSeverity | 'All'>('All');

  const toggleStatus = (status: ReportStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const filtered = useMemo(
    () =>
      reports.filter(
        (report) =>
          (statusFilter.size === 0 || statusFilter.has(report.status)) &&
          (severityFilter === 'All' || report.severity === severityFilter)
      ),
    [reports, statusFilter, severityFilter]
  );

  const ranked = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => reportPriority(b).score - reportPriority(a).score
      ),
    [filtered]
  );

  const unmapped = useMemo(
    () => filtered.filter((report) => parseCoordinates(report.location) === null).length,
    [filtered]
  );

  if (reports.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <SectionHeading
          title="Civic map"
          hint="Every reported hazard plotted from its coordinates."
        />
        <EmptyState
          title="No issues reported yet"
          hint="Once residents file hazard reports, they appear here on the map."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <SectionHeading
        title="Civic map"
        hint="Every reported hazard plotted from its coordinates."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter(new Set())}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              statusFilter.size === 0
                ? 'bg-[#234E35] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {REPORT_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                statusFilter.has(status)
                  ? 'bg-[#234E35] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-500">
          Severity
          <select
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(event.target.value as HazardSeverity | 'All')
            }
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#234E35]"
          >
            <option value="All">All</option>
            {HAZARD_SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </label>

        <div className="flex w-full flex-wrap items-center gap-3 border-t border-slate-100 pt-2 sm:w-auto sm:border-t-0 sm:pt-0">
          {HAZARD_SEVERITIES.map((severity) => (
            <span key={severity} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: SEVERITY_FILL[severity] }}
              />
              {severity}
            </span>
          ))}
        </div>
      </div>

      {unmapped > 0 && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
          <MapPinOff className="w-3.5 h-3.5" />
          {unmapped} issue{unmapped === 1 ? '' : 's'} without coordinates
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No issues match these filters"
          hint="Try clearing the status chips or severity filter."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <MapCanvas
            reports={filtered}
            selectedId={selectedId}
            onSelectReport={onSelectReport}
            className="aspect-[4/3] min-h-[420px] rounded-2xl border border-slate-200/80 shadow-xs"
          />

          <div className="lg:col-span-2">
            <SectionHeading
              title={`Issues (${ranked.length})`}
              hint="Click a row to highlight it on the map."
            />
            <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
              {ranked.map((report) => {
                const selected = report.id === selectedId;
                return (
                  <div
                    key={report.id}
                    onClick={() => onSelectReport(report.id)}
                    className={`cursor-pointer rounded-xl border p-3 transition ${
                      selected
                        ? 'border-[#234E35]/50 bg-[#234E35]/5'
                        : 'border-slate-200/80 bg-white hover:border-[#234E35]/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            {report.id}
                          </span>
                          <StatusBadge status={report.status} />
                          <SeverityBadge severity={report.severity} />
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                          {report.subType}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                          <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                          {report.location}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenTicket(report.id);
                        }}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#234E35] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#1A3D29]"
                      >
                        Open ticket
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
