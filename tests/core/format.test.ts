import { describe, expect, it } from 'bun:test';
import {
  formatDateTime,
  humanize,
  readingTime,
  slugify,
} from '../../packages/core/src/utils/format.ts';

describe('slugify', () => {
  it('lowercases and hyphenates a label', () => {
    expect(slugify('Getting Started')).toBe('getting-started');
  });

  it('collapses runs of non-alphanumerics into a single hyphen', () => {
    expect(slugify('Hello,   World!! Again')).toBe('hello-world-again');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Edge-- ')).toBe('edge');
  });

  it('returns an empty string for purely symbolic input', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('humanize', () => {
  it('replaces dashes and underscores with spaces and title-cases', () => {
    expect(humanize('getting-started')).toBe('Getting Started');
    expect(humanize('error_handling')).toBe('Error Handling');
  });

  it('capitalises the first letter of each word', () => {
    expect(humanize('advanced-topics-here')).toBe('Advanced Topics Here');
  });
});

describe('readingTime', () => {
  it('returns at least 1 min for empty or undefined input', () => {
    expect(readingTime(undefined)).toBe('1 min read');
    expect(readingTime('')).toBe('1 min read');
    expect(readingTime('   ')).toBe('1 min read');
  });

  it('estimates ~200 words per minute', () => {
    const fourHundredWords = Array.from({ length: 400 }, () => 'word').join(' ');
    expect(readingTime(fourHundredWords)).toBe('2 min read');
  });

  it('rounds to the nearest minute', () => {
    const threeHundredWords = Array.from({ length: 300 }, () => 'w').join(' ');
    expect(readingTime(threeHundredWords)).toBe('2 min read'); // 300/200 = 1.5 -> 2
  });
});

describe('formatDateTime', () => {
  it('formats a date in the given time zone with the label appended', () => {
    const date = new Date('2026-06-12T09:30:00Z');
    const result = formatDateTime(date, 'UTC', 'UTC');

    expect(result).toContain('Jun');
    expect(result).toContain('2026');
    expect(result).toContain('09:30');
    expect(result.endsWith('UTC')).toBe(true);
  });

  it('reflects a different time zone offset', () => {
    const date = new Date('2026-06-12T00:30:00Z');
    const result = formatDateTime(date, 'Asia/Kolkata', 'IST');

    expect(result).toContain('06:00'); // UTC+05:30
    expect(result.endsWith('IST')).toBe(true);
  });
});
