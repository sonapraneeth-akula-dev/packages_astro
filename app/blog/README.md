# Grihasetu Blog

A fast, accessible blog built with **Astro + MDX**, following the
[Lighthouse Optimization Playbook](../homepage/docs/lighthouse-optimization-playbook.md).

## Features

- **Editorial home feed** — latest post as a hero, the next three as cards, the
  rest as compact rows, with **pagination**.
- **Categories** (one per post) and **tags** (many per post) with index pages and
  a frequency-scaled tag cloud.
- **Per-post table of contents** with scroll-spy and a reading-progress bar.
- **Offline, client-side search** powered by [Pagefind](https://pagefind.app)
  (indexed at build time, no server round-trips).
- **Rich MDX code blocks** via Expressive Code: language detection, line numbers,
  line/range highlighting, diffs, copy button and dual light/dark themes.
- **Synced code tabs** — choose a tab in one group and every group sharing the
  same `syncKey` follows (and the choice is remembered).
- **Custom MDX components** — `Callout`, `Tabs`/`TabItem` are auto-injected; add
  your own in `src/components/mdx.ts`.
- Self-hosted fonts, light/dark/system theming, sitemap, RSS feed and SEO meta.

## Develop

```sh
bun install
bun run dev      # http://localhost:4322
```

## Build & preview (with search index)

```sh
bun run build    # astro build + pagefind index
bun run preview
```

> Search only works after a full build — Pagefind generates its index from the
> built `dist/` output, so it is absent on the dev server.

### Search on the dev server

To exercise search while running `bun run dev`, generate the index into the
served `public/` folder once, then reload the search page:

```sh
bun run search:index   # astro build + pagefind --output-path public/pagefind
```

The emitted `public/pagefind/` directory is git-ignored. Re-run the command
whenever content changes; a full `bun run build` regenerates it for production.

## Authoring posts

Add a `.md` or `.mdx` file under `src/content/blog/`:

```mdx
---
title: 'My Post'
description: 'One-line summary used in cards and meta tags.'
pubDate: 2026-06-08
category: 'Engineering'
tags: ['astro', 'mdx']
cover: '⚡'        # optional emoji/glyph for cards
draft: false       # drafts are hidden in production
---

import { Callout, Tabs, TabItem } from '@components/mdx';

<Callout type="tip">Auto-injected components need no import.</Callout>
```

### Code block tricks

- ` ```ts title="file.ts" ` — language detection + frame title
- ` ```py showLineNumbers ` — line numbers
- ` ```js {2-4} ` — highlight a range of lines
- ` ```diff ` — `+`/`-` diff markers

### Configuration

Edit `src/config.ts` to change the brand, title, navigation, page size and
social links.
