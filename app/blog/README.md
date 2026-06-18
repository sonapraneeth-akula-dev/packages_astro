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
- **Installable PWA (opt-in)** — a web manifest, runtime-caching service worker
  and an in-page “Install app” button, off by default and enabled with one flag.
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
coverImage: ./images/hero.jpg   # optional hero image, optimized at build time
coverAlt: 'Hero image description'  # alt text (falls back to title)
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

Edit `blog.config.ts` to change the brand, title, navigation, page size and
social links.

## Progressive Web App (PWA)

The engine ships an **opt-in** PWA. It is disabled by default — turn it on by
adding a `pwa` block to `blog.config.ts`:

```ts
export const blogConfig = defineBlogConfig({
  // …existing options…
  pwa: { enabled: true },
});
```

When enabled, a production build (`bun run build` / `bun run preview`) emits a
`manifest.webmanifest` and a runtime-caching service worker (`sw.js`) into the
site root, and the layout injects the matching `<head>` tags plus an in-page
**Install app** button (an *Add to Home Screen* hint on iOS).

> Like search, the PWA only activates on a **built** site — the manifest and
> worker are emitted by `astro build`, so they are absent on the dev server.

### Icons

With no icons configured, the build **generates** a default set (192px, 512px
and a 512px `maskable` PNG, themed with the manifest colours) so the site is
installable out of the box. To use your own, drop the files in `public/` and
list them — this overrides the generated defaults entirely:

```ts
pwa: {
  enabled: true,
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
},
```

### Options

| Option            | Default                      | Description                                              |
| ----------------- | ---------------------------- | ------------------------------------------------------- |
| `enabled`         | `false`                      | Master switch — nothing PWA-related ships when off.     |
| `install`         | `true`                       | Show the in-page **Install app** button.                |
| `name`            | site title                   | Full install name in the manifest.                      |
| `shortName`       | site brand                   | Home-screen label.                                      |
| `description`     | site description             | Manifest description.                                    |
| `themeColor`      | `#0b0b0c`                    | `theme-color` + status-bar colour.                      |
| `backgroundColor` | `themeColor`                 | Splash-screen background.                                |
| `display`         | `standalone`                 | `standalone` \| `minimal-ui` \| `fullscreen` \| `browser`. |
| `startUrl`        | `/`                          | Launch URL from the home screen.                        |
| `icons`           | generated default set        | Override the home-screen icons.                         |
| `iconColor`       | `#f5f5f7`                    | Mark colour for the generated default icons.            |
