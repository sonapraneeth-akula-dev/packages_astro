/**
 * Opt-in Progressive Web App support shared by the blog and notes engines.
 *
 * The whole feature is gated behind {@link PwaConfig.enabled} (default `false`),
 * so an unconfigured site ships exactly what it did before — no manifest, no
 * service worker, no extra <head> tags. When turned on, the {@link pwa}
 * integration emits a `manifest.webmanifest` and a runtime-caching `sw.js` into
 * the build output, and {@link PwaHead} (an Astro component) wires up the
 * matching <head> tags and registers the worker.
 *
 * Like Pagefind search, this is a build-time concern: the worker and manifest
 * are only emitted by `astro build`, so the PWA activates on the built site
 * (and `astro preview`), not the dev server.
 */
import type { AstroIntegration } from 'astro';
import { fileURLToPath } from 'node:url';
import { writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import path from 'node:path';

/** A single home-screen icon entry in the web app manifest. */
export interface PwaIcon {
  /** Root-relative path to the icon in the site's `public/` folder. */
  src: string;
  /** `"any"` for SVG, otherwise `"192x192"`, `"512x512"`, etc. */
  sizes: string;
  /** MIME type, e.g. `image/png` or `image/svg+xml`. */
  type?: string;
  /** `"any"`, `"maskable"`, or `"any maskable"`. */
  purpose?: string;
}

/** Per-site PWA settings. Everything is optional and falls back to site data. */
export interface PwaConfig {
  /**
   * Master switch. When `false` (the default) nothing PWA-related ships. Flip
   * to `true` in a site's `blog.config.ts` / `notes.config.ts` to turn it on.
   */
  enabled?: boolean;
  /** Install name. Defaults to the site title. */
  name?: string;
  /** Home-screen short name. Defaults to the site brand. */
  shortName?: string;
  /** Manifest description. Defaults to the site description. */
  description?: string;
  /** Theme + status-bar colour (any CSS colour). Defaults to `#0b0b0c`. */
  themeColor?: string;
  /** Splash-screen background colour. Defaults to {@link themeColor}. */
  backgroundColor?: string;
  /** Display mode when launched from the home screen. Defaults to `standalone`. */
  display?: 'standalone' | 'minimal-ui' | 'fullscreen' | 'browser';
  /** Start URL when launched from the home screen. Defaults to `/`. */
  startUrl?: string;
  /**
   * Home-screen icons. **Optional** — when omitted the engine generates a
   * tasteful default set (192px + 512px + a 512px `maskable` PNG, themed with
   * {@link backgroundColor} / {@link iconColor}) at build time, so the site is
   * installable out of the box. Provide your own entries to override: drop the
   * files in the site's `public/` folder and list them here. The first PNG is
   * also used as the iOS apple-touch-icon.
   */
  icons?: PwaIcon[];
  /**
   * Foreground (mark) colour for the engine-generated default icons. Ignored
   * when {@link icons} is supplied. Defaults to `#f5f5f7`.
   */
  iconColor?: string;
  /**
   * Show the in-page “Install app” button when the browser reports the site is
   * installable (and an Add-to-Home-Screen hint on iOS). Defaults to `true`.
   */
  install?: boolean;
  /**
   * Offline precaching strategy. The service worker always runtime-caches what
   * you browse; this controls how much it *proactively* downloads in the
   * background (off the main thread, images last) so the site works offline
   * before you've visited every page:
   *   - `false` (default) — precache nothing; cache fills only as you browse.
   *   - `'core'` — precache all pages + CSS/JS/fonts/icons + the Pagefind
   *     search bundle, but leave large raster images to runtime caching.
   *   - `'all'` — precache everything, including images (downloaded last).
   * On every reconnect/visit the worker fetches only the files whose content
   * changed and prunes anything the latest build removed, so deploys sync
   * incrementally rather than re-downloading the whole site.
   */
  precache?: 'core' | 'all' | false;
}

/** The fields PWA resolution needs from a site's resolved config. */
export interface PwaSiteInfo {
  /** The site's PWA settings (may be undefined / disabled). */
  pwa?: PwaConfig;
  /** Site title — manifest `name` default. */
  title: string;
  /** Site brand — manifest `short_name` default. */
  brand?: string;
  /** Site description — manifest `description` default. */
  description?: string;
}

/** A minimal web app manifest (the subset this engine emits). */
export interface WebManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: NonNullable<PwaConfig['display']>;
  theme_color: string;
  background_color: string;
  icons: PwaIcon[];
}

