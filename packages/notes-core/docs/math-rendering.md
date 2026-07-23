# Math rendering (KaTeX)

LaTeX math in notes is parsed by `remark-math` and rendered to HTML at build
time by `rehype-katex` (configured in the `satteri` plugin). KaTeX emits **two**
layers for every expression:

- a visible `.katex-html` layer (the actual glyphs), and
- a hidden `.katex-mathml` layer (a `<math>…</math>` element, kept only for
  screen readers / accessibility).

The `katex.min.css` stylesheet is what visually **hides** the `.katex-mathml`
layer (via a `clip` rect). **If that stylesheet is not applied, both layers
render** and every expression shows up twice, e.g. `O(n)O(n)`.

So the only real question is: *how do we make sure `katex.min.css` is applied on
pages that contain math?* There are two viable approaches.

## Approach 1 — Global side-effect import (current)

Import the stylesheet as a side effect in the content layout(s):

```astro
// DocLayout.astro / print/[notebook].astro / (blog) BlogPost.astro
import 'katex/dist/katex.min.css';
```

Vite/Astro then handle it correctly in **both** environments:

- **dev** (`astro dev`) — Vite injects a `<style>` tag at runtime.
- **prod** (`astro build`) — the CSS is bundled and linked as a real, hashed
  `/_astro/katex.[hash].css` file served as `text/css`.

**Pros**

- One line; no edge cases; identical behaviour in dev and prod.
- No per-page frontmatter flag, no body scanning, no plumbing.

**Cons**

- The stylesheet is loaded on **every** content page (doc / post / print),
  including pages with no math. It is small (~23 KB raw, ~6 KB gzipped) and
  cached after the first request, but it is not strictly "pay for what you use".

## Approach 2 — Conditional load (previous)

Load the stylesheet only when a page actually contains math:

```astro
import katexHref from 'katex/dist/katex.min.css?url';
// needsKatex = frontmatter `math: true` OR an unescaped `$` in the body
{needsKatex && <link rel="stylesheet" href={katexHref} />}
```

**Pros**

- Pages without math ship zero KaTeX CSS.

**Cons**

- **Broken in dev.** With `?url`, the dev server serves the asset as a
  JavaScript module (`content-type: text/javascript`), so a
  `<link rel="stylesheet">` pointing at it never applies — the doubling bug.
  It only produces a real `.css` file in a production build.
- More moving parts: a `math` frontmatter field, a body-scan regex, a
  `needsKatex` prop threaded through the route → layout, and per-route
  duplication (doc route, print route, blog post).

## Decision

**We are using Approach 1.** Correctness and simplicity win: math must render the
same in dev and prod, and Approach 2's dev breakage is a recurring foot-gun (it
is what produced the `O(n)O(n)` doubling). Math is also common across the
notebooks that use this engine, so the "only load on math pages" optimisation of
Approach 2 buys little in practice.

### When we might revisit

We will measure the page-load impact of shipping `katex.min.css` on every
content page (e.g. Lighthouse / Unlighthouse, or the network panel). If the
extra stylesheet meaningfully hurts load times on math-free pages, we can move
to a **fixed** version of Approach 2 — for example, a small `KatexStyles.astro`
component that does the side-effect `import 'katex/dist/katex.min.css'` and is
rendered only when `needsKatex` is true (a side-effect import works in dev,
unlike the `?url` + `<link>` pattern). Until then, keep it simple.
