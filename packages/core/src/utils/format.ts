/** Convert a label into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Title-case a folder/file segment for sidebar group labels. */
export function humanize(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Reading-time estimate (~200 wpm) from a doc body. */
export function readingTime(body: string | undefined): string {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

/** Date + time in the site's configured time zone, with a readable label. */
export function formatDateTime(
  date: Date,
  timeZone: string,
  timeZoneLabel: string,
): string {
  let fmt = dateFormatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    });
    dateFormatterCache.set(timeZone, fmt);
  }
  return `${fmt.format(date)} ${timeZoneLabel}`;
}
