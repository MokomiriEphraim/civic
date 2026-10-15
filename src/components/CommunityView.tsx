import React, { useEffect, useState } from 'react';
import { ActiveView, COMMUNITY_CATEGORIES, CommunityCategory, CommunityEvent, Discussion } from '../types';
import { createCollectionRecord, updateCollectionRecord } from '../api/collections';
import { formatDate } from '../utils/dates';
import { Card, EmptyState, SectionHeading } from './ui';
import {
  ArrowRight, CalendarDays, ChevronDown, ChevronUp, MapPin, MessageSquare,
  RefreshCw, Send, ThumbsUp,
} from 'lucide-react';

interface CommunityViewProps {
  discussions: Discussion[];
  events: CommunityEvent[];
  onRefresh: () => void;
  onNavigate: (view: ActiveView) => void;
}

interface ActionFailure {
  key: string;
  message: string;
  retry?: () => void;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'The request could not be completed.';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#234E35] focus:outline-none';

const smallInputClass =
  'min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#234E35] focus:outline-none';

const chipClass = 'rounded-full bg-[#234E35]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1A4329]';

const metaClass = 'inline-flex items-center gap-1 text-[11px] text-slate-400';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    {children}
  </div>
);

export const CommunityView: React.FC<CommunityViewProps> = ({
  discussions,
  events,
  onRefresh,
  onNavigate,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [voteDeltas, setVoteDeltas] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [form, setForm] = useState({
    title: '',
    body: '',
    category: 'Community' as CommunityCategory,
    author: '',
    area: '',
  });

  useEffect(() => setVoteDeltas({}), [discussions]);

  const updateForm = (patch: Partial<typeof form>) =>
    setForm((previous) => ({ ...previous, ...patch }));

  const renderFailure = (key: string) =>
    failure && failure.key === key ? (
      <p className="mt-2 text-[11px] font-semibold text-red-600">
        {failure.message}
        {failure.retry && (
          <button type="button" onClick={failure.retry} className="ml-2 underline hover:text-red-700">Retry</button>
        )}
      </p>
    ) : null;

  const handleVote = (discussion: Discussion) => {
    const key = `vote-${discussion.id}`;
    const nextVotes = discussion.votes + (voteDeltas[discussion.id] ?? 0) + 1;
    setPendingKey(key);
    setFailure(null);
    setVoteDeltas((previous) => ({ ...previous, [discussion.id]: (previous[discussion.id] ?? 0) + 1 }));
    updateCollectionRecord('discussions', discussion.id, { votes: nextVotes })
      .then(() => onRefresh())
      .catch((error: unknown) => {
        setVoteDeltas((previous) => ({ ...previous, [discussion.id]: 0 }));
        setFailure({ key, message: errorMessage(error), retry: () => handleVote(discussion) });
      })
      .finally(() => setPendingKey(null));
  };

  const handleComment = (discussion: Discussion) => {
    const key = `comment-${discussion.id}`;
    const text = (drafts[discussion.id] ?? '').trim();
    if (!text) {
      setFailure({ key, message: 'Write a comment before posting.' });
      return;
    }
    const comment = {
      id: `C-${discussion.comments.length + 1}`,
      author: form.author.trim() || 'You',
      text,
      at: new Date().toLocaleString(),
    };
    setPendingKey(key);
    setFailure(null);
    updateCollectionRecord('discussions', discussion.id, { comments: [...discussion.comments, comment] })
      .then(() => {
        setDrafts((previous) => ({ ...previous, [discussion.id]: '' }));
        onRefresh();
      })
      .catch((error: unknown) =>
        setFailure({ key, message: errorMessage(error), retry: () => handleComment(discussion) })
      )
      .finally(() => setPendingKey(null));
  };

  const handleCreate = () => {
    const key = 'compose';
    if (!form.title.trim() || !form.body.trim() || !form.author.trim()) {
      setFailure({ key, message: 'Title, body and author are required.' });
      return;
    }
    const record = {
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      author: form.author.trim(),
      area: form.area.trim() || 'Cape Town',
      createdAt: formatDate(new Date()),
      photos: [],
      votes: 0,
      comments: [],
    };
    setPendingKey(key);
    setFailure(null);
    createCollectionRecord('discussions', record)
      .then(() => {
        setForm({ title: '', body: '', category: 'Community', author: '', area: '' });
        onRefresh();
      })
      .catch((error: unknown) => setFailure({ key, message: errorMessage(error), retry: handleCreate }))
      .finally(() => setPendingKey(null));
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#234E35]/70">Neighbourhood</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Community</h1>
          <p className="mt-1 text-sm text-slate-500">Discussions, local events and the neighbours getting things fixed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('discover')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            Projects & polls
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-full bg-[#234E35] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1A3D29]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      <section className="mt-6">
        <SectionHeading title="Upcoming events" hint="Meetings, clean-ups and consultations near you." />
        {events.length === 0 ? (
          <EmptyState title="No events scheduled" hint="Check back after the next ward notice." />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {events.map((event) => (
              <Card key={event.id} className="w-64 shrink-0">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {event.kind}
                </p>
                <p className="mt-1.5 text-sm font-bold text-slate-800">{event.title}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">{event.date} · {event.time}</p>
                <p className={`${metaClass} mt-1`}><MapPin className="h-3 w-3" />{event.location}</p>
                <p className="mt-2 line-clamp-3 text-xs text-slate-500">{event.description}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeading
            title="Discussions"
            hint={`${discussions.length} thread${discussions.length === 1 ? '' : 's'} in the demo.`}
          />
          {discussions.length === 0 ? (
            <EmptyState title="No discussions yet" hint="Start the first one with the composer." />
          ) : (
            <div className="space-y-3">
              {discussions.map((discussion) => {
                const isExpanded = Boolean(expanded[discussion.id]);
                return (
                  <Card key={discussion.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={chipClass}>{discussion.category}</span>
                      <span className="text-xs font-semibold text-slate-700">{discussion.author}</span>
                      <span className={metaClass}><MapPin className="h-3 w-3" />{discussion.area}</span>
                      <span className="text-[11px] text-slate-400">{discussion.createdAt}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-800">{discussion.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{discussion.body}</p>
                    {discussion.photos.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {discussion.photos.map((photo, index) => (
                          <img key={`${discussion.id}-photo-${index}`} src={photo} alt={`Attachment ${index + 1}`}
                            className="h-16 w-16 rounded-lg border border-slate-200/80 object-cover" />
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleVote(discussion)}
                        disabled={pendingKey === `vote-${discussion.id}`}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                          voteDeltas[discussion.id]
                            ? 'border-transparent bg-[#234E35] text-white'
                            : 'border-slate-200 text-slate-600 hover:border-[#234E35]/40 hover:text-[#1A4329]'
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {discussion.votes + (voteDeltas[discussion.id] ?? 0)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpanded((previous) => ({ ...previous, [discussion.id]: !previous[discussion.id] }))}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[#234E35]/40 hover:text-[#1A4329]"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {discussion.comments.length}
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </div>
                    {renderFailure(`vote-${discussion.id}`)}
                    {isExpanded && (
                      <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                        {discussion.comments.length === 0 ? (
                          <p className="text-xs text-slate-400">No comments yet.</p>
                        ) : (
                          discussion.comments.map((comment) => (
                            <div key={comment.id} className="mb-2">
                              <p className="text-[11px]">
                                <span className="font-bold text-slate-700">{comment.author}</span>
                                <span className="ml-1.5 text-slate-400">{comment.at}</span>
                              </p>
                              <p className="text-xs text-slate-600">{comment.text}</p>
                            </div>
                          ))
                        )}
                        <form className="mt-1 flex gap-2" onSubmit={(event) => { event.preventDefault(); handleComment(discussion); }}>
                          <input type="text" value={drafts[discussion.id] ?? ''} placeholder="Add a comment..."
                            onChange={(event) => setDrafts((previous) => ({ ...previous, [discussion.id]: event.target.value }))}
                            className={smallInputClass} />
                          <button type="submit" disabled={pendingKey === `comment-${discussion.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#234E35] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1A3D29] disabled:opacity-60">
                            <Send className="h-3.5 w-3.5" />
                            Post
                          </button>
                        </form>
                        {renderFailure(`comment-${discussion.id}`)}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <SectionHeading title="Start a discussion" hint="Share an issue or question with the area." />
          <Card>
            <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); handleCreate(); }}>
              <Field label="Title">
                <input type="text" value={form.title} placeholder="What is happening?"
                  onChange={(event) => updateForm({ title: event.target.value })} className={`mt-1 ${inputClass}`} />
              </Field>
              <Field label="Body">
                <textarea value={form.body} rows={4} placeholder="Add the details — where, when and who it affects."
                  onChange={(event) => updateForm({ body: event.target.value })} className={`mt-1 resize-none ${inputClass}`} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Category">
                  <select value={form.category} className={`mt-1 ${inputClass}`}
                    onChange={(event) => updateForm({ category: event.target.value as CommunityCategory })}>
                    {COMMUNITY_CATEGORIES.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Area">
                  <input type="text" value={form.area} placeholder="e.g. Gardens"
                    onChange={(event) => updateForm({ area: event.target.value })} className={`mt-1 ${inputClass}`} />
                </Field>
              </div>
              <Field label="Author">
                <input type="text" value={form.author} placeholder="Your name"
                  onChange={(event) => updateForm({ author: event.target.value })} className={`mt-1 ${inputClass}`} />
              </Field>
              <button
                type="submit"
                disabled={pendingKey === 'compose'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#234E35] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1A3D29] disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Post discussion
              </button>
              {renderFailure('compose')}
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
