# Lighthouse Audit Report — Demo Blog

**Project:** `@sonapraneeth/blog-demo` (`demo/blog`)
**Audited URL:** `http://localhost:4312/` (production build via `astro preview`)
**Tool:** Unlighthouse CI (`unlighthouse-ci`) + bundled `lighthouse-audit.ts`
**Mode:** Light · Desktop · throttle off · 3 samples/page averaged
**Date:** 2026-06-14
**Routes scanned:** 19 (crawler mode) · **Scan time:** 170–182 s

## Result: PASS

All 19 routes meet every category threshold. Unlighthouse score assertions
passed and the validation budget reported **no failures**.

This run reflects three follow-up fixes (see [Improvements applied](#improvements-applied))
that lifted **Accessibility to a clean 100 on every route** and removed all
render-blocking CSS, raising the performance floor.

| Category | Threshold | Before | After | Status |
|---|---|---|---|---|
| Performance | ≥ 65 | 90–94 (avg 93) | 92–96 (avg 95) | PASS |
| Accessibility | ≥ 95 | 96–100 (avg 98) | **100 on all routes** | PASS |
| Best Practices | ≥ 95 | 100 | 100 | PASS |
| SEO | ≥ 90 | 100 | 100 | PASS |

**Aggregate (averaged across all routes):** Performance 95 · Accessibility 100 ·
Best Practices 100 · SEO 100 · Overall 99.

## Per-page scores (post-fix)

| Route | Perf | A11y | BP | SEO |
|---|---:|---:|---:|---:|
| `/` | 95 | 100 | 100 | 100 |
| `/blog/dark-mode-no-flash` | 96 | 100 | 100 | 100 |
| `/blog/offline-search-pagefind` | 92 | 100 | 100 | 100 |
| `/blog/performance-budget` | 96 | 100 | 100 | 100 |
| `/blog/route-injection-engine` | 93 | 100 | 100 | 100 |
| `/blog/typography-long-form` | 95 | 100 | 100 | 100 |
| `/categories` | 96 | 100 | 100 | 100 |
| `/categories/design` | 95 | 100 | 100 | 100 |
| `/categories/engineering` | 95 | 100 | 100 | 100 |
| `/search` | 93 | 100 | 100 | 100 |
| `/tags` | 96 | 100 | 100 | 100 |
| `/tags/accessibility` | 95 | 100 | 100 | 100 |
| `/tags/architecture` | 96 | 100 | 100 | 100 |
| `/tags/astro` | 95 | 100 | 100 | 100 |
| `/tags/design` | 95 | 100 | 100 | 100 |
| `/tags/dx` | 95 | 100 | 100 | 100 |
| `/tags/pagefind` | 96 | 100 | 100 | 100 |
| `/tags/performance` | 95 | 100 | 100 | 100 |
| `/tags/search` | 95 | 100 | 100 | 100 |

## Core Web Vitals (per-page, averaged)

| Route | LCP | FCP | CLS | TBT |
|---|---|---|---:|---|
| `/` | 1.5 s | 1.2 s | ~0.000 | 0 ms |
| `/blog/dark-mode-no-flash` | 1.5 s | 1.2 s | ~0.000 | 0 ms |
| `/blog/offline-search-pagefind` | 1.5 s | 1.2 s | ~0.000 | 0 ms |
| `/blog/performance-budget` | 1.5 s | 1.2 s | ~0.000 | 0 ms |
| `/blog/route-injection-engine` | 1.5 s | 1.4 s | ~0.000 | 0 ms |
| `/blog/typography-long-form` | 1.5 s | 1.2 s | ~0.000 | 0 ms |
| `/categories` | 1.4 s | 1.1 s | ~0.000 | 0 ms |
| `/categories/design` | 1.4 s | 1.1 s | ~0.000 | 0 ms |
| `/categories/engineering` | 1.4 s | 1.1 s | ~0.000 | 0 ms |
| `/search` | 1.6 s | 1.2 s | ~0.000 | 0 ms |
| `/tags` (+ all tag pages) | 1.4 s | 1.1 s | ~0.000 | 0 ms |

**Site-level metric averages:** LCP 1.42 s · FCP 1.13 s · CLS 0.0002 · TBT 0 ms ·
TTI 1.42 s · Max Potential FID 16 ms.

## Improvements applied

Three root-cause fixes were made in the shared `packages/` engine (not the demo
site), so every blog built on `blog-core`/`components` inherits them.

### 1. Accessibility — colour contrast (96–98 → 100)
**Symptom:** `color-contrast` failed on all four blog-post pages. The amber
caution/warning callout heading rendered `#f59e0b` on `#fef8ee` = **2.03:1**,
below the 4.5:1 AA minimum.
**Fix:** [packages/components/src/Callout.astro](packages/components/src/Callout.astro) —
`.callout-head` colour now blends the accent toward the body text with
`color-mix(in srgb, var(--c) 50%, var(--text))`, and a new
`.callout-head svg { color: var(--c) }` rule keeps the icon at full accent
saturation (icons are contrast-exempt). Heading text now clears 4.5:1 in every
callout variant while staying visually on-brand.

### 2. Accessibility — heading order (98 → 100)
**Symptom:** `heading-order` failed on all category/tag listing pages. The page
`<h1>` was followed directly by `PostRow` titles rendered as `<h3>`, skipping
`<h2>`.
**Fix:** [packages/blog-core/src/components/PostRow.astro](packages/blog-core/src/components/PostRow.astro) —
added a `headingLevel?: 2 | 3 | 4` prop (default 3, preserving the home feed's
`h1 → h2 → h3` structure). Taxonomy routes
([tags/[tag].astro](packages/blog-core/src/routes/tags/%5Btag%5D.astro),
[categories/[category].astro](packages/blog-core/src/routes/categories/%5Bcategory%5D.astro))
now pass `headingLevel={2}`. `.row-title` still controls font-size, so there is
**no visual change** — only the semantic level.

### 3. Performance — render-blocking CSS & forced reflow (avg 93 → 95)
**Symptom:** three external CSS `<link>`s (`_..CbNkVFrE.css`,
`BaseLayout.*.css`, `Code.*.css`, ~7.8 KB / ~307 ms) blocked first paint, and a
synchronous `getComputedStyle` read forced a ~308 ms reflow on every page.
**Fixes:**
- [packages/blog-core/src/astro-config.ts](packages/blog-core/src/astro-config.ts) —
  `build.inlineStylesheets: 'always'` inlines critical CSS, **eliminating all
  render-blocking requests** (the render-blocking audit now reports zero items).
- [packages/components/src/ScreenSizeIndicator.astro](packages/components/src/ScreenSizeIndicator.astro) —
  the initial measurement is now deferred with `requestAnimationFrame(update)`
  instead of running synchronously on load, so the layout read no longer forces
  a reflow inside the critical load window.

## Remaining notes

### Strengths
- **Accessibility, Best Practices and SEO are all 100 on every route** — clean
  console, correct meta/canonical/lang, valid heading hierarchy, AA contrast.
- **Excellent Core Web Vitals.** CLS is effectively zero (≈0.0002), TBT is 0 ms,
  and FCP/LCP sit comfortably in Lighthouse's "good" band. This reflects the
  static Astro output, self-hosted preloaded fonts and metric-matched fallbacks.
- **No JavaScript main-thread blocking** — TBT 0 ms across the board, consistent
  with a near-zero-JS static site.

### Why performance plateaus at ~95 (not 100)
Performance averages **94.9 (92–96)** and fluctuates ±2 between samples. The
remaining deductions come from `first-contentful-paint`/`largest-contentful-paint`
(~0.85–0.91 score) and `speed-index`, which are dominated by the localhost
TTFB + single critical font in the LCP chain — largely fixed costs that don't
respond to further code changes. Pushing to a **stable** 100 is not realistic
for this setup; the render-blocking and reflow opportunities (the only
actionable items) have already been resolved.

### Tooling / configuration observations
3. **Missing `robots.txt`.** Unlighthouse warned the site has no `robots.txt`.
   `demo/blog/public/` contains only `favicon.svg` (the production
   `app/blog` ships one, the demo does not). Adding
   `demo/blog/public/robots.txt` would clear the warning and let crawlers
   discover the sitemap.
4. **Sitemap not auto-discovered.** Astro emits `sitemap-index.xml` +
   `sitemap-0.xml`, but Unlighthouse probes `/sitemap.xml`, didn't find it, and
   **fell back to crawler mode**. Crawling still found all 19 routes, but a
   `robots.txt` pointing at `sitemap-index.xml` (or a `/sitemap.xml` alias)
   would enable sitemap-driven discovery and is better SEO hygiene.

## Recommendations
- Add `demo/blog/public/robots.txt` referencing the generated sitemap to clear
  the Unlighthouse warning and improve crawlability.
- Accessibility now passes at 100 on all routes (colour-contrast and
  heading-order fixed in `blog-core`/`components`); no further a11y work is
  needed for the current content.
- Performance is already at its practical ceiling (~95). Don't lower thresholds;
  treat the remaining FCP/LCP/speed-index gap as expected localhost cost.
- Keep auditing the **production build** (`build:demo:blog` + `preview:demo:blog`)
  — dev-mode scores are unreliable. Thresholds were not lowered for this run.

## How to reproduce

```powershell
# 1. Build the production output (+ Pagefind index)
bun run build:demo:blog

# 2. Start the preview server (port 4312)
bun run preview:demo:blog

# 3. Run the audit from the demo blog root
cd demo/blog
$env:UNLIGHTHOUSE_CONFIG = "unlighthouse.config.ts"
node "<skill>/lighthouse-audit/scripts/lighthouse-audit.ts" --ci
```

**Artifacts**

- CI scores + metrics: `demo/blog/.unlighthouse/ci-result.json`
- Per-route HTML/JSON reports: `demo/blog/.unlighthouse/reports/`
- Audit config: `demo/blog/unlighthouse.config.ts`

> Note on tooling: the bundled `lighthouse-audit.ts` validator expects a flat
> `ci-result.json` array, whereas Unlighthouse's `jsonExpanded` reporter writes
> a `{ summary, routes, metadata }` object. Unlighthouse's own budget assertion
> (which passed) is the authoritative gate; the score tables above were derived
> directly from `routes[].categories` in that report.
