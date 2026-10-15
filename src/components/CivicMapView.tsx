import React, { useMemo, useState } from 'react';
import type { HazardReport, HazardSeverity, ReportStatus } from '../types';
import { HAZARD_SEVERITIES, REPORT_STATUSES } from '../types';
import { parseCoordinates } from '../utils/proximity';
import { reportPriority } from '../utils/priority';
import { EmptyState, SectionHeading, SeverityBadge, StatusBadge } from './ui';
import { ChevronRight, MapPin, MapPinOff } from 'lucide-react';

interface CivicMapViewProps {
  reports: HazardReport[];
  selectedId: string | null;
  onSelectReport: (id: string) => void;
  onOpenTicket: (id: string) => void;
}

const MAP_W = 800;
const MAP_H = 600;

const SEVERITY_FILL: Record<HazardSeverity, string> = {
  Low: '#64748b',
  Medium: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444',
};

const SEVERITY_RADIUS: Record<HazardSeverity, number> = {
  Low: 5,
  Medium: 6,
  High: 7,
  Critical: 8,
};

interface MapPoint {
  report: HazardReport;
  x: number;
  y: number;
}

function projectReports(reports: HazardReport[]): { points: MapPoint[]; unmapped: number } {
  const included: { report: HazardReport; lat: number; lon: number }[] = [];
  for (const report of reports) {
    const coords = parseCoordinates(report.location);
    if (coords) included.push({ report, lat: coords.lat, lon: coords.lon });
  }
  const unmapped = reports.length - included.length;
  if (included.length === 0) return { points: [], unmapped };

  let minLat = Math.min(...included.map((p) => p.lat));
  let maxLat = Math.max(...included.map((p) => p.lat));
  let minLon = Math.min(...included.map((p) => p.lon));
  let maxLon = Math.max(...included.map((p) => p.lon));

  if (maxLat - minLat < 0.0001) {
    minLat -= 0.01;
    maxLat += 0.01;
  }
  if (maxLon - minLon < 0.0001) {
    minLon -= 0.01;
    maxLon += 0.01;
  }

  const padLat = (maxLat - minLat) * 0.08;
  const padLon = (maxLon - minLon) * 0.08;
  minLat -= padLat;
  maxLat += padLat;
  minLon -= padLon;
  maxLon += padLon;

  const points = included.map(({ report, lat, lon }) => ({
    report,
    x: ((lon - minLon) / (maxLon - minLon)) * MAP_W,
    y: (1 - (lat - minLat) / (maxLat - minLat)) * MAP_H,
  }));
  return { points, unmapped };
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

  const { points, unmapped } = useMemo(() => projectReports(filtered), [filtered]);

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
          <div className="relative aspect-[4/3] min-h-[420px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs lg:col-span-3">
            <svg
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              className="absolute inset-0 h-full w-full"
              role="img"
              aria-label="Map of reported hazards"
            >
              <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#EEF5EE" />
              <rect x="60" y="50" width="220" height="150" rx="14" fill="#E1EBE2" />
              <rect x="480" y="90" width="240" height="180" rx="14" fill="#E1EBE2" />
              <rect x="90" y="330" width="200" height="170" rx="14" fill="#E4EEE6" />
              <rect x="520" y="380" width="210" height="150" rx="14" fill="#E1EBE2" />
              <path
                d="M0 430 C 140 390, 260 500, 420 460 S 680 520, 800 470"
                stroke="#BFDBFE"
                strokeWidth="22"
                fill="none"
                strokeLinecap="round"
                opacity="0.8"
              />
              <path
                d="M0 240 H800"
                stroke="#CBD5E1"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M300 0 V600"
                stroke="#CBD5E1"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M0 90 C 200 130, 420 40, 800 120"
                stroke="#D6DEE8"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M120 600 C 180 420, 520 360, 640 0"
                stroke="#D6DEE8"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />

              {points.map((point) => {
                const selected = point.report.id === selectedId;
                return (
                  <g key={point.report.id}>
                    {selected && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={SEVERITY_RADIUS[point.report.severity] + 5}
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="2"
                        opacity="0.65"
                      >
                        <animate
                          attributeName="r"
                          values={`${SEVERITY_RADIUS[point.report.severity] + 5};${SEVERITY_RADIUS[point.report.severity] + 13};${SEVERITY_RADIUS[point.report.severity] + 5}`}
                          dur="1.8s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.65;0;0.65"
                          dur="1.8s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                    {selected && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={SEVERITY_RADIUS[point.report.severity] + 3}
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />
                    )}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={SEVERITY_RADIUS[point.report.severity]}
                      fill={SEVERITY_FILL[point.report.severity]}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="cursor-pointer"
                      onClick={() => onSelectReport(point.report.id)}
                    >
                      <title>
                        {`${point.report.id} · ${point.report.subType} · ${point.report.location}`}
                      </title>
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>

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
