import React, { useState } from 'react';
import { AlertLevel, Announcement, CivicAlert } from '../types';
import { updateCollectionRecord } from '../api/collections';
import { Card, EmptyState, SectionHeading } from './ui';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Clock,
  Info,
  MapPin,
  Megaphone,
  RefreshCw,
  Search,
  Siren,
} from 'lucide-react';

interface BulletinsViewProps {
  alerts: CivicAlert[];
  announcements: Announcement[];
  onRefresh: () => void;
}

type LevelFilter = 'all' | AlertLevel;

interface ActionFailure {
  key: string;
  message: string;
  retry?: () => void;
}

const LEVELS: { value: LevelFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'important', label: 'Important' },
  { value: 'info', label: 'Info' },
];

const ALERT_TONES: Record<
  AlertLevel,
  { card: string; chip: string; icon: React.ComponentType<{ className?: string }> }
> = {
  emergency: {
    card: 'border-rose-200 bg-rose-50/70',
    chip: 'bg-rose-100 text-rose-700',
    icon: Siren,
  },
  important: {
    card: 'border-amber-200 bg-amber-50/70',
    chip: 'bg-amber-100 text-amber-700',
    icon: AlertTriangle,
  },
  info: {
    card: 'border-sky-200 bg-sky-50/70',
    chip: 'bg-sky-100 text-sky-700',
    icon: Info,
  },
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'The request could not be completed.';

export const BulletinsView: React.FC<BulletinsViewProps> = ({ alerts, announcements, onRefresh }) => {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [failure, setFailure] = useState<ActionFailure | null>(null);

  const term = query.trim().toLowerCase();
  const matches = (value: string) => value.toLowerCase().includes(term);

  const filteredAlerts = alerts.filter(
    (alert) =>
      (level === 'all' || alert.level === level) &&
      (!term || matches(alert.title) || matches(alert.body) || matches(alert.area))
  );
  const filteredAnnouncements = announcements
    .filter(
      (announcement) =>
        (!verifiedOnly || announcement.verified) &&
        (!term || matches(announcement.title) || matches(announcement.body))
    )
    .sort((a, b) => Number(b.verified) - Number(a.verified));

  const nothingMatches = filteredAlerts.length === 0 && filteredAnnouncements.length === 0;

  const renderFailure = (key: string) =>
    failure && failure.key === key ? (
      <p className="mt-2 text-[11px] font-semibold text-red-600">
        {failure.message}
        {failure.retry && (
          <button
            type="button"
            onClick={failure.retry}
            className="ml-2 underline hover:text-red-700"
          >
            Retry
          </button>
        )}
      </p>
    ) : null;

  const handleAcknowledge = (alert: CivicAlert) => {
    const key = `ack-${alert.id}`;
    setPendingId(key);
    setFailure(null);
    updateCollectionRecord('alerts', alert.id, { active: false })
      .then(() => onRefresh())
      .catch((error: unknown) =>
        setFailure({ key, message: errorMessage(error), retry: () => handleAcknowledge(alert) })
      )
      .finally(() => setPendingId(null));
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#234E35]/70">
            City notices
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Bulletins</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live alerts and official announcements for your area.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-full bg-[#234E35] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1A3D29]"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </header>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, body or area..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#234E35] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {LEVELS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setLevel(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                level === option.value
                  ? 'bg-[#234E35] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setVerifiedOnly((previous) => !previous)}
            aria-pressed={verifiedOnly}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              verifiedOnly
                ? 'bg-[#234E35] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <BadgeCheck className="w-3.5 h-3.5" />
            Verified only
          </button>
        </div>
      </div>

      <section className="mt-6">
        <SectionHeading
          title="Alerts"
          hint={`${filteredAlerts.length} of ${alerts.length} shown.`}
        />
        {filteredAlerts.length === 0 ? (
          <EmptyState title="No alerts match" hint="Try another level or clear the search." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredAlerts.map((alert) => {
              const tone = ALERT_TONES[alert.level];
              const LevelIcon = tone.icon;
              const isPending = pendingId === `ack-${alert.id}`;
              return (
                <Card key={alert.id} className={tone.card}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.chip}`}>
                        {alert.level}
                      </span>
                      <LevelIcon className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${alert.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      />
                      {alert.active ? 'Active' : 'Retired'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-800">{alert.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{alert.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-[#234E35]" />
                      {alert.area}
                    </span>
                    <span className="rounded bg-white/70 px-1.5 py-0.5 font-semibold text-slate-600">
                      {alert.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock className="h-3 w-3" />
                      {alert.createdAt}
                    </span>
                  </div>
                  {alert.active && (
                    <button
                      type="button"
                      onClick={() => handleAcknowledge(alert)}
                      disabled={isPending}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#234E35]/50 hover:text-[#1A4329] disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Acknowledge
                    </button>
                  )}
                  {renderFailure(`ack-${alert.id}`)}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6">
        <SectionHeading
          title="Announcements"
          hint="Verified notices from the municipality first."
          action={
            <span className="text-xs font-semibold text-slate-400">
              {filteredAnnouncements.length} of {announcements.length}
            </span>
          }
        />
        {filteredAnnouncements.length === 0 ? (
          <EmptyState title="No announcements match" hint="Turn off the verified filter to see all." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#234E35]/80">
                    <Megaphone className="h-3.5 w-3.5" />
                    {announcement.municipality}
                  </span>
                  {announcement.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <BadgeCheck className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-bold text-slate-800">{announcement.title}</p>
                <p className="mt-1 line-clamp-3 text-xs text-slate-600">{announcement.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                  <span>{announcement.date}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">
                    {announcement.category}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {nothingMatches && (
        <div className="mt-6">
          <EmptyState
            title="Nothing matches your filters"
            hint="Clear the search or switch the level filter back to All."
          />
        </div>
      )}
    </div>
  );
};
