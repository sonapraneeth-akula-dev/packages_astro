# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This is a monorepo; every workspace package is released together under a single
version. The headings below summarise changes across all workspaces.

## [Unreleased]

## [2.0.0] - 2026-06-25

### Changed

- **BREAKING:** Upgrade Astro from v6 to v7 across the catalog (`astro` `^6.4.8`
  → `^7.0.2`). Astro 7 ships Vite 8 (Rolldown bundler), a Rust `.astro`
  compiler, Sätteri as the default Markdown pipeline, and queued rendering by
  default. The engines pin `compressHTML: true` and an explicit
  `processor: unified()` (`@astrojs/markdown-remark`), so the Markdown/KaTeX
  pipeline and whitespace behaviour are preserved. (`refactor(deps)`)
- **BREAKING:** Bump every workspace package to `2.0.0` to reflect the Astro 7
  major upgrade.
- Upgrade `@astrojs/mdx` `^6.0.3` → `^7.0.0` and raise the satteri plugin's
  `astro` peer range to `^7.0.0`.
- Bump catalog dependencies: `@types/node` `^25.9.3` → `^26.0.1`,
  `katex` `^0.16.22` → `^0.17.0`; `@astrojs/rss` `^4.0.12` → `^4.0.18`.
- Upgrade the Caddy reverse-proxy image `caddy:2.10-alpine` → `caddy:2.11-alpine`
  in the blog and notes deployment compose files.
- Centralize shared dependency versions with a Bun catalog. (`refactor(deps)`)

### Added

- LaTeX math support via KaTeX in the satteri Markdown pipeline. (`feat(satteri)`)
- Search: date sort, result metadata, weighting and term highlighting, plus
  faceted filter chips, aliases and punctuation indexing. (`feat(search)`)
- Tags/categories taxonomy and a blog `archived` flag, and a `published` date
  field on notes. (`feat(notes-core)`)
- Per-span script fonts in the theme system. (`feat(components/theme)`)
- Shared, parameterized site scripts. (`feat(scripts)`)

### Fixed

- Annotate `getCollection` callbacks to satisfy `noImplicitAny`.
  (`fix(blog-core)`)
- Tighten search excerpt highlights to the matched word. (`fix(search)`)

[Unreleased]: https://github.com/sonapraneeth-akula-dev/packages_astro/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/sonapraneeth-akula-dev/packages_astro/compare/v1.1.0...v2.0.0
