#!/usr/bin/env bun
/**
 * Post-build CLI: rebuild the precache `sw.js` from a finished build directory
 * so late-emitted files (notably the Pagefind search index/fragments, written
 * by `pagefind --site dist` after the Astro build) are precached for offline
 * use. A no-op when the site has no precache worker.
 *
 * Usage: `bun precache-cli.ts [distDir]` (defaults to `dist`).
 */
import { regeneratePrecacheServiceWorker } from './pwa';

const distDir = process.argv[2] ?? 'dist';
await regeneratePrecacheServiceWorker(distDir);
