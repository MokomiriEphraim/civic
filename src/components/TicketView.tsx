import React, { useEffect, useMemo, useState } from 'react';
import type {
  HazardReport,
  ReportEngagement,
  ReportStatus,
  ResidentRating,
  ResolutionProof,
  TicketMessage,
  UserRole,
} from '../types';
import { REPORT_STATUSES } from '../types';
import {
  confirmIssue,
  getEngagement,
  getMessages,
  getRating,
  getResolution,
  sendMessage,
  setResolutionConfirmed,
  submitRating,
  uploadResolution,
} from '../api/reports';
import { parseLooseDate } from '../utils/dates';
import { reportPriority } from '../utils/priority';
import { BandBadge, Card, EmptyState, SectionHeading, SeverityBadge, StatusBadge } from './ui';
import {
  Building2,
  Check,
  ImageOff,
  ListFilter,
  Loader2,
  MapPin,
  PhoneOff,
  Search,
  Send,
  Star,
  TriangleAlert,
  Upload,
  Users,
} from 'lucide-react';

interface TicketViewProps {
  reports: HazardReport[];
  selectedId: string | null;
  onSelectTicket: (id: string) => void;
  onUpdateReportStatus: (id: string, status: ReportStatus) => Promise<HazardReport>;
  onRefreshReports: () => void;
  role: UserRole;
  currentUser: { name: string; email: string };
}

type SortMode = 'newest' | 'priority';

const ProofImage: React.FC<{ src: string; label: string }> = ({ src, label }) => {
  const [broken, setBroken] = useState(false);
  if (broken || !src) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[11px] font-semibold text-slate-400">
        <ImageOff className="mr-1.5 w-3.5 h-3.5" />
        {label} unavailable
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={label}
      onError={() => setBroken(true)}
      className="h-32 w-full rounded-xl border border-slate-200 object-cover"
    />
  );
};

