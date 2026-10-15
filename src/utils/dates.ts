const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Parses the date formats this app produces:
 * "14 Oct 2026", "14 Oct 2026, 09:14 AM", "14 Oct 2026 09:14", plus ISO strings.
 * Returns epoch milliseconds, or null when the value cannot be interpreted.
 */
export function parseLooseDate(value: string | undefined | null): number | null {
  if (!value) return null;

  const structured = value.match(
    /(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})(?:\s*[,–-]?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i
  );
  if (structured) {
    const month = MONTHS[structured[2].slice(0, 3).toLowerCase()];
    if (month !== undefined) {
      let hour = structured[4] === undefined ? 0 : Number(structured[4]);
      const meridiem = structured[6]?.toUpperCase();
      if (meridiem === 'PM' && hour < 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;
      const minute = structured[5] === undefined ? 0 : Number(structured[5]);
      const parsed = new Date(
        Number(structured[3]),
        month,
        Number(structured[1]),
        hour,
        minute
      ).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  const fallback = Date.parse(value);
  return Number.isNaN(fallback) ? null : fallback;
}

export function daysBetween(fromMs: number, toMs: number): number {
  return Math.round((toMs - fromMs) / 86_400_000);
}

export function daysAgo(value: string | undefined, nowMs: number = Date.now()): number | null {
  const parsed = parseLooseDate(value);
  if (parsed === null) return null;
  return daysBetween(parsed, nowMs);
}

export function formatDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTimestamp(date: Date = new Date()): string {
  return date.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
