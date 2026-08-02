# Changelog

All notable changes to `@sonapraneeth/notes-core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.20.0] - 2026-08-02

### Added

- Show the RSS feed in desktop navigation, mobile navigation and footer links
  whenever RSS discovery is enabled. Custom RSS nav entries are preserved and
  disabling RSS removes the link automatically.

## [2.19.0] - 2026-08-02

### Added

- Generate `robots.txt`, `rss.xml`, `sitemap.xml`, `sitemap-index.xml` and
  sitemap shards by default for every notes-core consumer. The RSS feed lists
  visible, non-draft notes and page metadata advertises the feed.
- Add `discovery` config to disable any endpoint and independently include or
  exclude route prefixes from RSS and sitemap output. Robots may index always,
  never or production builds only; the default is production only.

## [2.18.0] - 2026-08-02

### Fixed

- KaTeX superscripts and subscripts retain the adjusted script size in print,
  preventing the PDF renderer from overriding the on-screen typography.

## [2.17.0] - 2026-07-30

### Changed

- `pre.mermaid > svg` no longer forces `max-width: none`, so a diagram renders
  at its natural size, centred, and is scaled down only when it is wider than
  the content column.

### Fixed

- Mermaid class diagrams are no longer laid out roughly ten times too large for
  readers who prefer reduced motion. The `prefers-reduced-motion` reset applied
  `transition-duration: 0.01ms` to every element — non-zero on purpose so that
  `transitionend` still fires — and Chromium transitions SVG geometry
  presentation attributes. Mermaid sizes a `<foreignObject>` and calls
  `getBBox()` immediately afterwards, so it measured the pre-transition value
  and produced a 2326x2326 box in place of a 242x172 one, scaling the whole
  diagram down to an unreadable 0.14. Transitions are now a true zero inside
  SVG, where there is nothing to animate.

## [2.16.0] - 2026-07-28

### Changed

- `defineDocsAstroConfig` now accepts `themeSwitcher?: boolean` (default
  `false`) so demo sites can opt into the full runtime theme-preview panel,
  while production sites keep palette/fonts/radius fixed by config.
- Theme-switcher rendering in the base layout is gated by a build-time
  constant (`__THEME_SWITCHER__`) and dynamically imported only when enabled.

## [2.15.0] - 2026-07-27

### Changed

- Doc pages lay out as a single named-area grid, so the on-this-page rail
  starts level with the title instead of below the whole header block. Named
  areas rather than source order mean the rail reflows to a card *below* the
  title, never above it, once the layout collapses to one column.
- The breadcrumb trail is pinned flush under the site header, so the route back
  up the tree stays reachable without scrolling to the top of the note. It is
  kept to a single line that scrolls sideways rather than wrapping, so its
  height stays fixed.
- Sticky offsets are named CSS tokens (`--header-height`, `--sticky-top`,
  `--crumbs-height`, `--rail-top`) instead of a `5.5rem` literal repeated
  across the sidebar, the rail and anchor offsets.

### Fixed

- The sidebar's Browse links stay pinned to the bottom while only the tree
  scrolls. The scroll region was missing `min-height: 0`, so a tall tree
  overflowed the panel and pushed Browse off-screen instead of scrolling.
- The sidebar panel stays pinned for the length of the article. It previously
  sat at its content height, so a short tree stopped travelling partway down a
  long page.
- Scrolling to the end of the sidebar tree no longer chains to the page, and
  the tree no longer shifts sideways when its scrollbar appears.
- Anchor jumps land just below the pinned chrome. `scroll-padding-top` on the
  scrollport and `scroll-margin-top` on the target both applied, so headings
  landed roughly twice as far down as intended.

## [2.14.0] - 2026-07-27

### Changed

- Sidebar route generation indexes each shared tree once for breadcrumbs and
  previous/next navigation instead of traversing the full tree per page.
- Shared Pagefind hidden-carrier styles and taxonomy transitions are smaller
  and limited to the properties that actually change.
- The default numbering directory now matches the default docs collection
  directory, while sites with custom collection bases pass them explicitly.

### Fixed

- Docs collection IDs and numbered reference URLs now use the same shared
  generator, including normalized filenames, nested index pages, and custom
  slugs.
- Missing numbering directories stop configuration with an actionable error
  instead of silently removing all reference numbers.

### Removed

- Unused folder-label state that was assigned during sidebar construction but
  never read.

## [2.13.0] - 2026-07-27

### Added

- `printInNotebook` frontmatter field (boolean, defaults to `true`) on note
  pages. Set `printInNotebook: false` to keep a page on the site and in the
  sidebar but leave it out of the whole-notebook print view
  (`/print/<notebook>`), so screen-only pages such as changelogs or link indexes
  don't end up in the PDF. Chapter numbering in the printed book skips excluded
  pages.
- An empty-book notice on the print route. When every page of a notebook opts
  out, the route no longer opens an empty print dialog; it shows a modal
  explaining that all pages set `printInNotebook: false` and how to undo it.

## [2.12.0] - 2026-07-26

### Added

- Notebook-scoped taxonomy pages, injected only in notebooks mode:
  `/<notebook>/tags`, `/<notebook>/tags/<tag>`, `/<notebook>/categories` and
  `/<notebook>/categories/<category>`. They count only the notes in that
  notebook and link across to the site-wide listing, which is unchanged.
- `docsInNotebook(docs, notebookId)` in the taxonomy helpers, filtering a note
  set to a single notebook by its top-level folder id.
- `tagBase` and `categoryBase` props on `DocLayout`, so a note's taxonomy chips
  link to its own notebook's listings. Both fall back to `/tags` and
  `/categories` outside notebooks mode.
- A Browse block at the end of `DocsSidebar`, linking the tag and category
  indexes for the current scope. Until now the listings were reachable only
  through a note's own chips.
- A Notes list on every taxonomy index, site-wide and notebook-scoped alike.
  The tag cloud and category grid answer "which terms exist"; the list answers
  "which note holds which term", showing each note with chips for the terms it
  declares. Notes with no tag (or no category) are omitted from the respective
  list.

### Changed

- Tags and categories are labelled with their own icon, on the doc-page chips,
  the tag cloud, the category cards, the listing headings and the sidebar
  Browse links. Tags previously used a bare `#` prefix and categories had no
  marker at all.
- Taxonomy pills take their corner radius from `var(--radius)` instead of a
  hard-coded `999px`, so they follow the site's `theme.radius`.

## [2.11.0] - 2026-07-26

### Added

- Reading mode on doc pages. A floating toggle hides the site chrome and the
  nav sidebar, along with the breadcrumbs, taxonomy chips and print/edit
  actions, leaving the article, its on-this-page rail and the reading-progress
  bar. `DocLayout` opts in through the new `readingMode` prop on `BaseLayout`,
  which also emits the pre-paint script that restores a stored preference.
  Index and listing pages do not opt in, since stripping their chrome would
  leave no navigation.

### Changed

- Prose line length moves to a `--measure` custom property on `.doc`, replacing
  the `48rem` literal repeated on `.doc-head` and the `.doc-body` text children.
  Reading mode widens it to `56rem`.
- The reading-mode container cap is `86rem`, so the body column can hold the
  wider measure alongside the 16-18rem on-this-page rail. At 1440px the column
  grows from 840px to 968px.
- The on-this-page rail keeps its normal layout and breakpoints in reading mode
  (sticky right rail, collapsing above the content at 75rem). Only its sticky
  offset changes, 5.5rem to 1.5rem, since there is no header left to clear.

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
