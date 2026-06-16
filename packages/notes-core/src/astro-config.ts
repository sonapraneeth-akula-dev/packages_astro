import { defineConfig, fontProviders } from 'astro/config';
import type { AstroIntegration } from 'astro';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import {
  satteriMdx,
  satteriMarkdownProcessor,
} from '@grihasetu/rehype-satteri-autolink-headings/astro';
import { execSync } from 'node:child_process';
import { resolveTheme, themeFontEntries } from '@grihasetu/components/theme';
import { notesRoutes } from './routes-integration';
import type { DocsConfig } from './config';
import type { SidebarConfig } from './schema';

export interface DocsAstroConfigOptions {
  /** Dev/preview port. Each site picks its own (e.g. demo 4310, app 4320). */
  port?: number;
  /** Override the site URL (defaults to PUBLIC_SITE_URL env or localhost:port). */
  site?: string;
  /** Extra integrations appended after the docs defaults. */
  integrations?: AstroIntegration[];
  /**
   * The site's resolved docs config (from {@link defineDocsConfig}). The engine
   * owns all page routing, so this is how a site's branding, nav and search
   * setting reach the injected routes.
   */
  docsConfig: DocsConfig;
  /**
   * Project-root-relative path to the site's MDX component registry module.
   * Defaults to `./src/components/registry.ts`.
   */
  components?: string;
  /** Optional curated sidebar that overrides the auto-generated tree. */
  sidebar?: SidebarConfig;
}

/** Run a git command at build time, falling back gracefully (e.g. in CI/Docker). */
function git(command: string, fallback: string): string {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

/**
 * Shared Astro config for every docs/notes site. Each site calls this from its
 * own `astro.config.ts` and may pass a port, site URL, or extra integrations.
 *
 *   // demo/notes/astro.config.ts
 *   import { defineDocsAstroConfig } from '@grihasetu/notes-core/astro';
 *   export default defineDocsAstroConfig({ port: 4310 });
 */
export function defineDocsAstroConfig(options: DocsAstroConfigOptions) {
  const port = options.port ?? 4310;
  const site = options.site ?? process.env.PUBLIC_SITE_URL ?? `http://localhost:${port}`;

  const gitCommit =
    process.env.GIT_COMMIT ?? git('git rev-parse --short HEAD', 'unknown');
  const gitBranch =
    process.env.GIT_BRANCH ?? git('git rev-parse --abbrev-ref HEAD', 'unknown');

  // Self-host only the fonts the selected combo needs (see the theme system).
  const theme = resolveTheme(options.docsConfig.theme);
  const fonts = themeFontEntries(theme).map((entry) => ({
    provider: fontProviders.google(),
    ...entry,
  }));

  return defineConfig({
    site,
    // Expressive Code must be registered BEFORE MDX so it processes fenced code
    // inside .mdx. It adds copy buttons, frames, line numbers and dual themes.
    integrations: [
      expressiveCode({
        themes: ['github-light', 'github-dark-high-contrast'],
        themeCssSelector: (theme) => `[data-theme="${theme.type}"]`,
        useDarkModeMediaQuery: true,
        plugins: [pluginLineNumbers()],
        defaultProps: {
          showLineNumbers: false,
        },
        styleOverrides: {
          borderRadius: 'var(--radius)',
          borderColor: 'var(--border)',
          codeFontFamily: 'var(--font-mono)',
          uiFontFamily: 'var(--font-sans)',
          frames: {
            shadowColor: 'transparent',
          },
        },
      }),
      satteriMdx(),
      sitemap(),
      // The engine owns all page routing/search: this injects `/`, `/[...slug]`,
      // `/search` and `/404` so sites need no `src/pages/` of their own.
      notesRoutes({
        docsConfig: options.docsConfig,
        components: options.components,
        sidebar: options.sidebar,
      }),
      ...(options.integrations ?? []),
    ],
    compressHTML: true,
    build: {
      // Inline page CSS into the document <head> so the first paint never waits
      // on a separate render-blocking stylesheet request, improving FCP/LCP.
      inlineStylesheets: 'always',
    },
    markdown: {
      // The whole Markdown/MDX rehype pipeline lives in the satteri plugin
      // package: heading ids (rehype-slug) + a clickable anchor beside each
      // heading (the satteri autolink plugin).
      processor: satteriMarkdownProcessor(),
    },
    // Self-host Google Fonts at build time: removes external font origins from
    // the critical path and ships metric-matched fallbacks (no layout shift).
    // The family list is derived from the site's theme combo, so a build
    // downloads only the selected fonts.
    fonts,
    server: {
      host: '0.0.0.0',
      port,
    },
    vite: {
      server: {
        allowedHosts: true,
        watch: {
          ignored: [
            '**/dist/**',
            '**/.astro/**',
            '**/public/pagefind/**',
            '**/astro.config.*.timestamp-*',
            '**/astro.config.timestamp-*',
          ],
          ...(process.env.CHOKIDAR_USEPOLLING
            ? { usePolling: true, interval: 1000 }
            : {}),
        },
      },
      preview: { allowedHosts: true },
      define: {
        __APP_ENV__: JSON.stringify(process.env.PUBLIC_APP_ENV ?? 'dev'),
        __GIT_COMMIT__: JSON.stringify(gitCommit),
        __GIT_BRANCH__: JSON.stringify(gitBranch),
      },
      build: {
        rollupOptions: {
          // Pagefind's runtime is generated into /pagefind/ during the build
          // step and only exists in the final output — never bundle it.
          //
          // `satteri` / `@astrojs/markdown-satteri` are referenced by a dead
          // code branch in @astrojs/mdx@6.x (`dist/satteri/index.js`, only used
          // when the markdown processor is the experimental "satteri" one). We
          // use the `unified` processor, so that branch never runs — but Rollup
          // still tries to resolve the phantom imports while walking the graph.
          // `@astrojs/compiler-rs` is Astro's optional Rust compiler, referenced
          // by a similar dead branch. `fsevents` is Rollup/Chokidar's macOS-only
          // file-watcher native module, absent on Windows/Linux. Marking them
          // external leaves the unused imports untouched. (These only surface in
          // a workspace because the linked core package makes Vite walk the
          // build tooling's internals.)
          external: [
            /^\/pagefind\//,
            'satteri',
            '@astrojs/markdown-satteri',
            '@astrojs/compiler-rs',
            'fsevents',
          ],
        },
      },
    },
  });
}