/** Fully resolved PWA data, derived once and shared by the integration + head. */
export interface ResolvedPwa {
  enabled: boolean;
  manifest: WebManifest;
  themeColor: string;
  /** First PNG icon, used for the iOS apple-touch-icon link (if any). */
  appleTouchIcon?: string;
  /** Whether to render the in-page install button. */
  install: boolean;
  /** Background precache strategy: `false`, `'core'` or `'all'`. */
  precache: 'core' | 'all' | false;
  /** True when the site relies on the engine-generated default PNG icons. */
  usesDefaultIcons: boolean;
  /** Background colour for generated default icons. */
  iconBackground: string;
  /** Foreground (mark) colour for generated default icons. */
  iconColor: string;
}

/** Root-relative paths of the engine-generated default PNG icons. */
const DEFAULT_ICON_192 = '/pwa-icon-192.png';
const DEFAULT_ICON_512 = '/pwa-icon-512.png';
const DEFAULT_ICON_MASKABLE = '/pwa-maskable-512.png';

/**
 * Default icon set used when a site provides none: the scalable favicon every
 * site already ships, plus three engine-generated PNGs (emitted at build time)
 * so Android/Chrome offers a real install prompt without any per-site assets.
 */
const DEFAULT_ICONS: PwaIcon[] = [
  { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  { src: DEFAULT_ICON_192, sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: DEFAULT_ICON_512, sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: DEFAULT_ICON_MASKABLE, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

/** Merge a site's PWA settings onto sensible, site-derived defaults. */
export function resolvePwa(info: PwaSiteInfo): ResolvedPwa {
  const pwa = info.pwa ?? {};
  const themeColor = pwa.themeColor ?? '#0b0b0c';
  const backgroundColor = pwa.backgroundColor ?? themeColor;
  const usesDefaultIcons = !pwa.icons;
  const icons = pwa.icons ?? DEFAULT_ICONS;
  const name = pwa.name ?? info.title;

  const manifest: WebManifest = {
    name,
    short_name: pwa.shortName ?? info.brand ?? name,
    description: pwa.description ?? info.description ?? '',
    start_url: pwa.startUrl ?? '/',
    scope: '/',
    display: pwa.display ?? 'standalone',
    theme_color: themeColor,
    background_color: backgroundColor,
    icons,
  };

  const appleTouchIcon = usesDefaultIcons
    ? DEFAULT_ICON_192
    : icons.find((icon) => icon.type === 'image/png')?.src;

  return {
    enabled: pwa.enabled ?? false,
    manifest,
    themeColor,
    appleTouchIcon,
    install: pwa.install ?? true,
    precache: pwa.precache ?? false,
    usesDefaultIcons,
    iconBackground: backgroundColor,
    iconColor: pwa.iconColor ?? '#f5f5f7',
  };
}

/**
 * A dependency-free, runtime-caching service worker. It precaches nothing at
 * build time (so it needs no asset manifest) and instead fills its cache as the
 * user browses: network-first for navigations (so content stays fresh, with the
 * cache as an offline fallback) and stale-while-revalidate for assets. The
 * `buildId` busts the cache on every deploy and old caches are pruned on
 * activate.
 */
function serviceWorkerSource(buildId: string): string {
  return `// Generated by @sonapraneeth/components/pwa — do not edit.
const CACHE = 'sonapraneeth-pwa-${buildId}';
const OFFLINE_FALLBACK = '/';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/build-info.json') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await cache.match(OFFLINE_FALLBACK);
    if (fallback) return fallback;
    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}
`;
}

// ---------------------------------------------------------------------------
// Incremental precache (opt-in via `pwa.precache`)
//
// When enabled, the build enumerates the output into a precache manifest of
// `{ url, revision }` entries and bakes it into a smarter service worker. That
// worker fills the cache in the background after activation (off the main
// thread, images last), and on every visit/reconnect syncs *incrementally*:
// only files whose revision changed are re-fetched, and anything the latest
// build dropped is pruned. Fingerprinted `/_astro/*` URLs carry a `null`
// revision (their URL already encodes the content), so they're only fetched
// when genuinely new.
// ---------------------------------------------------------------------------

/** One precache entry: a request URL and a content revision (`null` = immutable URL). */
interface PrecacheEntry {
  url: string;
  revision: string | null;
}

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif']);
/** Extensions worth precaching for a working offline site (the `'core'` set). */
const CORE_EXT = new Set([
  'html', 'css', 'js', 'mjs', 'json', 'wasm',
  'woff2', 'woff', 'ttf', 'otf', 'eot',
  'svg', 'ico', 'webmanifest', 'txt',
  // Pagefind search runtime: index/fragment/meta shards plus its `.pagefind`
  // WASM binaries — all required for search to work offline.
  'pf_meta', 'pf_index', 'pf_fragment', 'pagefind',
]);

/** Recursively list every file under a directory (absolute paths). */
async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full)));
    else out.push(full);
  }
  return out;
}

