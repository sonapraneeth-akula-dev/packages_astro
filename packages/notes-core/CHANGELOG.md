# Changelog

All notable changes to `@sonapraneeth/notes-core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.7.0] - 2026-07-22

### Changed

- KaTeX stylesheet is now loaded via a global side-effect import
  (`import 'katex/dist/katex.min.css'`) in the doc layout and the notebook print
  route, instead of a per-page conditional `<link>` built from a `?url` import.
  This loads the (small, cached) stylesheet on every content page but behaves
  identically in dev and prod. See [docs/math-rendering.md](docs/math-rendering.md).

### Fixed

- Doubled math rendering (e.g. `O(n)O(n)`) on pages with LaTeX. In `astro dev`
  the previous `?url` + `<link rel="stylesheet">` approach was served as a
  JavaScript module, so the stylesheet never applied and KaTeX's hidden MathML
  layer rendered alongside the visible HTML layer.

### Removed

- The `needsKatex` prop/plumbing (route → layout) and the body `$`-scan, now
  redundant with the global import. The `math` frontmatter flag is retained in
  the schema for backwards compatibility but no longer gates CSS loading.

### Added

- `docs/math-rendering.md` documenting the two KaTeX-loading approaches
  (global vs. conditional) and the rationale for choosing the global import.
