import type { AstroIntegration } from 'astro';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { BlogConfig } from './config';

/**
 * Options for the blog route integration. The engine owns all page routing
 * (home feed, posts, categories, tags, search, RSS and 404), so individual
 * sites carry no `src/pages/` of their own — they only supply this per-site
 * data plus their content collection.
 */
export interface BlogRoutesOptions {
  /** The site's resolved config (from {@link defineBlogConfig}). */
  blogConfig: BlogConfig;
  /**
   * Project-root-relative path to the site's MDX component registry module
   * (which default-merges the engine's components). Defaults to
   * `./src/components/registry.ts`.
   */
  components?: string;
}

/** Virtual module specifiers the injected route components import from. */
const ID = {
  config: 'virtual:blog-core/config',
  components: 'virtual:blog-core/components',
} as const;

/** The package-relative entrypoints of the injected route components. */
const ROUTES = {
  home: '@sonapraneeth/blog-core/routes/[...page].astro',
  post: '@sonapraneeth/blog-core/routes/blog/[...id].astro',
  categories: '@sonapraneeth/blog-core/routes/categories/index.astro',
  category: '@sonapraneeth/blog-core/routes/categories/[category].astro',
  tags: '@sonapraneeth/blog-core/routes/tags/index.astro',
  tag: '@sonapraneeth/blog-core/routes/tags/[tag].astro',
  rss: '@sonapraneeth/blog-core/routes/rss.xml.ts',
  search: '@sonapraneeth/blog-core/routes/search.astro',
  notFound: '@sonapraneeth/blog-core/routes/404.astro',
} as const;

/**
 * Astro integration that registers the engine's page routes for a blog site and
 * exposes that site's config and component map to the injected route components
 * through `virtual:blog-core/*` modules.
 */
export function blogRoutes(options: BlogRoutesOptions): AstroIntegration {
  return {
    name: '@sonapraneeth/blog-core/routes',
    hooks: {
      'astro:config:setup': ({ config, injectRoute, updateConfig }) => {
        const root = fileURLToPath(config.root);
        const componentsPath = path
          .resolve(root, options.components ?? './src/components/registry.ts')
          .replace(/\\/g, '/');

        const configCode = `export const blogConfig = ${JSON.stringify(options.blogConfig)};`;
        const componentsCode = `export { components } from ${JSON.stringify(componentsPath)};`;

        updateConfig({
          vite: {
            plugins: [
              {
                name: 'blog-core:virtual-modules',
                resolveId(id) {
                  if (id === ID.config || id === ID.components) {
                    return `\0${id}`;
                  }
                  return null;
                },
                load(id) {
                  if (id === `\0${ID.config}`) return configCode;
                  if (id === `\0${ID.components}`) return componentsCode;
                  return null;
                },
              },
            ],
          },
        });

        injectRoute({ pattern: '/[...page]', entrypoint: ROUTES.home, prerender: true });
        injectRoute({ pattern: '/blog/[...id]', entrypoint: ROUTES.post, prerender: true });
        injectRoute({ pattern: '/categories', entrypoint: ROUTES.categories, prerender: true });
        injectRoute({ pattern: '/categories/[category]', entrypoint: ROUTES.category, prerender: true });
        injectRoute({ pattern: '/tags', entrypoint: ROUTES.tags, prerender: true });
        injectRoute({ pattern: '/tags/[tag]', entrypoint: ROUTES.tag, prerender: true });
        injectRoute({ pattern: '/rss.xml', entrypoint: ROUTES.rss, prerender: true });
        if (options.blogConfig.search) {
          injectRoute({ pattern: '/search', entrypoint: ROUTES.search, prerender: true });
        }
        injectRoute({ pattern: '/404', entrypoint: ROUTES.notFound, prerender: true });
      },
    },
  };
}
