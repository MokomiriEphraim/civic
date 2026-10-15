import React, { useEffect, useState } from 'react';
import { CivicDocument, InfrastructureProject, Poll, PollOption } from '../types';
import { updateCollectionRecord } from '../api/collections';
import { Card, EmptyState, SectionHeading } from './ui';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  MapPin,
  RefreshCw,
  Vote,
  Wallet,
} from 'lucide-react';

interface DiscoverViewProps {
  projects: InfrastructureProject[];
  polls: Poll[];
  documents: CivicDocument[];
  onRefresh: () => void;
}

interface ActionFailure {
  key: string;
  message: string;
  retry?: () => void;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'The request could not be completed.';

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  projects,
  polls,
  documents,
  onRefresh,
}) => {
  const [openUpdates, setOpenUpdates] = useState<Record<string, boolean>>({});
  const [localOptions, setLocalOptions] = useState<Record<string, PollOption[]>>({});
  const [votedPollIds, setVotedPollIds] = useState<Record<string, boolean>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [failure, setFailure] = useState<ActionFailure | null>(null);

  useEffect(() => setLocalOptions({}), [polls]);

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

  const handleVote = (poll: Poll, optionId: string) => {
    if (!poll.active || votedPollIds[poll.id]) return;
    const key = `poll-${poll.id}`;
    const base = localOptions[poll.id] ?? poll.options;
    const nextOptions = base.map((option) =>
      option.id === optionId ? { ...option, votes: option.votes + 1 } : option
    );
    setPendingKey(key);
    setFailure(null);
    setLocalOptions((previous) => ({ ...previous, [poll.id]: nextOptions }));
    setVotedPollIds((previous) => ({ ...previous, [poll.id]: true }));
    updateCollectionRecord('polls', poll.id, { options: nextOptions })
      .then(() => onRefresh())
      .catch((error: unknown) => {
        setLocalOptions((previous) => {
          const copy = { ...previous };
          delete copy[poll.id];
          return copy;
        });
        setVotedPollIds((previous) => {
          const copy = { ...previous };
          delete copy[poll.id];
          return copy;
        });
        setFailure({ key, message: errorMessage(error), retry: () => handleVote(poll, optionId) });
      })
      .finally(() => setPendingKey(null));
  };

  const renderProject = (project: InfrastructureProject) => {
    const isOpen = Boolean(openUpdates[project.id]);
    const percent = Math.max(0, Math.min(100, project.percent));
    return (
      <Card key={project.id}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#234E35]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1A4329]">
            {project.category}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <MapPin className="h-3 w-3" />
            {project.location}
          </span>
        </div>
        <p className="mt-2 text-sm font-bold text-slate-800">{project.name}</p>
        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-[#234E35]" />
            {project.budget}
          </span>
          <span>
            {project.start} → {project.expectedEnd}
          </span>
        </div>
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-[#234E35] transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-600">{percent}% complete</span>
            <span>Expected {project.expectedEnd}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            setOpenUpdates((previous) => ({ ...previous, [project.id]: !previous[project.id] }))
          }
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#234E35] hover:underline"
        >
          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {project.updates.length} update{project.updates.length === 1 ? '' : 's'}
        </button>
        {isOpen && (
          <div className="mt-2 space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            {project.updates.length === 0 ? (
              <p className="text-xs text-slate-400">No updates published yet.</p>
            ) : (
              project.updates.map((update, index) => (
                <div key={`${project.id}-update-${index}`} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200">
                    {update.date}
                  </span>
                  <p className="text-xs text-slate-600">{update.text}</p>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    );
  };

  const renderPoll = (poll: Poll) => {
    const options = localOptions[poll.id] ?? poll.options;
    const total = options.reduce((sum, option) => sum + option.votes, 0);
    const hasVoted = Boolean(votedPollIds[poll.id]);
    const isPending = pendingKey === `poll-${poll.id}`;
    return (
      <Card key={poll.id}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-slate-800">{poll.question}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
              poll.active
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-slate-100 text-slate-500 ring-slate-200'
            }`}
          >
            {poll.active ? 'Active' : 'Closed'}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {options.map((option) => {
            const share = total === 0 ? 0 : Math.round((option.votes / total) * 100);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleVote(poll, option.id)}
                disabled={!poll.active || hasVoted || isPending}
                className="relative block w-full overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-left transition hover:border-[#234E35]/40 disabled:cursor-not-allowed disabled:hover:border-slate-200/80"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-[#234E35]/10"
                  style={{ width: `${share}%` }}
                />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-700">{option.label}</span>
                  <span className="text-[11px] text-slate-500">
                    {option.votes} votes · {share}%
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {hasVoted
            ? 'Thanks — your vote is recorded.'
            : poll.active
              ? 'Select an option to vote.'
              : 'This poll is closed.'}
          {` ${total} votes in total.`}
        </p>
        {renderFailure(`poll-${poll.id}`)}
      </Card>
    );
  };

  const renderDocument = (document: CivicDocument) => (
    <Card key={document.id} className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-[#234E35]" />
          <p className="text-sm font-bold text-slate-800">{document.title}</p>
        </div>
        <p className="mt-1 text-xs text-slate-500">{document.municipality}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">
            {document.category}
          </span>
          <span className="text-slate-400">{document.publishedAt}</span>
          <span className="text-slate-400">{document.pages} pages</span>
        </div>
      </div>
      <button
        type="button"
        disabled
        title="Demo document"
        className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400"
      >
        View
      </button>
    </Card>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#234E35]/70">
            Plan & participate
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Discover</h1>
          <p className="mt-1 text-sm text-slate-500">
            Infrastructure projects, live polls and the documents behind them.
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

      <section className="mt-6">
        <SectionHeading
          title="Infrastructure projects"
          hint="Progress is reported by the delivery teams."
          action={
            <span className="text-xs font-semibold text-slate-400">
              {projects.length} project{projects.length === 1 ? '' : 's'}
            </span>
          }
        />
        {projects.length === 0 ? (
          <EmptyState title="No projects to show" hint="Published projects appear here." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">{projects.map(renderProject)}</div>
        )}
      </section>

      <section className="mt-6">
        <SectionHeading
          title="Live polls"
          hint="One vote per poll in this demo."
          action={
            <span className="text-xs font-semibold text-slate-400">
              <Vote className="mr-1 inline h-3.5 w-3.5" />
              {polls.length} poll{polls.length === 1 ? '' : 's'}
            </span>
          }
        />
        {polls.length === 0 ? (
          <EmptyState title="No polls open" hint="New polls are announced in the bulletins." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">{polls.map(renderPoll)}</div>
        )}
      </section>

      <section className="mt-6">
        <SectionHeading
          title="Documents & plans"
          hint="Notices, plans and minutes from the archive."
        />
        {documents.length === 0 ? (
          <EmptyState title="No documents yet" hint="Published documents appear here." />
        ) : (
          <>
            <div className="space-y-3">{documents.map(renderDocument)}</div>
            <p className="mt-3 text-xs text-slate-400">
              {documents.length} document{documents.length === 1 ? '' : 's'} in the demo archive.
            </p>
          </>
        )}
      </section>
    </div>
  );
};
