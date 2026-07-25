# Changelog

All notable changes to `@sonapraneeth/blog-core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
