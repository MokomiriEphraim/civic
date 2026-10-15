import type {
  Announcement,
  AssistantReply,
  CivicAlert,
  Discussion,
  HazardReport,
} from '../types';
import { OPEN_STATUSES } from '../types';

export interface AssistantContext {
  alerts: CivicAlert[];
  announcements: Announcement[];
  reports: HazardReport[];
  discussions: Discussion[];
}

const REPORT_INTENT =
  /\b(report|log|raise|submit|i want to report|where can i report|how do i report)\b/i;
const CATEGORY_KEYWORDS: { pattern: RegExp; label: string }[] = [
  { pattern: /pothole|road|asphalt|trench|manhole/i, label: 'road' },
  { pattern: /water|leak|drain|burst|sewer/i, label: 'water' },
  { pattern: /waste|dump|rubbish|bin/i, label: 'waste' },
  { pattern: /traffic|signal|light/i, label: 'traffic' },
  { pattern: /electric|power|streetlight|lamp/i, label: 'electricity' },
];

function matchesReport(report: HazardReport, label: string): boolean {
  const haystack = `${report.subType} ${report.hazardType} ${report.description} ${report.department}`.toLocaleLowerCase();
  switch (label) {
    case 'road':
      return /pothole|road|asphalt|trench|manhole|stormwater/.test(haystack);
    case 'water':
      return /water|drain|sewer|burst|leak/.test(haystack);
    case 'waste':
      return /waste|dump|rubbish|bin|refuse/.test(haystack);
    case 'traffic':
      return /traffic|signal|crossing|marking/.test(haystack);
    case 'electricity':
      return /electric|light|lamp|power/.test(haystack);
    default:
      return false;
  }
}