/** Map a build-output relative path to the URL the browser requests for it. */
function outputUrl(relPosix: string): string {
  if (relPosix === 'index.html') return '/';
  if (relPosix.endsWith('/index.html')) {
    return '/' + relPosix.slice(0, -'index.html'.length); // keeps the trailing slash
  }
  return '/' + relPosix;
}

/**
 * Walk the build output and produce an ordered precache manifest. Documents
 * come first, then critical assets, then images (so background fetching leaves
 * the heaviest files for last). Fingerprinted `/_astro/*` files get a `null`
 * revision; everything else is hashed so content changes are detected.
 */
async function buildPrecacheManifest(
  outDir: string,
  mode: 'core' | 'all',
): Promise<PrecacheEntry[]> {
  const files = await listFiles(outDir);

  const docs: PrecacheEntry[] = [];
  const assets: PrecacheEntry[] = [];
  const images: PrecacheEntry[] = [];

  for (const abs of files) {
    const relPosix = path.relative(outDir, abs).split(path.sep).join('/');
    const base = relPosix.split('/').pop() ?? '';
    // Never precache the worker itself, sourcemaps, or dotfiles.
    if (relPosix === 'sw.js' || relPosix.endsWith('.map') || base.startsWith('.')) continue;

    const ext = (relPosix.split('.').pop() ?? '').toLowerCase();
    const isImage = IMAGE_EXT.has(ext);
    const isHtml = ext === 'html';
    const isCore = isHtml || CORE_EXT.has(ext);
    if (!isCore && !isImage) continue; // skip anything unexpected
    if (isImage && mode !== 'all') continue;

    const url = outputUrl(relPosix);
    const revision = relPosix.startsWith('_astro/')
      ? null
      : createHash('sha256').update(await readFile(abs)).digest('hex').slice(0, 16);
    const entry: PrecacheEntry = { url, revision };

    if (isHtml) docs.push(entry);
    else if (isImage) images.push(entry);
    else assets.push(entry);
  }

  const byUrl = (a: PrecacheEntry, b: PrecacheEntry) => a.url.localeCompare(b.url);
  docs.sort(byUrl);
  assets.sort(byUrl);
  images.sort(byUrl);
  return [...docs, ...assets, ...images];
}

/**
 * The incremental-precache service worker. Runtime behaviour matches the
 * lightweight worker (network-first navigations, stale-while-revalidate
 * assets) but it also owns a baked-in precache manifest that it syncs in the
 * background: new/changed entries are fetched (throttled, images last) and
 * dropped entries are pruned, all keyed off content revisions.
 */
