/**
 * Capture reference screenshots of the demo sites for the feature-index blog
 * posts in `demo/blog/content/`.
 *
 * Astro 7 keeps a single background dev server per workspace, so the demo sites
 * are captured one at a time. Start a site, capture it, stop it:
 *
 *   bun astro dev --root demo/notes --background
 *   node scripts/capture-screenshots.ts notes http://localhost:4321
 *   bun astro dev --root demo/notes stop
 *
 * The base URL argument is optional and falls back to the site's configured
 * port (notes 4310, notebooks 4311, blog 4312).
 *
 * Images land in `demo/blog/content/images/` and are referenced from the posts
 * with <DocImage>. Run this with Node, not Bun: Playwright talks to the browser
 * over an extra stdio pipe that Bun's spawn does not forward.
 */
import { chromium } from 'playwright-core';
import type { Browser, BrowserContext } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'demo/blog/content/images');

type SiteName = 'notes' | 'notebooks' | 'blog';

const DEFAULT_URL: Record<SiteName, string> = {
  notes: 'http://localhost:4310',
  notebooks: 'http://localhost:4311',
  blog: 'http://localhost:4312',
};

interface Shot {
  /** Which demo site serves this page. */
  site: SiteName;
  /** Output file name inside `demo/blog/content/images`. */
  file: string;
  /** Site-relative path to capture. */
  path: string;
  /** Capture the whole scrollable page instead of just the viewport. */
  full?: boolean;
  /** Capture in dark mode. */
  dark?: boolean;
  /** Selector clicked before the shot (e.g. to open a panel). */
  click?: string;
}

const SHOTS: Shot[] = [
  // ── blog-core ──────────────────────────────────────────────────────────
  { site: 'blog', file: 'blog-home.png', path: '/', full: true },
  { site: 'blog', file: 'blog-home-dark.png', path: '/', dark: true },
  { site: 'blog', file: 'blog-post.png', path: '/blog/route-injection-engine' },
  { site: 'blog', file: 'blog-categories.png', path: '/categories', full: true },
  { site: 'blog', file: 'blog-tags.png', path: '/tags', full: true },
  { site: 'blog', file: 'blog-search.png', path: '/search' },
  { site: 'blog', file: 'blog-404.png', path: '/does-not-exist' },
  {
    site: 'blog',
    file: 'components-theme-switcher.png',
    path: '/',
    click: '.ts-toggle',
  },

  // ── notes-core ─────────────────────────────────────────────────────────
  { site: 'notes', file: 'notes-home.png', path: '/', full: true },
  { site: 'notes', file: 'notes-doc.png', path: '/getting-started/configuration' },
  {
    site: 'notes',
    file: 'notes-sidebar-nesting.png',
    path: '/guides/level-2/level-3/level-4/level-5/level-6',
  },
  { site: 'notes', file: 'notes-search.png', path: '/search' },
  { site: 'notes', file: 'notes-tags.png', path: '/tags', full: true },
  { site: 'notes', file: 'notes-categories.png', path: '/categories', full: true },

  { site: 'notebooks', file: 'notebooks-hub.png', path: '/', full: true },
  { site: 'notebooks', file: 'notebooks-landing.png', path: '/cpp', full: true },
  { site: 'notebooks', file: 'notebooks-doc.png', path: '/go/advanced/concurrency' },
  { site: 'notebooks', file: 'notebooks-print.png', path: '/print/cpp' },
  { site: 'notebooks', file: 'notebooks-tags.png', path: '/cpp/tags', full: true },

  // ── components ─────────────────────────────────────────────────────────
  {
    site: 'notes',
    file: 'components-callouts.png',
    path: '/components/callouts',
    full: true,
  },
  {
    site: 'notes',
    file: 'components-annotations.png',
    path: '/components/annotations',
    full: true,
  },
  {
    site: 'notes',
    file: 'components-code-blocks.png',
    path: '/components/code-blocks',
    full: true,
  },
  {
    site: 'notes',
    file: 'components-cards-and-tabs.png',
    path: '/components/cards-and-tabs',
    full: true,
  },
  {
    site: 'notes',
    file: 'components-numbering.png',
    path: '/components/numbering',
    full: true,
  },
  { site: 'notes', file: 'components-images.png', path: '/components/images', full: true },
];

/** Dev-only chrome that would otherwise sit on top of every screenshot. */
const HIDE_DEV_CHROME = `
  .env-banner, #screen-size-indicator { display: none !important; }
  * { animation: none !important; transition: none !important; }
`;

async function capture(
  context: BrowserContext,
  shot: Shot,
  baseUrl: string,
): Promise<void> {
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}${shot.path}`, {
      waitUntil: 'networkidle',
      timeout: 60_000,
    });
    await page.addStyleTag({ content: HIDE_DEV_CHROME });
    if (shot.click) {
      await page.click(shot.click, { timeout: 10_000 });
      await page.waitForTimeout(400);
    }
    await page.screenshot({
      path: resolve(OUT_DIR, shot.file),
      fullPage: shot.full ?? false,
      animations: 'disabled',
      scale: 'css',
    });
    console.log(`  ✓ ${shot.file}`);
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  const site = process.argv[2] as SiteName | undefined;
  if (!site || !(site in DEFAULT_URL)) {
    console.error(
      'Usage: node scripts/capture-screenshots.ts <notes|notebooks|blog> [baseUrl]',
    );
    process.exitCode = 1;
    return;
  }
  const baseUrl = (process.argv[3] ?? DEFAULT_URL[site]).replace(/\/$/, '');
  const shots = SHOTS.filter((s) => s.site === site);

  await mkdir(OUT_DIR, { recursive: true });

  let browser: Browser;
  try {
    browser = await chromium.launch({ channel: 'chrome' });
  } catch {
    browser = await chromium.launch({ channel: 'msedge' });
  }

  const viewport = { width: 1440, height: 1000 };
  const light = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const dark = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  await light.addInitScript(() => localStorage.setItem('theme', 'light'));
  await dark.addInitScript(() => localStorage.setItem('theme', 'dark'));

  console.log(`Capturing ${shots.length} ${site} screenshot(s) from ${baseUrl}`);
  try {
    for (const shot of shots) {
      await capture(shot.dark ? dark : light, shot, baseUrl);
    }
  } finally {
    await browser.close();
  }
}

await main();