function extractTicketId(question: string): string | null {
  const match = question.match(/#?\s*CF-?\d{4,6}/i);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, '');
  return `#CF-${digits.slice(-5)}`;
}

function quoteRestoration(text: string): string | null {
  const match = text.match(/(?:expected restoration|restoration|back by|expected)[:\s]+(\d{1,2}:\d{2})/i);
  return match ? match[1] : null;
}

function activeAlerts(ctx: AssistantContext): CivicAlert[] {
  return ctx.alerts.filter((alert) => alert.active);
}

/**
 * Deterministic assistant: answers from the live alert, announcement and
 * report data on this device. No external model call.
 */
export function answerQuestion(
  question: string,
  ctx: AssistantContext
): AssistantReply {
  const text = question.trim();
  const lower = text.toLocaleLowerCase();

  if (text.length === 0) {
    return {
      text: 'Ask me about a ticket, a local interruption, or how to report a hazard.',
      suggestions: [
        { label: 'Report a hazard', startReport: true },
        { label: 'Open civic map', view: 'map' },
      ],
    };
  }

  const ticketId = extractTicketId(text);
  if (ticketId) {
    const report = ctx.reports.find((entry) => entry.id.toLocaleUpperCase() === ticketId.toLocaleUpperCase());
    if (report) {
      const done = (report.timeline ?? []).filter((step) => step.done).length;
      const total = (report.timeline ?? []).length || 1;
      return {
        text: `${report.id} — ${report.subType} at ${report.address ?? report.location}. Status: ${report.status}, severity ${report.severity}, handled by ${report.department}. ${done} of ${total} workflow steps are complete.`,
        suggestions: [{ label: `Track ${report.id}`, view: 'ticket' }],
      };
    }
    return {
      text: `I could not find ticket ${ticketId} in this area's feed. Check the ticket number, or search the public tracker.`,
      suggestions: [{ label: 'Search tickets', view: 'ticket' }],
    };
  }

  const wantsRestoration = /restor|when.*(fixed|back|done|resolved)|eta|how long/i.test(lower);
  const mentionsWater = /water|no water|interruption|outage|burst/i.test(lower);

  if (mentionsWater || wantsRestoration) {
    const relevant = activeAlerts(ctx).filter(
      (alert) =>
        (mentionsWater && /water|drain|sewer/i.test(`${alert.title} ${alert.body} ${alert.category}`)) ||
        (wantsRestoration && /restor|\d{1,2}:\d{2}/i.test(alert.body))
    );
    const announcement = ctx.announcements.find((entry) =>
      mentionsWater ? /water/i.test(`${entry.title} ${entry.body}`) : /\d{1,2}:\d{2}/.test(entry.body)
    );

    if (relevant.length > 0 || announcement) {
      const alert = relevant[0];
      const restoration = alert ? quoteRestoration(alert.body) : null;
      const parts: string[] = [];
      if (alert) {
        parts.push(
          `There is currently an active ${alert.level} alert: ${alert.title} in ${alert.area}. ${alert.body}`
        );
        parts.push(restoration ? `Expected restoration: ${restoration}.` : '');
      }
      if (announcement) {
        parts.push(`Official announcement — ${announcement.title}: ${announcement.body}`);
      }
      return {
        text: parts.filter(Boolean).join(' '),
        suggestions: [
          { label: 'View alerts', view: 'bulletins' },
          { label: 'See it on the map', view: 'map' },
        ],
      };
    }

    if (mentionsWater) {
      const openWater = ctx.reports.filter(
        (report) => OPEN_STATUSES.includes(report.status) && matchesReport(report, 'water')
      );
      if (openWater.length > 0) {
        return {
          text: `I found ${openWater.length} open water-related ticket${openWater.length === 1 ? '' : 's'} nearby — the most recent is ${openWater[0].id} at ${openWater[0].address ?? openWater[0].location}. No published interruption notice is active right now.`,
          suggestions: [
            { label: 'Open civic map', view: 'map' },
            { label: 'Report a new issue', startReport: true },
          ],
        };
      }
    }
  }

  if (REPORT_INTENT.test(lower)) {
    const category = CATEGORY_KEYWORDS.find((entry) => entry.pattern.test(lower));
    const hint = category
      ? ` for a ${category.label} issue`
      : '';
    return {
      text: `I can start a report${hint}. Upload a photo and the local detection engine will classify it, pick the department and suggest a severity before the ticket is created.`,
      suggestions: [
        { label: 'Start report', startReport: true },
        { label: 'Check for duplicates first', view: 'map' },
      ],
    };
  }

  const category = CATEGORY_KEYWORDS.find((entry) => entry.pattern.test(lower));
  if (category) {
    const open = ctx.reports.filter(
      (report) => OPEN_STATUSES.includes(report.status) && matchesReport(report, category.label)
    );
    if (open.length > 0) {
      const top = open[0];
      return {
        text: `There ${open.length === 1 ? 'is 1 open' : `are ${open.length} open`} ${category.label} issue${open.length === 1 ? '' : 's'} in your area. The most recent is ${top.id} — ${top.subType} at ${top.address ?? top.location}, currently ${top.status}.`,
        suggestions: [
          { label: 'Open civic map', view: 'map' },
          { label: 'Transparency dashboard', view: 'transparency' },
        ],
      };
    }
    return {
      text: `No open ${category.label} issues are on the feed right now. If you can see one, a photo report takes under a minute.`,
      suggestions: [{ label: 'Report it', startReport: true }],
    };
  }

  const discussions = ctx.discussions.filter((entry) =>
    [entry.title, entry.body, entry.category].some((field) =>
      field.toLocaleLowerCase().includes(lower)
    )
  );
  if (discussions.length > 0) {
    return {
      text: `Residents are already discussing this — "${discussions[0].title}" in ${discussions[0].area} has ${discussions[0].comments.length} comments.`,
      suggestions: [{ label: 'Join the discussion', view: 'community' }],
    };
  }

  const active = activeAlerts(ctx);
  return {
    text: `I could not match that to a ticket or alert. I currently track ${ctx.reports.length} tickets and ${active.length} active alert${active.length === 1 ? '' : 's'} for your area. Try a ticket number like CF-45821, "water interruption", or "where can I report a pothole".`,
    suggestions: [
      { label: 'Report a hazard', startReport: true },
      { label: 'Browse alerts', view: 'bulletins' },
      { label: 'Civic map', view: 'map' },
    ],
  };
}

/** Short intro line for the assistant dock. */
export const ASSISTANT_GREETING =
  'Ask CivicFix about a ticket, a local interruption, or how to report a hazard.';
