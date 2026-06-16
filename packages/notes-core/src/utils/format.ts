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

/**
 * Truncate text to the first `max` words, appending an ellipsis when the text
 * was actually shortened. Returns the original (trimmed) text when it already
 * fits within the word budget.
 */
export function truncateWords(text: string | undefined, max = 100): string {
  const words = (text ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return words.join(' ');
  return `${words.slice(0, max).join(' ')}…`;
}

/**
 * Up to two initials for a label, used to generate a default cover when no
 * image is supplied. Multi-word labels take each word's first character
 * (e.g. "Go language" → "GL"); single tokens take their first two non-space
 * characters (e.g. "C++" → "C+", "C#" → "C#").
 */
export function coverInitials(label: string): string {
  const cleaned = (label ?? '').trim();
  if (!cleaned) return '?';
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

/**
 * A stable hue (0–359) derived from a label, so each generated cover gets a
 * consistent accent colour across builds.
 */
export function coverHue(label: string): number {
  let hash = 0;
  for (const ch of label ?? '') {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return hash % 360;
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