const StarRow: React.FC<{ stars: number; size?: string }> = ({ stars, size = 'w-4 h-4' }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${stars} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((value) => (
      <Star
        key={value}
        className={`${size} ${value <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
      />
    ))}
  </span>
);

export const TicketView: React.FC<TicketViewProps> = ({
  reports,
  selectedId,
  onSelectTicket,
  onUpdateReportStatus,
  onRefreshReports,
  role,
  currentUser,
}) => {
  const [search, setSearch] = useState('');
  const [statusChip, setStatusChip] = useState<ReportStatus | 'All'>('All');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const [localReport, setLocalReport] = useState<HazardReport | null>(null);

  const [engagement, setEngagement] = useState<ReportEngagement | null>(null);
  const [engagementError, setEngagementError] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState(currentUser.name);
  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sendPending, setSendPending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [resolution, setResolution] = useState<ResolutionProof | null>(null);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [uploadBefore, setUploadBefore] = useState('/api/assets/before-example.jpg');
  const [uploadAfter, setUploadAfter] = useState('/api/assets/after-example.jpg');
  const [uploadNote, setUploadNote] = useState('');
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [rating, setRating] = useState<ResidentRating | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingPending, setRatingPending] = useState(false);
  const [submitRatingError, setSubmitRatingError] = useState<string | null>(null);

  const [statusPending, setStatusPending] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    if (localReport && localReport.id === selectedId) return localReport;
    return reports.find((report) => report.id === selectedId) ?? null;
  }, [reports, selectedId, localReport]);

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    const filtered = reports.filter((report) => {
      const matchesSearch =
        needle.length === 0 ||
        [report.id, report.subType, report.location].some((field) =>
          field.toLocaleLowerCase().includes(needle)
        );
      const matchesStatus = statusChip === 'All' || report.status === statusChip;
      return matchesSearch && matchesStatus;
    });
    return [...filtered].sort((a, b) => {
      if (sortMode === 'priority') return reportPriority(b).score - reportPriority(a).score;
      return (parseLooseDate(b.date) ?? 0) - (parseLooseDate(a.date) ?? 0);
    });
  }, [reports, search, statusChip, sortMode]);

  useEffect(() => {
    setLocalReport(null);
    setEngagement(null);
    setEngagementError(null);
    setConfirmName(currentUser.name);
    setConfirmPending(false);
    setConfirmError(null);
    setMessages([]);
    setMessagesError(null);
    setDraft('');
    setSendPending(false);
    setSendError(null);
    setResolution(null);
    setResolutionError(null);
    setUploadNote('');
    setUploadPending(false);
    setUploadError(null);
    setRating(null);
    setRatingError(null);
    setRatingStars(0);
    setRatingComment('');
    setRatingPending(false);
    setSubmitRatingError(null);
    setStatusPending(false);
    setStatusError(null);
  }, [selectedId, currentUser.name]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    getEngagement(selectedId)
      .then((data) => {
        if (!cancelled) setEngagement(data);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setEngagementError(error instanceof Error ? error.message : 'Could not load engagement.');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    getMessages(selectedId)
      .then((data) => {
        if (!cancelled) setMessages(data);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setMessagesError(error instanceof Error ? error.message : 'Could not load messages.');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    getResolution(selectedId)
      .then((data) => {
        if (!cancelled) setResolution(data);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setResolutionError(error instanceof Error ? error.message : 'Could not load proof.');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    getRating(selectedId)
      .then((data) => {
        if (!cancelled) setRating(data);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setRatingError(error instanceof Error ? error.message : 'Could not load rating.');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (!selectedId) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <SectionHeading
          title="Track tickets"
          hint="Search a ticket, follow its timeline, confirmations and proof of resolution."
        />
        <EmptyState
          title="No ticket selected"
          hint="Pick a ticket from the list to see its full detail."
        />
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <SectionHeading
          title="Track tickets"
          hint="Search a ticket, follow its timeline, confirmations and proof of resolution."
        />
        <EmptyState
          title="Ticket not found"
          hint={`Ticket ${selectedId} is not in the current report feed.`}
        />
      </div>
    );
  }

  const priority = reportPriority(selected, engagement?.affected ?? 0);
  const timeline = selected.timeline ?? [];
  const hasConfirmed = engagement
    ? engagement.confirmations.some(
        (name) => name.toLocaleLowerCase() === currentUser.name.toLocaleLowerCase()
      )
    : false;

  const handleConfirm = async () => {
    if (!selectedId || confirmPending) return;
    setConfirmPending(true);
    setConfirmError(null);
    try {
      const updated = await confirmIssue(selectedId, confirmName.trim() || currentUser.name);
      setEngagement(updated);
    } catch (error: unknown) {
      setConfirmError(error instanceof Error ? error.message : 'Could not confirm the issue.');
    } finally {
      setConfirmPending(false);
    }
  };

  const handleSend = async () => {
    if (!selectedId || sendPending) return;
    const text = draft.trim();
    if (!text) return;
    setSendPending(true);
    setSendError(null);
    try {
      const message = await sendMessage(selectedId, {
        from: role === 'staff' ? 'municipality' : 'resident',
        author: role === 'staff' ? 'Municipality' : currentUser.name,
        text,
      });
      setMessages((prev) => [...prev, message]);
      setDraft('');
    } catch (error: unknown) {
      setSendError(error instanceof Error ? error.message : 'Could not send the message.');
    } finally {
      setSendPending(false);
    }
  };

  const handleResolutionConfirm = async (confirmed: boolean) => {
    if (!selectedId) return;
    setConfirmError(null);
    try {
      const result = await setResolutionConfirmed(selectedId, confirmed);
      setResolution(result.resolution);
      setLocalReport(result.report);
      onRefreshReports();
    } catch (error: unknown) {
      setConfirmError(error instanceof Error ? error.message : 'Could not save your verdict.');
    }
  };

  const handleUpload = async () => {
    if (!selectedId || uploadPending) return;
    setUploadPending(true);
    setUploadError(null);
    try {
      const proof = await uploadResolution(selectedId, {
        before: uploadBefore.trim(),
        after: uploadAfter.trim(),
        note: uploadNote.trim() || undefined,
      });
      setResolution(proof);
      setUploadNote('');
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : 'Could not upload the proof.');
    } finally {
      setUploadPending(false);
    }
  };

  const handleRating = async () => {
    if (!selectedId || ratingPending || ratingStars < 1) return;
    setRatingPending(true);
    setSubmitRatingError(null);
    try {
      const saved = await submitRating(selectedId, ratingStars, ratingComment.trim() || undefined);
      setRating(saved);
      setRatingComment('');
    } catch (error: unknown) {
      setSubmitRatingError(error instanceof Error ? error.message : 'Could not save the rating.');
    } finally {
      setRatingPending(false);
    }
  };

  const handleStatus = async (status: ReportStatus) => {
    if (!selectedId || statusPending) return;
    setStatusPending(true);
    setStatusError(null);
    try {
      const updated = await onUpdateReportStatus(selectedId, status);
      setLocalReport(updated);
      onRefreshReports();
    } catch (error: unknown) {
      setStatusError(error instanceof Error ? error.message : 'Could not update the status.');
    } finally {
      setStatusPending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <SectionHeading
        title="Track tickets"
        hint="Search a ticket, follow its timeline, confirmations and proof of resolution."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card className="p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ticket, issue or location"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#234E35] focus:bg-white"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {(['All', ...REPORT_STATUSES] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusChip(status)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    statusChip === status
                      ? 'bg-[#234E35] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
              <ListFilter className="w-3.5 h-3.5" />
              <label className="flex items-center gap-1.5">
                Sort
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-[#234E35]"
                >
                  <option value="newest">Newest</option>
                  <option value="priority">Priority</option>
                </select>
              </label>
              <span className="ml-auto text-[11px] font-normal text-slate-400">
                {visible.length} ticket{visible.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="mt-3 max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
              {visible.length === 0 ? (
                <EmptyState title="No tickets match" hint="Adjust the search or status filter." />
              ) : (
                visible.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => onSelectTicket(report.id)}
                    className={`block w-full rounded-xl border p-3 text-left transition ${
                      report.id === selectedId
                        ? 'border-[#234E35]/50 bg-[#234E35]/5'
                        : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-400">{report.id}</span>
                      <StatusBadge status={report.status} />
                      <SeverityBadge severity={report.severity} />
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                      {report.subType}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {report.address ?? report.location} · {report.date}
                    </p>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-3">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-700">{selected.id}</span>
              <StatusBadge status={selected.status} />
              <SeverityBadge severity={selected.severity} />
              <BandBadge band={priority.band} score={priority.score} />
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-900">{selected.subType}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{selected.hazardType}</p>

            <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {selected.address ?? selected.location}
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {selected.department}
                {selected.departmentUnit ? ` ${selected.departmentUnit}` : ''}
              </div>
              <div className="flex items-center gap-1.5">
                <PhoneOff className="w-3.5 h-3.5 text-slate-400" />
                Contact hidden for privacy
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {selected.date}
              </div>
            </dl>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">{selected.description}</p>

            <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Civic priority score
                </p>
                <span className="text-2xl font-bold text-slate-800">{priority.score}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <BandBadge band={priority.band} score={priority.score} />
                {priority.factors.map((factor) => (
                  <span
                    key={factor.label}
                    className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200"
                  >
                    {factor.label} +{factor.points}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Status
              </span>
              {role === 'staff' ? (
                <>
                  <select
                    value={selected.status}
                    disabled={statusPending}
                    onChange={(event) => handleStatus(event.target.value as ReportStatus)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#234E35] disabled:opacity-60"
                  >
                    {REPORT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  {statusPending && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving…
                    </span>
                  )}
                </>
              ) : (
                <StatusBadge status={selected.status} />
              )}
            </div>
            {statusError && (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                {statusError}
              </p>
            )}
          </Card>

          <Card>
            <SectionHeading title="Timeline" hint="Every workflow step, newest at the bottom." />
            {timeline.length === 0 ? (
              <EmptyState title="No timeline yet" hint="Steps appear as the municipality works the ticket." />
            ) : (
              <ol className="relative ml-2 space-y-4 border-l-2 border-slate-200 pl-5">
                {timeline.map((entry) => (
                  <li key={`${entry.stage}-${entry.timestamp}`} className="relative">
                    <span
                      className={`absolute -left-[27px] top-0 flex h-4 w-4 items-center justify-center rounded-full ${
                        entry.done
                          ? 'bg-emerald-500 text-white'
                          : 'border-2 border-slate-300 bg-white'
                      }`}
                    >
                      {entry.done && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                    </span>
                    <p className={`text-sm font-semibold ${entry.done ? 'text-slate-800' : 'text-slate-400'}`}>
                      {entry.stage}
                    </p>
                    <p className="text-[11px] text-slate-400">{entry.timestamp}</p>
                    {entry.note && <p className="mt-0.5 text-xs text-slate-500">{entry.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card>
            <SectionHeading
              title="Community impact"
              hint="Residents can confirm an issue is still affecting them."
            />
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Users className="w-4 h-4 text-[#234E35]" />
                {engagement ? engagement.affected : '—'} residents affected
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Check className="w-4 h-4 text-emerald-600" />
                {engagement ? engagement.confirmations.length : '—'} confirmations
              </span>
            </div>
            {engagementError && (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                {engagementError}
              </p>
            )}
            {hasConfirmed ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <Check className="w-3.5 h-3.5" />
                You confirmed this
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={confirmName}
                  onChange={(event) => setConfirmName(event.target.value)}
                  placeholder="Your name"
                  className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#234E35]"
                />
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirmPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#234E35] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1A3D29] disabled:opacity-60"
                >
                  {confirmPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Confirm this is still a problem
                </button>
              </div>
            )}
            {confirmError && (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                {confirmError}
              </p>
            )}
          </Card>

          <Card>
            <SectionHeading
              title="Messages"
              hint="Direct thread between residents and the municipality."
            />
            {messagesError && (
              <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                {messagesError}
              </p>
            )}
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              {messages.length === 0 && !messagesError ? (
                <p className="text-center text-xs text-slate-400">
                  No messages yet — start the conversation below.
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.from === 'municipality' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-xs ${
                        message.from === 'municipality'
                          ? 'rounded-br-sm bg-[#234E35] text-white'
                          : 'rounded-bl-sm bg-white text-slate-700 ring-1 ring-inset ring-slate-200'
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                        {message.author}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap">{message.text}</p>
                      <p className="mt-1 text-[10px] opacity-60">{message.at}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={2}
                placeholder={
                  role === 'staff' ? 'Reply as the municipality…' : 'Message the municipality…'
                }
                className="min-h-[52px] flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#234E35]"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sendPending || draft.trim().length === 0}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#234E35] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#1A3D29] disabled:opacity-60"
              >
                {sendPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send
              </button>
            </div>
            {sendError && (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                {sendError}
              </p>
            )}
          </Card>

          <Card>
            <SectionHeading
              title="Proof of resolution"
              hint="Before/after evidence filed by the crew."
            />
            {resolutionError && (
              <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                {resolutionError}
              </p>
            )}
            {resolution ? (
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Before
                    </p>
                    <ProofImage src={resolution.before} label="Before photo" />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      After
                    </p>
                    <ProofImage src={resolution.after} label="After photo" />
                  </div>
                </div>
                {resolution.note && (
                  <p className="mt-2 text-xs text-slate-600">{resolution.note}</p>
                )}
                <p className="mt-1 text-[11px] text-slate-400">Filed {resolution.at}</p>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  {resolution.residentConfirmed === null ? (
                    role === 'resident' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-slate-600">
                          Was the issue actually fixed?
                        </p>
                        <button
                          type="button"
                          onClick={() => handleResolutionConfirm(true)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Confirm fix
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolutionConfirm(false)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          <TriangleAlert className="w-3.5 h-3.5" />
                          Still broken
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Awaiting the resident's verdict on this fix.
                      </p>
                    )
                  ) : (
                    <p
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                        resolution.residentConfirmed
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-rose-50 text-rose-700 ring-rose-200'
                      }`}
                    >
                      {resolution.residentConfirmed ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Resident confirmed the fix
                        </>
                      ) : (
                        <>
                          <TriangleAlert className="w-3.5 h-3.5" />
                          Resident says it is still broken
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ) : selected.status === 'Resolved' && role === 'staff' ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">
                  No proof filed yet — attach before/after evidence.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold text-slate-500">
                    Before path
                    <input
                      type="text"
                      value={uploadBefore}
                      onChange={(event) => setUploadBefore(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-normal text-slate-700 outline-none focus:border-[#234E35]"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-500">
                    After path
                    <input
                      type="text"
                      value={uploadAfter}
                      onChange={(event) => setUploadAfter(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-normal text-slate-700 outline-none focus:border-[#234E35]"
                    />
                  </label>
                </div>
                <label className="block text-[11px] font-semibold text-slate-500">
                  Note (optional)
                  <input
                    type="text"
                    value={uploadNote}
                    onChange={(event) => setUploadNote(event.target.value)}
                    placeholder="e.g. Pothole patched and rolled."
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-normal text-slate-700 outline-none focus:border-[#234E35]"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploadPending || !uploadBefore.trim() || !uploadAfter.trim()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#234E35] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1A3D29] disabled:opacity-60"
                >
                  {uploadPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Upload proof
                </button>
                {uploadError && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                    {uploadError}
                  </p>
                )}
              </div>
            ) : (
              <EmptyState
                title="No proof filed"
                hint={
                  selected.status === 'Resolved'
                    ? 'The fix is marked complete but no evidence has been uploaded yet.'
                    : 'Proof appears here once the ticket is resolved.'
                }
              />
            )}
          </Card>

          <Card>
            <SectionHeading title="Resident rating" hint="How well did the municipality do?" />
            {ratingError && (
              <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                {ratingError}
              </p>
            )}
            {rating ? (
              <div>
                <StarRow stars={rating.stars} />
                <p className="mt-1 text-xs text-slate-500">
                  {rating.comment ? rating.comment : 'No comment left.'}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">Rated {rating.at}</p>
              </div>
            ) : selected.status === 'Resolved' && role === 'resident' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`Rate ${value} star${value === 1 ? '' : 's'}`}
                      onClick={() => setRatingStars(value)}
                      className="rounded p-0.5 transition hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          value <= ratingStars
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={ratingComment}
                  onChange={(event) => setRatingComment(event.target.value)}
                  placeholder="Optional comment"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#234E35]"
                />
                <button
                  type="button"
                  onClick={handleRating}
                  disabled={ratingPending || ratingStars < 1}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#234E35] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1A3D29] disabled:opacity-60"
                >
                  {ratingPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Star className="w-3.5 h-3.5" />
                  )}
                  Submit rating
                </button>
                {submitRatingError && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                    {submitRatingError}
                  </p>
                )}
              </div>
            ) : (
              <EmptyState
                title="No rating yet"
                hint={
                  selected.status === 'Resolved'
                    ? 'Only residents can rate a resolved ticket.'
                    : 'Residents can rate the fix once the ticket is resolved.'
                }
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
