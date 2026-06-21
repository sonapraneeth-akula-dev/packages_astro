import { getCollection, type CollectionEntry } from 'astro:content';
import { blogConfig } from 'virtual:blog-core/config';

export type Post = CollectionEntry<'blog'>;

/** Build-aware draft visibility: drafts only render outside production. */
const includeDrafts = import.meta.env.DEV;

/** All publishable posts, newest first (includes archived posts). */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => includeDrafts || !data.draft);
  return posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

/**
 * Posts shown in the main home feed and RSS, newest first. Excludes archived
 * posts (which stay reachable by direct URL and in tag/category listings).
 */
export async function getFeedPosts(): Promise<Post[]> {
  const posts = await getPublishedPosts();
  return posts.filter((post) => !post.data.archived);
}

/** Convert a label into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface Taxonomy {
  name: string;
  slug: string;
  count: number;
}

/** Unique categories with post counts, sorted by frequency then name. */
export function getCategories(posts: Post[]): Taxonomy[] {
  const map = new Map<string, number>();
  for (const post of posts) {
    const name = post.data.category;
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Unique tags with post counts, sorted by frequency then name. */
export function getTags(posts: Post[]): Taxonomy[] {
  const map = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Posts within a category (matched by slug). */
export function postsInCategory(posts: Post[], categorySlug: string): Post[] {
  return posts.filter((p) => slugify(p.data.category) === categorySlug);
}

/** Posts carrying a given tag (matched by slug). */
export function postsWithTag(posts: Post[], tagSlug: string): Post[] {
  return posts.filter((p) => p.data.tags.some((t) => slugify(t) === tagSlug));
}

/** Reading-time estimate (~200 wpm) from a post body. */
export function readingTime(body: string | undefined): string {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

// Date + time rendered in the site's configured time zone, with a readable
// abbreviation (e.g. "IST") appended since Intl emits "GMT+5:30" for many zones.
const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: blogConfig.timeZone,
});

export function formatDateTime(date: Date): string {
  return `${dateTimeFormatter.format(date)} ${blogConfig.timeZoneLabel}`;
}
