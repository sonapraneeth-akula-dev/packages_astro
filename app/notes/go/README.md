# @sonapraneeth/notes-app — Go Notes

A real documentation site built on **`@sonapraneeth/notes-core`**: a practical
handbook of the **Go programming language**, from basics through advanced topics
and tooling. It demonstrates the core package in "production" mode with a
**curated `sidebar.json`** override and a complete **Docker** deployment setup
(dev / test / ppe / prod behind Caddy).

> Sibling package: [`@sonapraneeth/notes-demo`](../demo) is the component showcase
> with an **auto-generated** sidebar. This app uses a **hand-curated** sidebar
> and ships Docker infrastructure.

---

## What's inside

- **Content**: real Go notes in `src/content/docs/` (`basics/`, `advanced/`,
  `advanced/` concurrency group, `tooling/`) authored in MDX, using the core
  components (`Callout`, `Steps`, `Tabs`, `CardGrid`, optimised images) plus a
  site-specific `GoPlayground` component.
- **Custom sidebar**: [`sidebar.json`](./sidebar.json) governs the left
  navigation (order, grouping, collapsed state, badges, external links). It is
  validated against the core sidebar schema and passed to `buildDocRoutes` /
  `buildHomeData`.
- **Optimised images**: MDX images are rendered through the core image pipeline
  (responsive `webp` variants) for high performance scores.
- **Offline search**: Pagefind indexes the built site into `public/pagefind`.
- **Installable PWA (opt-in)**: a web manifest, runtime-caching service worker
  and an in-page “Install app” button — off by default, enabled with one flag.
- **Docker**: multi-stage `Dockerfile`, `docker-compose.yml` (dev/test/ppe/prod
  + Caddy), and a `Caddyfile` for local HTTPS via Caddy's internal CA.

---

## Local development

From the **repo root** (recommended — uses root orchestration that works with
the hoisted Bun linker):

```bash
bun run dev:app        # astro dev for the app on http://localhost:4320
bun run build:app      # astro build + pagefind index
bun run preview:app    # preview the built site
```

Or from **this package directory**:

```bash
bun run dev            # http://localhost:4320
bun run build
bun run preview
bun run check          # astro check (type-check .astro/.mdx)
```

> The per-package scripts call Astro/Pagefind via explicit root-relative paths
> (`bun ../../node_modules/astro/bin/astro.mjs …`) because, under the hoisted
> linker on Windows, the per-package `.bin` shims are broken. This is expected.

---

## Editing the sidebar

`sidebar.json` is the single source of truth for navigation. Each entry is one
of:

- `{ "doc": "<slug>", "label": "…", "badge": "…" }` — a link to a doc by its
  content slug (path under `src/content/docs/` without extension).
- `{ "label": "…", "collapsed": false, "items": [ … ] }` — a (nestable) group.
- `{ "label": "…", "link": "https://…" }` — an external link.

After editing content **or** the sidebar, rebuild the search index so search
stays in sync:

```bash
bun run search:index
```

During development you can keep it in sync automatically:

```bash
bun run watch:content   # rebuilds the Pagefind index on content changes
```

---

## Progressive Web App (PWA)

The engine ships an **opt-in** PWA. It is disabled by default — turn it on by
adding a `pwa` block to `notes.config.ts`:

```ts
export const docsConfig = defineDocsConfig({
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

---

## Docker deployment

The Docker build context is the **monorepo root** (the app depends on the
`workspace:*` core package), so all compose builds reference
`context: ../..` with `dockerfile: packages/app/Dockerfile`.

### Environments

| Service | Target    | URL (via Caddy)                       |
| ------- | --------- | ------------------------------------- |
| `dev`   | `dev`     | `https://dev.go-notes.sonapraneeth.in`  |
| `test`  | `runtime` | `https://test.go-notes.sonapraneeth.in` |
| `ppe`   | `runtime` | `https://ppe.go-notes.sonapraneeth.in`  |
| `prod`  | `runtime` | `https://go-notes.sonapraneeth.in`      |

All services listen on container port **4320**; Caddy terminates TLS and
reverse-proxies to them.

### One-time local setup (Windows, Administrator PowerShell)

```bash
bun run hosts:setup    # maps *.go-notes.sonapraneeth.in → 127.0.1.3 in the hosts file
bun run certs:setup    # trusts Caddy's local CA so HTTPS is green
```

To undo:

```bash
bun run hosts:remove
bun run certs:remove
```

### Run

```bash
bun run docker:dev     # build + run the dev container (hot reload) + Caddy
bun run docker:test    # test environment (detached)
bun run docker:ppe     # pre-prod environment (detached)
bun run docker:prod    # production build (detached)
bun run docker:up      # bring up all services
bun run docker:logs    # follow logs
bun run docker:down    # stop and remove
bun run deploy         # alias for docker:prod
```

Git commit/branch metadata is injected into image builds automatically by
`scripts/docker-compose.ts` (no `.git` folder needed in the build context).

---

## Scripts reference

| Script           | Purpose                                                       |
| ---------------- | ------------------------------------------------------------- |
| `dev` / `start`  | Astro dev server (port 4320).                                 |
| `dev:host`       | Dev server bound to `0.0.0.0:4320` (used inside containers).  |
| `dev:serve`      | Supervised dev server (`scripts/dev-server.ts`) for Docker.   |
| `build`          | Astro build + Pagefind index into `dist`.                     |
| `search:index`   | Build + Pagefind index into `public/pagefind`.                |
| `preview`        | Preview the built site on `0.0.0.0:4320`.                     |
| `check`          | `astro check` type-check.                                     |
| `watch:content`  | Rebuild the search index on content changes.                  |
| `hosts:*`        | Add/remove local hosts entries (Admin).                       |
| `certs:*`        | Trust/untrust Caddy's local CA (Admin).                       |
| `docker:*`       | Build/run compose environments.                               |
| `deploy`         | Build + run the production environment.                       |