function precacheServiceWorkerSource(
  buildId: string,
  manifest: PrecacheEntry[],
  mode: 'core' | 'all',
): string {
  return `// Generated by @sonapraneeth/components/pwa — do not edit.
const VERSION = '${buildId}';
const PRECACHE_MODE = '${mode}';
const CACHE = 'sonapraneeth-pwa';
const MANIFEST_KEY = '/__precache-manifest__';
const OFFLINE_FALLBACK = '/';
const MANIFEST = ${JSON.stringify(manifest)};

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older worker versions (e.g. the per-build names).
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
      // Fill the precache in the background; do not block activation on it.
      syncPrecache();
    })(),
  );
});

// The page pings us on load and whenever the network returns, so the sync also
// runs while a tab is open (keeping the worker alive long enough to finish).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC') event.waitUntil(syncPrecache());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/build-info.json') return;
  if (request.mode === 'navigate') {
    event.respondWith(navigate(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

// Network-first for pages (fresh when online), precache/runtime as the offline
// fallback — tolerant of trailing-slash differences between request and store.
async function navigate(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const p = new URL(request.url).pathname;
    const hit =
      (await cache.match(request)) ||
      (await cache.match(p)) ||
      (await cache.match(p.endsWith('/') ? p + 'index.html' : p + '/'));
    return hit || (await cache.match(OFFLINE_FALLBACK)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}

let syncing = false;
async function syncPrecache() {
  if (syncing) return;
  syncing = true;
  try {
    const cache = await caches.open(CACHE);

    // Previous manifest (url -> revision), so we only refetch what changed.
    const prevRes = await cache.match(MANIFEST_KEY);
    const prev = new Map();
    if (prevRes) {
      try {
        for (const e of await prevRes.json()) prev.set(e.url, e.revision);
      } catch {}
    }

    // Prune cached entries the latest build no longer ships (reclaims space).
    const wanted = new Set(MANIFEST.map((e) => e.url));
    const cachedReqs = await cache.keys();
    await Promise.all(
      cachedReqs.map(async (req) => {
        const p = new URL(req.url).pathname;
        if (p === MANIFEST_KEY) return;
        if (!wanted.has(p)) await cache.delete(req);
      }),
    );

    // Fetch only new or content-changed entries, in manifest order (images
    // last), throttled so the background fill never saturates the network.
    const stale = [];
    for (const entry of MANIFEST) {
      const present = await cache.match(entry.url);
      if (present && prev.get(entry.url) === entry.revision) continue;
      stale.push(entry.url);
    }
    const CONCURRENCY = 5;
    for (let i = 0; i < stale.length; i += CONCURRENCY) {
      await Promise.all(
        stale.slice(i, i + CONCURRENCY).map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res && res.ok) await cache.put(url, res.clone());
          } catch {}
        }),
      );
    }

    await cache.put(
      MANIFEST_KEY,
      new Response(JSON.stringify(MANIFEST), {
        headers: { 'content-type': 'application/json' },
      }),
    );
  } finally {
    syncing = false;
  }
}
`;
}

/**
 * Regenerate the precache `sw.js` from a finished build directory. Run this as
 * a post-build step **after** any tools that emit files the worker can't see at
 * `astro:build:done` — most importantly Pagefind, whose search index/fragments
 * are written by `pagefind --site dist` only after the Astro build completes.
 *
 * It reads the mode + build id from the `sw.js` already emitted by the build
 * hook, re-walks the (now complete) output, and rewrites the worker with a
 * manifest that includes those late files. It is a no-op when the site has no
 * precache worker (so it's safe to wire into every build script), for example:
 *
 * ```jsonc
 * "build": "astro build && pagefind --site dist && bun .../precache-cli.ts dist"
 * ```
 */
export async function regeneratePrecacheServiceWorker(distDir: string): Promise<void> {
  const swPath = path.join(distDir, 'sw.js');
  let source: string;
  try {
    source = await readFile(swPath, 'utf8');
  } catch {
    return; // No worker emitted (PWA disabled) — nothing to do.
  }
  const version = source.match(/const VERSION = '([^']*)'/)?.[1];
  const mode = source.match(/const PRECACHE_MODE = '(core|all)'/)?.[1] as
    | 'core'
    | 'all'
    | undefined;
  if (!version || !mode) return; // Runtime-only worker (precache disabled).

  const manifest = await buildPrecacheManifest(distDir, mode);
  await writeFile(swPath, precacheServiceWorkerSource(version, manifest, mode), 'utf8');
}


// ---------------------------------------------------------------------------
// Default icon generation
//
// To stay dependency-free, the engine rasterises its default home-screen icons
// itself: a flat-colour rounded badge ("any" purpose) and a full-bleed maskable
// variant, both stamped with a simple ring mark. PNG encoding only needs the
// built-in zlib `deflate`, so there is no image library to install and the icons
// always match the site's configured colours.
// ---------------------------------------------------------------------------

/** Parse `#rgb` / `#rrggbb` into an `[r, g, b]` triple (0–255). */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = Number.parseInt(h, 16);
  if (!Number.isFinite(n)) return [11, 11, 12];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Coverage (0–1, ~1px antialiased) of a centred rounded square at a pixel. */
function roundedRectCoverage(px: number, py: number, size: number, radius: number): number {
  const half = size / 2;
  const x = Math.abs(px - half);
  const y = Math.abs(py - half);
  const inner = half - radius;
  const dx = Math.max(x - inner, 0);
  const dy = Math.max(y - inner, 0);
  const cornerDist = Math.sqrt(dx * dx + dy * dy) - radius;
  const edgeDist = Math.max(x - half, y - half);
  return clamp01(0.5 - Math.max(cornerDist, edgeDist));
}

