# Changelog

All notable changes to `@sonapraneeth/notes-core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.10.0] - 2026-07-25

### Added

- Mermaid diagram rendering in the docs engine, via the theme-aware renderer in
  `@sonapraneeth/components` and the `remark-mermaid` transform in the satteri
  plugin.

### Changed

- Upgrade catalog dependencies to their latest published versions: `astro`
  `^7.0.2` → `^7.1.1`, `katex` `^0.17.0` → `^0.18.0`. KaTeX rendering was
  verified in the browser (0 `.katex-error` nodes) after the upgrade.
- `mermaid` is now a resolvable catalog entry (`^11.16.0`); it was previously
  referenced as `catalog:` with no matching catalog definition.

## [2.9.0] - 2026-07-24

### Added

- In-page heading numbering for single-page print views (triggered on heading tags `##`/`###`/`####`), mapping with `--chapter-number` if data-chapter exists or falling back to raw numerals with trailing periods (e.g., `1.`).

## [2.8.0] - 2026-07-24

### Added

- `printSectionNumbers` config option (default `true`) that toggles the notebook
  print view's automatic in-page section numbering (chapter.section on
  `##`/`###`/`####`). Set `false` for notebooks whose headings carry their own
  numbering. Implemented via a `.number-sections` class on the print view.

### Fixed

- Tables in the notebook print view rendered without borders: the print route
  uses `BaseLayout` (not `DocLayout`) and so never inherited its table styles.
  The bordered table styling is now restated in the print route.

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
