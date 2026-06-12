import { defineConfig, fontProviders } from 'astro/config';
import type { AstroIntegration } from 'astro';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { execSync } from 'node:child_process';

export interface DocsAstroConfigOptions {
  /** Dev/preview port. Each site picks its own (e.g. demo 4310, app 4320). */
  port?: number;
  /** Override the site URL (defaults to PUBLIC_SITE_URL env or localhost:port). */
  site?: string;
  /** Extra integrations appended after the docs defaults. */
  integrations?: AstroIntegration[];
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
 *   // packages/demo/astro.config.ts
 *   import { defineDocsAstroConfig } from '@grihasetu/notes-core/astro';
 *   export default defineDocsAstroConfig({ port: 4310 });
 */
export function defineDocsAstroConfig(options: DocsAstroConfigOptions = {}) {
  const port = options.port ?? 4310;
  const site = options.site ?? process.env.PUBLIC_SITE_URL ?? `http://localhost:${port}`;

  const gitCommit =
    process.env.GIT_COMMIT ?? git('git rev-parse --short HEAD', 'unknown');
  const gitBranch =
    process.env.GIT_BRANCH ?? git('git rev-parse --abbrev-ref HEAD', 'unknown');

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
      mdx(),
      sitemap(),
      ...(options.integrations ?? []),
    ],
    compressHTML: true,
    markdown: {
      // Astro 6 moved remark/rehype config under `processor`. `unified()` builds
      // the default pipeline; we add heading ids + clickable anchor links.
      processor: unified({
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: 'append',
              properties: { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 },
              content: {
                type: 'element',
                tagName: 'svg',
                properties: {
                  width: 15,
                  height: 15,
                  viewBox: '0 0 24 24',
                  fill: 'none',
                  stroke: 'currentColor',
                  strokeWidth: 2,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                },
                children: [
                  {
                    type: 'element',
                    tagName: 'path',
                    properties: { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' },
                    children: [],
                  },
                  {
                    type: 'element',
                    tagName: 'path',
                    properties: { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
                    children: [],
                  },
                ],
              },
            },
          ],
        ],
      }),
    },
    // Self-host Google Fonts at build time: removes external font origins from
    // the critical path and ships metric-matched fallbacks (no layout shift).
    fonts: [
      {
        provider: fontProviders.google(),
        name: 'Plus Jakarta Sans',
        cssVariable: '--font-sans-files',
        weights: ['300 800'],
        styles: ['normal'],
        subsets: ['latin'],
      },
      {
        provider: fontProviders.google(),
        name: 'Space Grotesk',
        cssVariable: '--font-heading-files',
        weights: ['300 700'],
        styles: ['normal'],
        subsets: ['latin'],
      },
      {
        provider: fontProviders.google(),
        name: 'JetBrains Mono',
        cssVariable: '--font-mono-files',
        weights: ['400 700'],
        styles: ['normal'],
        subsets: ['latin'],
      },
    ],
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
