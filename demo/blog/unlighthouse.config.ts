/// <reference types="node" />

// Minimal shape of the Puppeteer page passed to the hook. `puppeteer-core` is
// fetched on demand by `bunx unlighthouse-ci`, so it is not a project
// dependency and cannot be imported here for its types.
interface PuppeteerPage {
  emulateMediaFeatures(features: { name: string; value: string }[]): Promise<void>;
  evaluateOnNewDocument(fn: () => void): Promise<unknown>;
}

// Unlighthouse config for the demo blog. The @grihasetu/blog-core engine owns
// all routing (no local src/pages), so URLs are discovered by crawling the
// preview server and its generated sitemap rather than a pages directory.
export default {
  site: 'http://localhost:4312', // Astro preview port for the demo blog
  scanner: {
    device: 'desktop',
    throttle: false,
    skipJavascript: false,
    samples: 3,
  },
  hooks: {
    // Set up dark mode BEFORE navigation when DARK_MODE is enabled.
    'puppeteer:before-goto': async (page: PuppeteerPage) => {
      if (process.env.DARK_MODE === 'true') {
        await page.emulateMediaFeatures([
          { name: 'prefers-color-scheme', value: 'dark' },
        ]);
        await page.evaluateOnNewDocument(() => {
          if (document.documentElement) {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.style.colorScheme = 'dark';
          }
        });
      }
    },
  },
  ci: {
    budget: {
      performance: 65,
      accessibility: 95,
      'best-practices': 95,
      seo: 90,
    },
    // Use the flat `json` reporter (array of per-route scores) so the bundled
    // lighthouse-audit.ts validator can parse `.unlighthouse/ci-result.json`.
    // `jsonExpanded` writes a { summary, routes, metadata } object the
    // validator rejects (it requires Array.isArray(data)).
    reporter: 'json',
  },
};
