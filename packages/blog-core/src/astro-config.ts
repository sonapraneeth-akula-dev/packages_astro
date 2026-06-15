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
import { blogRoutes } from './routes-integration';
import type { BlogConfig } from './config';

export interface BlogAstroConfigOptions {
  /** Dev/preview port. Each site picks its own (e.g. demo 4312, app 4322). */
  port?: number;
  /** Override the site URL (defaults to PUBLIC_SITE_URL env or localhost:port). */
  site?: string;
  /** Extra integrations appended after the blog defaults. */
  integrations?: AstroIntegration[];
  /**
   * The site's resolved blog config (from {@link defineBlogConfig}). The engine
   * owns all page routing, so this is how a site's branding, nav and search
   * setting reach the injected routes.
   */
  blogConfig: BlogConfig;
  /**
   * Project-root-relative path to the site's MDX component registry module.
   * Defaults to `./src/components/registry.ts`.
   */
  components?: string;
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
 * Shared Astro config for every blog site. Each site calls this from its own
 * `astro.config.ts` and may pass a port, site URL, or extra integrations.
 *
 *   // demo/blog/astro.config.ts
 *   import { defineBlogAstroConfig } from '@grihasetu/blog-core/astro';
 *   import { blogConfig } from './blog.config';
 *   export default defineBlogAstroConfig({ port: 4312, blogConfig });
 */
export function defineBlogAstroConfig(options: BlogAstroConfigOptions) {
  const port = options.port ?? 4312;
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
      satteriMdx(),
      sitemap(),
      // The engine owns all page routing/search: this injects the home feed,
      // posts, categories, tags, search, RSS and 404 so sites need no
      // `src/pages/` of their own.
      blogRoutes({
        blogConfig: options.blogConfig,
        components: options.components,
      }),
      ...(options.integrations ?? []),
    ],
    compressHTML: true,
    build: {
      // Inline every stylesheet into the document head so the critical CSS
      // ships with the HTML and no external <link> blocks first paint. The
      // engine's per-page CSS is small, so this removes render-blocking
      // requests and improves FCP/LCP without bloating the payload.
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
          // step and only exists in the final output — never bundle it. The
          // satteri / compiler-rs / fsevents externals mirror the notes engine:
          // they are dead-code-branch or platform-native imports Rollup would
          // otherwise try to resolve when walking the linked workspace graph.
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
