import React, { useEffect, useRef, useState } from 'react';
import type {
  ActiveView,
  Announcement,
  AssistantSuggestion,
  CivicAlert,
  Discussion,
  HazardReport,
} from '../types';
import { ASSISTANT_GREETING, answerQuestion } from '../utils/assistant';
import { ExternalLink, MessageCircle, Send, Sparkles, X } from 'lucide-react';

interface AssistantDockProps {
  reports: HazardReport[];
  alerts: CivicAlert[];
  announcements: Announcement[];
  discussions: Discussion[];
  onNavigate: (view: ActiveView) => void;
  onStartReport: () => void;
  onOpenReport: (id: string) => void;
}

interface DockMessage {
  id: string;
  from: 'user' | 'assistant';
  text: string;
  suggestions?: AssistantSuggestion[];
  ticketId?: string;
}

const STARTERS: { label: string; text: string }[] = [
  { label: 'Where is my ticket #CF-45821?', text: 'Where is my ticket #CF-45821?' },
  { label: 'Are there water alerts?', text: 'Are there water alerts?' },
  { label: 'I want to report a pothole', text: 'I want to report a pothole' },
  { label: 'What open issues are there?', text: 'What open issues are there?' },
];

let messageSeq = 0;
function nextMessageId(): string {
  messageSeq += 1;
  return `dock-${messageSeq}`;
}

function extractTicketId(text: string): string | null {
  const match = text.match(/#CF-\d+/i);
  return match ? match[0].toUpperCase() : null;
}

export const AssistantDock: React.FC<AssistantDockProps> = ({
  reports,
  alerts,
  announcements,
  discussions,
  onNavigate,
  onStartReport,
  onOpenReport,
}) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DockMessage[]>([]);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, open]);

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = answerQuestion(trimmed, { alerts, announcements, reports, discussions });
    setMessages((prev) => [
      ...prev,
      { id: nextMessageId(), from: 'user', text: trimmed },
      {
        id: nextMessageId(),
        from: 'assistant',
        text: reply.text,
        suggestions: reply.suggestions,
        ticketId: extractTicketId(reply.text) ?? undefined,
      },
    ]);
  };

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next && messages.length === 0) {
        setMessages([{ id: nextMessageId(), from: 'assistant', text: ASSISTANT_GREETING }]);
      }
      return next;
    });
  };

  const handleSuggestion = (suggestion: AssistantSuggestion) => {
    if (suggestion.startReport) onStartReport();
    else if (suggestion.view) onNavigate(suggestion.view);
  };

  return (
    <div className="fixed bottom-20 right-4 z-30 flex flex-col items-end gap-3 sm:right-6">
      {open && (
        <div className="flex w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-[#234E35] px-4 py-3 text-white">
            <span className="rounded-full bg-white/15 p-1.5">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Civic assistant</p>
              <p className="text-[11px] text-white/70">Answers from live local data</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-full p-1.5 transition hover:bg-white/15"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            ref={listRef}
            className="flex max-h-[60vh] min-h-[180px] flex-1 flex-col gap-2 overflow-y-auto bg-slate-50/60 p-3"
          >
            {messages.map((message) => (
              <div key={message.id}>
                <div
                  className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <p
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs shadow-xs ${
                      message.from === 'user'
                        ? 'rounded-br-sm bg-[#234E35] text-white'
                        : 'rounded-bl-sm bg-white text-slate-700 ring-1 ring-inset ring-slate-200'
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
                {message.from === 'assistant' &&
                  (message.suggestions && message.suggestions.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 pl-1">
                      {message.ticketId && (
                        <button
                          type="button"
                          onClick={() => onOpenReport(message.ticketId!)}
                          className="inline-flex items-center gap-1 rounded-full border border-[#234E35]/30 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#234E35] transition hover:bg-[#234E35]/5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open ticket {message.ticketId}
                        </button>
                      )}
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion.label}
                          type="button"
                          onClick={() => handleSuggestion(suggestion)}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-[#234E35]/40 hover:text-[#234E35]"
                        >
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  ) : message.ticketId ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 pl-1">
                      <button
                        type="button"
                        onClick={() => onOpenReport(message.ticketId!)}
                        className="inline-flex items-center gap-1 rounded-full border border-[#234E35]/30 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#234E35] transition hover:bg-[#234E35]/5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open ticket {message.ticketId}
                      </button>
                    </div>
                  ) : null)}
              </div>
            ))}
            {messages.length <= 1 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {STARTERS.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => ask(starter.text)}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-[#234E35]/40 hover:text-[#234E35]"
                  >
                    {starter.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              ask(draft);
              setDraft('');
            }}
            className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5"
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a ticket, alert or report…"
              aria-label="Message the civic assistant"
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-[#234E35] focus:bg-white"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={draft.trim().length === 0}
              className="rounded-full bg-[#234E35] p-2 text-white transition hover:bg-[#1A3D29] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        aria-label={open ? 'Close CivicFix assistant' : 'Open CivicFix assistant'}
        aria-expanded={open}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#234E35] text-white shadow-lg transition hover:bg-[#1A3D29]"
      >
        {open ? <MessageCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>
    </div>
  );
};