/** Coverage (0–1) of an annulus (ring) band between `inner` and `outer` radii. */
function ringCoverage(dist: number, inner: number, outer: number): number {
  const outerEdge = clamp01(0.5 + (outer - dist));
  const innerEdge = clamp01(0.5 + (dist - inner));
  return Math.min(outerEdge, innerEdge);
}

/** Render an RGBA pixel buffer for one default icon. */
function renderIconPixels(
  size: number,
  bgHex: string,
  fgHex: string,
  maskable: boolean,
): Uint8Array {
  const rgba = new Uint8Array(size * size * 4);
  const [br, bg, bb] = hexToRgb(bgHex);
  const [fr, fg, fb] = hexToRgb(fgHex);
  const center = size / 2;
  // Maskable icons must fill the whole canvas (the OS clips a safe zone); the
  // "any" badge gets rounded corners and a tighter, larger mark.
  const corner = maskable ? 0 : size * 0.22;
  const outerR = size * (maskable ? 0.24 : 0.3);
  const innerR = size * (maskable ? 0.13 : 0.17);
  const dotR = size * (maskable ? 0.05 : 0.065);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;
      const bgA = maskable ? 1 : roundedRectCoverage(px, py, size, corner);

      let r = br;
      let g = bg;
      let b = bb;
      let a = bgA;

      const dx = px - center;
      const dy = py - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const markA = Math.max(ringCoverage(dist, innerR, outerR), clamp01(0.5 + (dotR - dist)));
      if (markA > 0) {
        r = Math.round(r * (1 - markA) + fr * markA);
        g = Math.round(g * (1 - markA) + fg * markA);
        b = Math.round(b * (1 - markA) + fb * markA);
        a = Math.max(a, markA);
      }

      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = Math.round(clamp01(a) * 255);
    }
  }
  return rgba;
}

/** CRC-32 lookup table (PNG chunk checksums). */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Wrap chunk data in a length + type + CRC PNG chunk. */
function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Encode an RGBA buffer as a PNG (8-bit, truecolour + alpha). */
function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA

  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0 (none)
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks = [
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', new Uint8Array(0)),
  ];
  const total = signature.length + chunks.reduce((sum, c) => sum + c.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  png.set(signature, offset);
  offset += signature.length;
  for (const c of chunks) {
    png.set(c, offset);
    offset += c.length;
  }
  return png;
}

/** Build one default icon PNG at the given size + purpose. */
function defaultIconPng(size: number, bg: string, fg: string, maskable: boolean): Uint8Array {
  return encodePng(size, size, renderIconPixels(size, bg, fg, maskable));
}

/**
 * Astro integration that, when the site has PWA enabled, writes
 * `manifest.webmanifest` and `sw.js` into the build output root so they are
 * served from the site root (the scope the worker needs). When the site relies
 * on the engine's default icons, it also rasterises and writes those PNGs. A
 * no-op when disabled.
 */
export function pwa(info: PwaSiteInfo): AstroIntegration {
  const resolved = resolvePwa(info);
  return {
    name: '@sonapraneeth/components/pwa',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        if (!resolved.enabled) return;
        const out = fileURLToPath(dir);
        const buildId = Date.now().toString(36);
        await writeFile(
          path.join(out, 'manifest.webmanifest'),
          JSON.stringify(resolved.manifest, null, 2),
          'utf8',
        );

        if (resolved.precache) {
          // Enumerate the build output into a revision-keyed manifest and emit
          // the incremental-precache worker (background fill + change-only sync).
          const manifest = await buildPrecacheManifest(out, resolved.precache);
          await writeFile(
            path.join(out, 'sw.js'),
            precacheServiceWorkerSource(buildId, manifest, resolved.precache),
            'utf8',
          );
          logger.info(
            `Emitted precache sw.js (${resolved.precache}: ${manifest.length} entries) and manifest.webmanifest.`,
          );
        } else {
          await writeFile(path.join(out, 'sw.js'), serviceWorkerSource(buildId), 'utf8');
        }

        if (resolved.usesDefaultIcons) {
          const { iconBackground: bg, iconColor: fg } = resolved;
          await Promise.all([
            writeFile(path.join(out, 'pwa-icon-192.png'), defaultIconPng(192, bg, fg, false)),
            writeFile(path.join(out, 'pwa-icon-512.png'), defaultIconPng(512, bg, fg, false)),
            writeFile(
              path.join(out, 'pwa-maskable-512.png'),
              defaultIconPng(512, bg, fg, true),
            ),
          ]);
          logger.info('Emitted default PWA icons.');
        }
      },
    },
  };
}
