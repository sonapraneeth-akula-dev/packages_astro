# Changelog

All notable changes to `@sonapraneeth/blog-core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.0] - 2026-07-27

### Changed

- The on-this-page rail is bound to the viewport so the shared "Back to top"
  control pins to the bottom of the rail while the heading list scrolls.
- Sticky offsets are named CSS tokens (`--header-height`, `--sticky-top`)
  instead of a `5.5rem` literal repeated across the rail and anchor offsets.

### Fixed

- Anchor jumps land just below the header. `scroll-padding-top` on the
  scrollport and `scroll-margin-top` on each heading both applied, so clicking
  an on-this-page link cleared the header twice and left roughly two
  header-heights of blank space above the target.

## [2.7.0] - 2026-07-27

### Changed

- Numbering accepts the site's content directory and generates references under
  the `/blog` route prefix.
- Shared Pagefind hidden-carrier styles and taxonomy transitions are smaller
  and limited to the properties that actually change.

### Fixed

- Blog collection IDs and numbered reference URLs now use the same shared
  generator, including normalized filenames and custom slugs.
- Post-card descriptions include the standard `line-clamp` property alongside
  the WebKit fallback.
- Math frontmatter documentation now accurately states that KaTeX CSS is loaded
  on every post and the compatibility flag does not currently gate it.

## [2.6.0] - 2026-07-26

### Added

- A Posts list on the `/tags` and `/categories` indexes, matching the notes
  engine. The cloud and grid answer "which terms exist"; the list answers
  "which post holds which term", reusing `PostRow` so each post shows the
  category and tags it declares. Posts with no tag are omitted from the tags
  index.

### Changed

- Chips, cloud pills and count badges take their corner radius from
  `var(--radius)` instead of a hard-coded `999px`, so they follow the site's
  `theme.radius`.

## [2.5.0] - 2026-07-26

### Added

- Reading mode on post pages. A floating toggle hides the site chrome along
  with the breadcrumbs, tag chips, print action, hero image and post footer,
  leaving the article, its on-this-page rail and the reading-progress bar.
  `BlogPost` opts in through the new `readingMode` prop on `BaseLayout`, which
  also emits the pre-paint script that restores a stored preference. Index and
  listing pages do not opt in, since stripping their chrome would leave no
  navigation.

### Changed

- Prose line length moves to a `--measure` custom property on `.post`,
  replacing the `48rem` literal repeated on `.post-head` and the `.post-body`
  text children. Reading mode widens it to `56rem`.
- The reading-mode container cap is `86rem`, so the body column can hold the
  wider measure alongside the 16-18rem on-this-page rail.
- The on-this-page rail keeps its normal layout and breakpoints in reading mode
  (sticky right rail, collapsing above the content at 60rem). Only its sticky
  offset changes, 5.5rem to 1.5rem, since there is no header left to clear.

## [2.4.0] - 2026-07-25

### Added

- Mermaid diagram rendering in the blog engine, via the theme-aware renderer in
  `@sonapraneeth/components` and the `remark-mermaid` transform in the satteri
  plugin.

### Changed

- Upgrade catalog dependencies to their latest published versions: `astro`
  `^7.0.2` → `^7.1.1`, `katex` `^0.17.0` → `^0.18.0`. KaTeX rendering was
  verified in the browser (0 `.katex-error` nodes) after the upgrade.
- Bump the direct `@astrojs/rss` range `^4.0.18` → `^4.0.19`.

## [2.3.0] - 2026-07-22

### Changed

- KaTeX stylesheet is now loaded via a global side-effect import
  (`import 'katex/dist/katex.min.css'`) in the post layout, instead of a
  per-post conditional `<link>` built from a `?url` import. This loads the
  (small, cached) stylesheet on every post but behaves identically in dev and
  prod. See [docs/math-rendering.md](docs/math-rendering.md).

### Fixed

- Doubled math rendering (e.g. `O(n)O(n)`) on posts with LaTeX. In `astro dev`
  the previous `?url` + `<link rel="stylesheet">` approach was served as a
  JavaScript module, so the stylesheet never applied and KaTeX's hidden MathML
  layer rendered alongside the visible HTML layer.

### Removed

- The `needsKatex` computation and body `$`-scan in the post layout, now
  redundant with the global import. The `math` frontmatter flag is retained in
  the schema for backwards compatibility but no longer gates CSS loading.

### Added

- `docs/math-rendering.md` documenting the two KaTeX-loading approaches
  (global vs. conditional) and the rationale for choosing the global import.
