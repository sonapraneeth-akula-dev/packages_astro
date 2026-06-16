import type { AstroIntegration } from 'astro';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { DocsConfig } from './config';
import type { SidebarConfig } from './schema';

/**
 * Options for the route integration. The engine owns all page routing
 * (`/`, `/[...slug]`, `/search`, `/404`), so individual sites carry no
 * `src/pages/` of their own — they only supply this per-site data.
 */
export interface NotesRoutesOptions {
  /** The site's resolved config (from {@link defineDocsConfig}). */
  docsConfig: DocsConfig;
  /**
   * Project-root-relative path to the site's MDX component registry module
   * (which default-merges the engine's components). Defaults to
   * `./src/components/registry.ts`.
   */
  components?: string;
  /** Optional curated sidebar that overrides the auto-generated tree. */
  sidebar?: SidebarConfig;
}

/** Virtual module specifiers the injected route components import from. */
const ID = {
  config: 'virtual:notes-core/config',
  components: 'virtual:notes-core/components',
  sidebar: 'virtual:notes-core/sidebar',
} as const;

/** The package-relative entrypoints of the injected route components. */
const ROUTES = {
  home: '@sonapraneeth/notes-core/routes/index.astro',
  doc: '@sonapraneeth/notes-core/routes/[...slug].astro',
  search: '@sonapraneeth/notes-core/routes/search.astro',
  notFound: '@sonapraneeth/notes-core/routes/404.astro',
} as const;

/**
 * Astro integration that registers the engine's page routes for a site and
 * exposes that site's config, component map and optional sidebar to the
 * injected route components through `virtual:notes-core/*` modules.
 */
export function notesRoutes(options: NotesRoutesOptions): AstroIntegration {
  return {
    name: '@sonapraneeth/notes-core/routes',
    hooks: {
      'astro:config:setup': ({ config, injectRoute, updateConfig }) => {
        const root = fileURLToPath(config.root);
        const componentsPath = path
          .resolve(root, options.components ?? './src/components/registry.ts')
          .replace(/\\/g, '/');

        const configCode = `export const docsConfig = ${JSON.stringify(options.docsConfig)};`;
        const sidebarCode = `export const sidebar = ${JSON.stringify(options.sidebar ?? null)};`;
        const componentsCode = `export { components } from ${JSON.stringify(componentsPath)};`;

        updateConfig({
          vite: {
            plugins: [
              {
                name: 'notes-core:virtual-modules',
                resolveId(id) {
                  if (id === ID.config || id === ID.components || id === ID.sidebar) {
                    return `\0${id}`;
                  }
                  return null;
                },
                load(id) {
                  if (id === `\0${ID.config}`) return configCode;
                  if (id === `\0${ID.sidebar}`) return sidebarCode;
                  if (id === `\0${ID.components}`) return componentsCode;
                  return null;
                },
              },
            ],
          },
        });

        injectRoute({ pattern: '/', entrypoint: ROUTES.home, prerender: true });
        injectRoute({ pattern: '/[...slug]', entrypoint: ROUTES.doc, prerender: true });
        if (options.docsConfig.search) {
          injectRoute({ pattern: '/search', entrypoint: ROUTES.search, prerender: true });
        }
        injectRoute({ pattern: '/404', entrypoint: ROUTES.notFound, prerender: true });
      },
    },
  };
}
