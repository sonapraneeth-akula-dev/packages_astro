import type { AstroIntegration } from 'astro';
import { copyFile } from 'node:fs/promises';

/** Copy Astro's complete generated sitemap index to the conventional path. */
export function sitemapAlias(): AstroIntegration {
  return {
    name: '@sonapraneeth/components/sitemap-alias',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        try {
          await copyFile(new URL('sitemap-index.xml', dir), new URL('sitemap.xml', dir));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          logger.warn('Sitemap index was not generated; sitemap.xml alias was skipped.');
        }
      },
    },
  };
}