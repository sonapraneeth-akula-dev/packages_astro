import { getCollection } from 'astro:content';
import type { DocEntry } from '../content';
import { slugify } from './format';

/** Drafts are only visible outside production builds. */
const includeDrafts = import.meta.env.DEV;

/** All live notes (drafts included only outside production). */
export async function getLiveDocs(): Promise<DocEntry[]> {
  return getCollection('docs', ({ data }) => includeDrafts || !data.draft);
}

/** A taxonomy term (category or tag) with its post count. */
export interface Taxonomy {
  name: string;
  slug: string;
  count: number;
}

/** Unique categories with note counts, sorted by frequency then name. */
export function getCategories(docs: DocEntry[]): Taxonomy[] {
  const map = new Map<string, number>();
  for (const doc of docs) {
    const name = doc.data.category;
    if (!name) continue;
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Unique tags with note counts, sorted by frequency then name. */
export function getTags(docs: DocEntry[]): Taxonomy[] {
  const map = new Map<string, number>();
  for (const doc of docs) {
    for (const tag of doc.data.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Notes within a category (matched by slug). */
export function docsInCategory(docs: DocEntry[], categorySlug: string): DocEntry[] {
  return docs.filter((d) => d.data.category && slugify(d.data.category) === categorySlug);
}

/** Notes carrying a tag (matched by slug). */
export function docsWithTag(docs: DocEntry[], tagSlug: string): DocEntry[] {
  return docs.filter((d) => d.data.tags.some((t) => slugify(t) === tagSlug));
}
