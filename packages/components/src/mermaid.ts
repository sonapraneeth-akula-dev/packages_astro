/**
 * Opt-out Mermaid diagram support shared by the blog and notes engines.
 *
 * Pairs with the `remark-mermaid` transform (in the satteri Markdown processor),
 * which rewrites ```` ```mermaid ```` fenced blocks into `<pre class="mermaid">`
 * elements — bypassing the code highlighter (Expressive Code). This integration
 * injects the client runtime (`mermaid-client.ts`) that turns those elements
 * into theme-aware SVG diagrams.
 *
 * Wiring detail: the injected page script cannot resolve a workspace subpath
 * (`@sonapraneeth/components/mermaid-client`) — Astro's virtual `page.js` bundle
 * fails on it in both dev and build. So instead of injecting a bare import, we
 * register a Vite **alias** to the client file's absolute path (aliases resolve
 * identically in dev and build, and avoid the Windows drive-letter
 * import-specifier gotcha) and inject that alias. Keeping the runtime inside
 * this package means its lazy `import('mermaid')` resolves here, where `mermaid`
 * is a dependency, so consuming sites need not depend on `mermaid` themselves.
 * The bundle is only fetched on pages that contain a diagram, so registering the
 * integration unconditionally is cheap:
 *
 *   integrations: [expressiveCode(...), satteriMdx(), mermaid(), ...]
 */
import type { AstroIntegration } from 'astro';
import { fileURLToPath } from 'node:url';

/** Stable alias id injected on every page and resolved to the client module. */
const CLIENT_ALIAS = 'sonapraneeth:mermaid-client';

export function mermaid(): AstroIntegration {
  // Absolute path (forward slashes) to the client runtime beside this module.
  const clientPath = fileURLToPath(
    new URL('./mermaid-client.ts', import.meta.url),
  ).replace(/\\/g, '/');

  return {
    name: 'sonapraneeth-mermaid',
    hooks: {
      'astro:config:setup': ({ injectScript, updateConfig }) => {
        updateConfig({
          vite: {
            resolve: { alias: { [CLIENT_ALIAS]: clientPath } },
            // Mermaid is large and imported lazily, so Vite's dev server would
            // otherwise optimize it on-demand on first import — returning a 504
            // "needs optimization" that fails the dynamic import behind a proxy.
            // Pre-bundling it at startup makes the lazy import resolve cleanly.
            optimizeDeps: { include: ['mermaid'] },
          },
        });
        injectScript('page', `import ${JSON.stringify(CLIENT_ALIAS)};`);
      },
    },
  };
}

export default mermaid;
