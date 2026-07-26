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
 * The injected script is a one-line guard: neither the client runtime nor the
 * Mermaid bundle is fetched unless the page actually contains a diagram, so
 * registering the integration unconditionally is cheap:
 *
 *   integrations: [expressiveCode(...), satteriMdx(), mermaid(), ...]
 */
import type { AstroIntegration } from 'astro';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

/** Stable alias id injected on every page and resolved to the client module. */
const CLIENT_ALIAS = 'sonapraneeth:mermaid-client';

/** Marker the `remark-mermaid` transform puts on every diagram block. */
const DIAGRAM_SELECTOR = 'pre.mermaid';

export function mermaid(): AstroIntegration {
  // Absolute path (forward slashes) to the client runtime beside this module.
  const clientPath = fileURLToPath(
    new URL('./mermaid-client.ts', import.meta.url),
  ).replace(/\\/g, '/');

  // Absolute path to Mermaid's entry, resolved from *this* package. Consuming
  // sites do not depend on `mermaid`, and package managers with an isolated
  // node_modules layout (Bun, pnpm) do not hoist it to the site root — so Vite,
  // which resolves `optimizeDeps.include` from the project root, cannot find the
  // bare specifier and warns "Failed to resolve dependency: mermaid". Aliasing
  // the specifier to the resolved path fixes both the optimizer and the client's
  // lazy `import('mermaid')`, and (like CLIENT_ALIAS) behaves the same in dev
  // and build.
  const mermaidPath = createRequire(import.meta.url)
    .resolve('mermaid')
    .replace(/\\/g, '/');

  return {
    name: 'sonapraneeth-mermaid',
    hooks: {
      'astro:config:setup': ({ injectScript, updateConfig }) => {
        updateConfig({
          vite: {
            resolve: {
              alias: {
                [CLIENT_ALIAS]: clientPath,
                // Exact match only, so Mermaid's own subpath imports still
                // resolve through its `exports` map.
                mermaid: mermaidPath,
              },
            },
            // Mermaid is large and imported lazily, so Vite's dev server would
            // otherwise optimize it on-demand on first import — returning a 504
            // "needs optimization" that fails the dynamic import behind a proxy.
            // Pre-bundling it at startup makes the lazy import resolve cleanly.
            optimizeDeps: { include: ['mermaid'] },
          },
        });
        // Every page gets this one-line guard, but only pages that actually
        // contain a diagram fetch the client chunk (and, in turn, the Mermaid
        // bundle). `astro:after-swap` covers sites that enable ClientRouter,
        // where the module script is not re-evaluated on navigation.
        injectScript(
          'page',
          `const l=()=>document.querySelector(${JSON.stringify(DIAGRAM_SELECTOR)})&&import(${JSON.stringify(CLIENT_ALIAS)});l();document.addEventListener('astro:after-swap',l);`,
        );
      },
    },
  };
}

export default mermaid;
