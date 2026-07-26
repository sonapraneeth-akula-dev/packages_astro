# Changelog

All notable changes to `@sonapraneeth/components` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries before 2.5.0 were reconstructed from the commit history, since this
package previously recorded its changes only in the repository-level
[CHANGELOG.md](../../CHANGELOG.md).

## [2.5.0] - 2026-07-26

### Added

- `ReadingMode.astro`: a floating toggle that strips the page down to the
  article. It flips a `data-reading` attribute on `<html>` and mirrors the
  choice to `localStorage`; all layout changes are pure CSS in the consuming
  engines, so the component ships no styling of its own beyond the button.
- `book-open` and `x` entries in the curated icon set.
- `Figure` as a numbered block type in the numbering module.
- Numbered figure captions and click-to-enlarge on `DocImage`.

### Changed

- `ThemeSwitcher` accepts a `raised` prop that lifts the panel clear of the
  reading-mode toggle, which takes the bottom-right corner slot on article
  pages. Both offsets clear the mobile bottom tab bar.

## [2.4.0] - 2026-07-25

### Added

- Theme-aware Mermaid renderer (`mermaid.ts`, `mermaid-client.ts`), lazily
  importing `mermaid` so it costs nothing on pages without diagrams.

### Changed

- Upgrade dependencies: `astro` `^7.0.2` → `^7.1.1`, `katex` `^0.17.0` →
  `^0.18.0`. `mermaid` became a resolvable catalog entry (`^11.16.0`); it was
  previously referenced as `catalog:` with no matching definition, so it was
  never actually installed.

## [2.3.1] - 2026-07-08

### Changed

- Upgrade Expressive Code to `0.44.0`.

## [2.3.0] - 2026-07-08

### Changed

- Upgrade shared dependencies to their latest published versions.

## [2.2.1] - 2026-07-06

### Fixed

- The PWA service worker now precaches the Pagefind index, so search works
  offline rather than failing on the first query.

## [2.2.0] - 2026-07-06

### Added

- Opt-in incremental background precache in the PWA module, warming the cache
  after load instead of blocking install on a full precache.

## [2.1.0] - 2026-07-05

### Added

- Shared numbered blocks (the numbering module), previously notes-only, now
  usable by the blog engine.
- Caption-alignment configuration, shared across both engines.

## [2.0.0] - 2026-06-25

### Changed

- **BREAKING**: Upgrade to Astro 7. Consumers must upgrade in step.

## [1.6.0] - 2026-06-21

### Added

- Per-span script fonts in the theme system.

## [1.5.0] - 2026-06-21

### Fixed

- Search excerpt highlights are tightened to the matched word instead of
  spilling across the surrounding phrase.

## [1.4.0] - 2026-06-21

### Added

- Search: date sorting, result metadata, field weighting and term highlighting.

## [1.3.0] - 2026-06-21

### Added

- Search: faceted filter chips, alias support and punctuation indexing.

## [1.2.0] - 2026-06-18

### Changed

- Shared dependency versions are centralized in a Bun catalog rather than
  repeated per workspace.

## [1.1.0] - 2026-06-18

### Added

- Opt-in, dependency-free PWA module (manifest, service worker, install prompt).
- `Annotation`: a marker-highlight sticky note component.
- Navigation icons in the desktop header.

### Changed

- Upgrade `astro` `6.4.7` → `6.4.8` and `chokidar` to `5.0.0`.

### Fixed

- Marker legibility in dark mode for `Annotation`.
- Content images no longer carry rounded corners.

## [1.0.0] - 2026-06-15

### Changed

- **BREAKING**: Package scope renamed from `@grihasetu/components` to
  `@sonapraneeth/components`.

## [0.1.0] - 2026-06-13

### Added

- Initial extraction of the shared UI into its own package: `Header`, `Footer`,
  `Icon`, `Badge`, `Callout`, `ScreenSizeIndicator`, `DocImage`/`MdImage` and
  the centralized MDX component map.
- Config-driven theme system and the opt-in live theme switcher.

### Changed

- Defer the screen-size indicator's initial layout read past first paint, so
  the synchronous `getComputedStyle` call no longer forces a reflow during the
  critical load window.

### Fixed

- Raise `Badge` and `Callout` text contrast to meet WCAG AA.
