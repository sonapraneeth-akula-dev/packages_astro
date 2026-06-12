import { spawn, type ChildProcess } from 'node:child_process';
import chokidar from 'chokidar';

/**
 * Supervises the Astro dev server inside the dev container.
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
 * bind-mount polling they miss brand-new (or deleted) files, so a new note
 * never appears without a manual restart. We watch the glob-driven source dirs
 * for structural changes (file/dir add or unlink) and restart the dev server,
 * which re-scans collections and routes. Plain edits are left to Astro's own
 * HMR, so normal editing is never interrupted.
 */

const PORT = Number(process.env.PORT ?? 4320);
const PROBE_URL = `http://127.0.0.1:${PORT}/`;
const PROBE_INTERVAL_MS = 5_000;
const STARTUP_GRACE_MS = 30_000; // first boot + Vite dependency optimisation
const MAX_FAILED_PROBES = 3; // ~15s unresponsive ⇒ treat as hung
const RESTART_BACKOFF_MS = 1_000;

// Source dirs whose file SET (not contents) Astro fails to re-scan under
// bind-mount polling: content collections (glob loader) and routes (manifest).
const STRUCTURE_WATCH_DIRS = ['src/content', 'src/pages'];
const STRUCTURE_DEBOUNCE_MS = 600;
const usePolling = Boolean(process.env.CHOKIDAR_USEPOLLING);

let child: ChildProcess | null = null;
let startedAt = 0;
let failedProbes = 0;
let shuttingDown = false;

function start(): void {
  failedProbes = 0;
  startedAt = Date.now();
  console.log('[dev-server] Starting Astro dev server…');
  // `detached` puts the server in its own process group so we can reliably kill
  // the whole tree (bun → node astro) when it hangs, avoiding orphans.
  // `dev:host` binds 0.0.0.0:4320 so Caddy in another container can reach it.
  const c = spawn('bun', ['run', 'dev:host'], { stdio: 'inherit', detached: true });
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

start();
watchStructure();
setInterval(probe, PROBE_INTERVAL_MS);
