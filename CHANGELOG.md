# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This is a monorepo; every workspace package is released together under a single
version. The headings below summarise changes across all workspaces.

## [Unreleased]

## [2.3.0] - 2026-07-26

### Added

- Native reading mode in the notes and blog engines. A floating toggle strips
  the page down to the article, hiding the env banner, sticky header, mobile tab
  bar, footer, docs sidebar, breadcrumbs, taxonomy chips, print/edit actions,
  blog hero and post footer. The on-this-page rail, reading-progress bar and
  skip link are deliberately kept. Every layout change is pure CSS behind a
  `data-reading` attribute on `<html>`, so there is no runtime cost beyond the
  toggle itself. The preference persists in `localStorage` and is re-applied
  before paint (matching the existing theme-flash preventer), so a stored choice
  never flashes the full chrome first. Only article layouts opt in, so an index
  page can never be left without navigation. (`feat(components)`)
- `book-open` and `x` entries in the shared icon set.
  (`feat(components/icons)`)

### Changed

- `ThemeSwitcher` accepts a `raised` prop and stacks above the reading-mode
  toggle, which takes the bottom-right corner slot on article pages. Production
  sites ship without the switcher, so the toggle owns that corner there either
  way. Both offsets clear the mobile bottom tab bar. (`feat(components)`)
- Prose line length is now a `--measure` custom property on the article root
  rather than a `48rem` literal repeated across the header and every text child,
  giving a single override point. Reading mode widens it to `56rem` and raises
  the container cap to `86rem`, growing the body column from 840px to 968px at
  1440px so wide tables and code blocks fit without horizontal scrolling. Note
  this does not meaningfully reduce vertical scrolling: measured on the demo
  Configuration page, height is 31% tables, 25% headings, 23% code/figures and
  only 15% paragraphs. (`feat(notes-core)`, `feat(blog-core)`)
- Bump `@sonapraneeth/components`, `@sonapraneeth/notes-core` and
  `@sonapraneeth/blog-core` a minor version. The satteri plugin, demos and apps
  are untouched by this release and keep their current versions.

## [2.2.0] - 2026-07-25

### Added

- Mermaid diagram support across the platform: a theme-aware client-side
  renderer in `@sonapraneeth/components`, a `remark-mermaid` transform in the
  satteri plugin that rewrites ```` ```mermaid ```` fences to `<pre>` elements,
  and wiring in both the notes and blog engines. (`feat(mermaid)`)
- `printSectionNumbers` config option (default `true`) toggling the notebook
  print view's automatic `chapter.section` numbering on `##`/`###`/`####`.
  (`feat(notes-core/print)`)
- In-page heading numbering for single-page print views, mapping to
  `--chapter-number` when `data-chapter` exists and falling back to raw
  numerals. (`feat(notes-core/print)`)

### Changed

- Add `mermaid` to the root catalog (`^11.16.0`). `@sonapraneeth/components`
  already declared `"mermaid": "catalog:"` but the catalog had no matching
  entry, so `bun update` failed to resolve it and mermaid was never installed —
  the lazy `import('mermaid')` in `mermaid-client.ts` would have failed at
  runtime. (`fix(deps)`)
- Upgrade catalog and root dependencies to their latest published versions:
  `astro` `^7.0.2` → `^7.1.1`, `katex` `^0.17.0` → `^0.18.0`, `pagefind`
  `^1.3.0` → `^1.5.2`, `@types/node` `^26.0.1` → `^26.1.1`, `@astrojs/mdx`
  `^7.0.2` → `^7.0.3`. (`chore(deps)`)
- Align every workspace's literal dependency range with the installed latest:
  `@astrojs/rss` `^4.0.18` → `^4.0.19` (blog-core), `@astrojs/markdown-remark`
  `^7.2.0` → `^7.2.1`, `@astrojs/mdx` `^7.0.0` → `^7.0.3`, `unist-util-visit`
  `^5.0.0` → `^5.1.0`, `@types/hast` `^3.0.4` → `^3.0.5` (satteri).
  (`chore(deps)`)
- Raise the satteri plugin's `astro` peer range `^7.0.0` → `^7.1.1` to match
  the version every workspace now resolves. (`chore(deps)`)
- Bump every workspace package a minor version to release the Mermaid support
  and dependency refresh together.

### Fixed

- KaTeX stylesheet is now loaded via a global side-effect import
  (`import 'katex/dist/katex.min.css'`) instead of a `?url` import plus a
  conditional `<link>`, which `astro dev` served as a JavaScript module — the
  stylesheet never applied and math rendered twice (e.g. `O(n)O(n)`).
  (`fix(astro/katex)`)
- Tables in the notebook print view rendered without borders: the print route
  uses `BaseLayout` (not `DocLayout`) and never inherited its table styles.
  (`fix(notes-core/print)`)
- Dev server no longer aborts on a stale lock file. (`fix(scripts)`)

### Notes

- Held `typescript` at `^6.0.3` again. TypeScript 7 (7.0.2) is available but
  crashes `astro check` via `@astrojs/check` / `@volar/kit`
  (`Cannot read properties of undefined (reading 'useCaseSensitiveFileNames')`).
  Revisit once the Astro language server supports TS 7.
- Docker base images were checked and are already current:
  `oven/bun:1.3.14-alpine` and `caddy:2.11-alpine`.
- `app/package.json` is an orphaned copy of `app/notes/go/package.json`; it
  matches no `workspaces` glob and is not part of the install graph. Its
  dependency ranges were refreshed for consistency but its `version` was left
  untouched. It should probably be deleted.

## [2.1.1] - 2026-07-08

### Changed

- Upgrade the Expressive Code catalog dependencies `astro-expressive-code` and
  `@expressive-code/plugin-line-numbers` `^0.43.1` → `^0.44.0`. Verified against
  `astro check` across all sites (0 errors). (`chore(deps)`)

### Notes

- Held `typescript` at `^6.0.3`: TypeScript 7 (the native compiler) is not yet
  supported by `@astrojs/check` / the Astro language server, which crashes on
  `astro check` (`Cannot read properties of undefined (reading 'fileExists')`).
  Revisit once the Astro tooling adds TS 7 support.

## [2.1.0] - 2026-07-08

### Changed

- Bump catalog and root dependencies within their existing semver ranges:
  `astro` `^7.0.2` → `^7.0.7`, `@types/node` `^26.0.1` → `^26.1.1`,
  `@astrojs/rss` `^4.0.18` → `^4.0.19`, `@astrojs/markdown-remark` `^7.2.0` →
  `^7.2.1`, `@astrojs/mdx` `^7.0.0` → `^7.0.2`. (`chore(deps)`)
- Point the default Bun install registry at the Microsoft CFS proxy
  (`https://packagefeedproxy.microsoft.io/npm/`) in `bunfig.toml`, required on
  Microsoft-managed devices where direct `registry.npmjs.org` access is blocked.
  (`chore(build)`)
- Bump every workspace package a minor version to release the dependency
  refresh together.

### Added

- Root `README.md` documenting the package-registry configuration and how to
  switch back to the public registry on non-Microsoft devices. (`docs`)

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

[Unreleased]: https://github.com/sonapraneeth-akula-dev/packages_astro/compare/v2.3.0...HEAD
[2.3.0]: https://github.com/sonapraneeth-akula-dev/packages_astro/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/sonapraneeth-akula-dev/packages_astro/compare/v2.1.1...v2.2.0
[2.0.0]: https://github.com/sonapraneeth-akula-dev/packages_astro/compare/v1.1.0...v2.0.0
