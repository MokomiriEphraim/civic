import React from 'react';
import type { HazardSeverity, PriorityBand, ReportStatus } from '../types';

const STATUS_TONES: Record<ReportStatus, string> = {
  Received: 'bg-slate-100 text-slate-600 ring-slate-200',
  Verified: 'bg-sky-50 text-sky-700 ring-sky-200',
  Assigned: 'bg-amber-50 text-amber-700 ring-amber-200',
  'In Progress': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const SEVERITY_TONES: Record<HazardSeverity, string> = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-amber-100 text-amber-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-rose-100 text-rose-800',
};

const BAND_TONES: Record<PriorityBand, string> = {
  Critical: 'bg-rose-600 text-white',
  High: 'bg-orange-500 text-white',
  Moderate: 'bg-amber-400 text-slate-900',
  Low: 'bg-emerald-500 text-white',
};

export const StatusBadge: React.FC<{ status: ReportStatus; className?: string }> = ({
  status,
  className = '',
}) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_TONES[status]} ${className}`}
  >
    {status}
  </span>
);

export const SeverityBadge: React.FC<{ severity: HazardSeverity }> = ({ severity }) => (
  <span
    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${SEVERITY_TONES[severity]}`}
  >
    {severity}
  </span>
);

export const BandBadge: React.FC<{ band: PriorityBand; score?: number }> = ({ band, score }) => (
  <span
    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${BAND_TONES[band]}`}
    title={score !== undefined ? `Priority score ${score}` : undefined}
  >
    {score !== undefined ? `${band} · ${score}` : band}
  </span>
);

export const SectionHeading: React.FC<{
  title: string;
  hint?: string;
  action?: React.ReactNode;
}> = ({ title, hint, action }) => (
  <div className="mb-3 flex items-end justify-between gap-4">
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
    {action}
  </div>
);

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs ${className}`}>
    {children}
  </div>
);

export const EmptyState: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
    <p className="text-sm font-semibold text-slate-600">{title}</p>
    {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
  </div>
);
