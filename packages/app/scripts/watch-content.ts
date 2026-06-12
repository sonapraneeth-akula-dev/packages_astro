import { spawn } from 'node:child_process';
import chokidar from 'chokidar';

/**
 * Watches the notes content directory and rebuilds the Pagefind search index
 * whenever a note is added, changed, or removed. Used by the dev container so
 * offline search stays in sync with content while you edit.
 *
 * Pagefind only indexes built HTML, so a refresh means re-running
 * `search:index` (astro build + pagefind → public/pagefind). Rapid edits are
 * debounced into a single rebuild, and overlapping rebuilds are coalesced.
 *
 * In Docker on Windows/macOS, bind-mounted files don't forward inotify events,
 * so polling is used when CHOKIDAR_USEPOLLING is set (matching Vite's watcher).
 */

const WATCH_GLOB = 'src/content';
const DEBOUNCE_MS = 1500;
const usePolling = Boolean(process.env.CHOKIDAR_USEPOLLING);

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let pending = false;

function runIndex() {
  if (running) {
    // A rebuild is already in flight — remember to run once more after it.
    pending = true;
    return;
  }
  running = true;
  console.log('[watch-content] Content changed → rebuilding search index…');

  const child = spawn('bun', ['run', 'search:index'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    running = false;
    if (code === 0) {
      console.log('[watch-content] Search index updated.');
    } else {
      console.error(`[watch-content] search:index exited with code ${code}.`);
    }
    if (pending) {
      pending = false;
      runIndex();
    }
  });
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(runIndex, DEBOUNCE_MS);
}

const watcher = chokidar.watch(WATCH_GLOB, {
  ignoreInitial: true,
  usePolling,
  interval: 1000,
});

watcher
  .on('add', schedule)
  .on('change', schedule)
  .on('unlink', schedule)
  .on('ready', () => {
    console.log(
      `[watch-content] Watching ${WATCH_GLOB} for changes` +
      (usePolling ? ' (polling @ 1000ms).' : '.'),
    );
  });
