import { spawn, type ChildProcess } from 'node:child_process';
import chokidar from 'chokidar';

/**
 * Supervises the Astro dev server inside the dev container. Project-agnostic:
 * the only project-specific value is the HTTP port, supplied via `--port <n>`
 * (falls back to the PORT env var, then a neutral default). Everything else is
 * resolved relative to the current working directory, so the same script works
 * for any @sonapraneeth/notes-core site (books, docs, papers, …).
 *
 * Astro restarts its dev server in-process whenever it believes a config file
 * changed. Under Docker bind-mount polling (Windows/macOS), that in-process
 * restart can hang and never rebind the port, leaving the container "up" but
 * unreachable (so Caddy returns 502). This watchdog probes the HTTP port and,
 * if the server exits or stops responding, kills its process group and
 * relaunches it — so the dev site recovers without a manual `docker restart`.
 *
 * It also fixes new-file tracking. Astro's content-collection glob loader and
 * route manifest only re-sync on EDITS to files they already know about; under
 * bind-mount polling they miss brand-new (or deleted) files, so a new handbook/
 * page never appears without a manual restart. We watch the glob-driven source
 * dirs for structural changes (file/dir add or unlink) and restart the dev
 * server, which re-scans collections and routes. Plain edits are left to
 * Astro's own HMR, so normal editing is never interrupted.
 */

/** Resolve the dev-server port from `--port <n>`, then PORT, then a default. */
function resolvePort(): number {
  const argv = process.argv.slice(2);
  const flag = argv.indexOf('--port');
  if (flag !== -1 && argv[flag + 1]) {
    const n = Number(argv[flag + 1]);
    if (Number.isFinite(n)) return n;
  }
  const env = Number(process.env.PORT);
  if (Number.isFinite(env) && env > 0) return env;
  return 4321;
}

const PORT = resolvePort();
const PROBE_URL = `http://127.0.0.1:${PORT}/`;
const PROBE_INTERVAL_MS = 5_000;
const STARTUP_GRACE_MS = 30_000; // first boot + Vite dependency optimisation
const MAX_FAILED_PROBES = 3; // ~15s unresponsive ⇒ treat as hung
const RESTART_BACKOFF_MS = 1_000;

// Source dirs whose file SET (not contents) Astro fails to re-scan under
// bind-mount polling: the content collection (glob loader). Page routes are
// injected by the @sonapraneeth/notes-core engine, so there is no src/pages.
const STRUCTURE_WATCH_DIRS = ['content'];
// Config files whose CONTENTS feed the Astro config (branding, nav, theme,
// fonts). Astro restarts the dev server in-process when these change, but under
// bind-mount polling that event is missed entirely, so an edit never takes
// effect. We watch them here and force a full restart on any change so theme /
// branding edits show up without a manual `docker restart`.
const CONFIG_WATCH_FILES = ['notes.config.ts', 'astro.config.ts'];
const STRUCTURE_DEBOUNCE_MS = 600;
const usePolling = Boolean(process.env.CHOKIDAR_USEPOLLING);

let child: ChildProcess | null = null;
let startedAt = 0;
let failedProbes = 0;
let shuttingDown = false;

function start(): void {
  failedProbes = 0;
  startedAt = Date.now();
  console.log(`[dev-server] Starting Astro dev server on port ${PORT}…`);
  // `detached` puts the server in its own process group so we can reliably kill
  // the whole tree (bun → node astro) when it hangs, avoiding orphans.
  const c = spawn('bun', ['run', 'dev'], { stdio: 'inherit', detached: true });
  child = c;
  c.on('exit', (code, signal) => {
    if (child !== c || shuttingDown) return; // superseded by a restart / shutting down
    child = null;
    console.error(
      `[dev-server] Astro dev exited (code=${code ?? '-'} signal=${signal ?? '-'}); restarting…`,
    );
    setTimeout(start, RESTART_BACKOFF_MS);
  });
}

function restart(reason: string): void {
  const old = child;
  child = null; // detach first so its exit handler becomes a no-op
  console.error(`[dev-server] ${reason} — restarting dev server.`);
  if (old?.pid) {
    try {
      process.kill(-old.pid, 'SIGKILL'); // kill the whole process group
    } catch {
      try {
        old.kill('SIGKILL');
      } catch {
        /* already gone */
      }
    }
  }
  setTimeout(start, RESTART_BACKOFF_MS);
}

async function probe(): Promise<void> {
  if (!child) return;
  if (Date.now() - startedAt < STARTUP_GRACE_MS) return; // still booting
  try {
    await fetch(PROBE_URL, { signal: AbortSignal.timeout(4_000) });
    failedProbes = 0; // any HTTP response means the port is bound and serving
  } catch {
    failedProbes += 1;
    console.warn(`[dev-server] Health probe failed (${failedProbes}/${MAX_FAILED_PROBES}).`);
    if (failedProbes >= MAX_FAILED_PROBES) {
      restart('Dev server is unresponsive');
    }
  }
}

function shutdown(): void {
  shuttingDown = true;
  if (child?.pid) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

/**
 * Watch the glob-driven source dirs and restart the dev server when files are
 * added or removed (the cases Astro misses under bind-mount polling). Edits
 * fire `change`, which we ignore so Astro's HMR handles them uninterrupted.
 */
function watchStructure(): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const onStructureChange = (path: string): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => restart(`New/removed file detected (${path})`), STRUCTURE_DEBOUNCE_MS);
  };

  chokidar
    .watch(STRUCTURE_WATCH_DIRS, { ignoreInitial: true, usePolling, interval: 1000 })
    .on('add', onStructureChange)
    .on('unlink', onStructureChange)
    .on('addDir', onStructureChange)
    .on('unlinkDir', onStructureChange)
    .on('ready', () =>
      console.log(
        `[dev-server] Watching ${STRUCTURE_WATCH_DIRS.join(', ')} for new/removed files` +
        (usePolling ? ' (polling @ 1000ms).' : '.'),
      ),
    );
}

/**
 * Watch the Astro config files and restart the dev server when they are edited.
 * Unlike content, we react to `change` (not just add/unlink) because it is the
 * file CONTENTS — branding, nav, theme, fonts — that must be re-evaluated, and
 * Astro's own config-change restart is missed under bind-mount polling.
 */
function watchConfig(): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const onConfigChange = (path: string): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => restart(`Config changed (${path})`), STRUCTURE_DEBOUNCE_MS);
  };

  chokidar
    .watch(CONFIG_WATCH_FILES, { ignoreInitial: true, usePolling, interval: 1000 })
    .on('add', onConfigChange)
    .on('change', onConfigChange)
    .on('unlink', onConfigChange)
    .on('ready', () =>
      console.log(
        `[dev-server] Watching ${CONFIG_WATCH_FILES.join(', ')} for config edits` +
        (usePolling ? ' (polling @ 1000ms).' : '.'),
      ),
    );
}

start();
watchStructure();
watchConfig();
setInterval(probe, PROBE_INTERVAL_MS);
