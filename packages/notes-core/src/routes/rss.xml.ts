import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { routeIncluded } from '@sonapraneeth/components/discovery.ts';
import { docsConfig } from 'virtual:notes-core/config';
import { entrySlug } from '../utils/docs';
import { getLiveDocs } from '../utils/taxonomy';

export async function GET(context: APIContext): Promise<Response> {
  const entries = (await getLiveDocs())
    .filter((entry) => !entry.data.draft && !entry.data.sidebar?.hidden)
    .filter((entry) => routeIncluded(entrySlug(entry), docsConfig.discovery.rss));

  entries.sort((left, right) => {
    const leftDate = left.data.lastUpdated ?? left.data.publishedDate;
    const rightDate = right.data.lastUpdated ?? right.data.publishedDate;
    const dateOrder = (rightDate?.getTime() ?? 0) - (leftDate?.getTime() ?? 0);
    return dateOrder || left.data.title.localeCompare(right.data.title);
  });

  return rss({
    title: docsConfig.title,
    description: docsConfig.description,
    site: context.site ?? 'http://localhost:4310',
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      link: entrySlug(entry),
      categories: [entry.data.category, ...entry.data.tags].filter(
        (category): category is string => Boolean(category),
      ),
      ...(entry.data.publishedDate ? { pubDate: entry.data.publishedDate } : {}),
      ...(entry.data.lastUpdated
        ? { customData: `<atom:updated>${entry.data.lastUpdated.toISOString()}</atom:updated>` }
        : {}),
    })),
  });
}