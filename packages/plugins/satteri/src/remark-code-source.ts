/**
 * Remark plugin that fills a fenced code block from an external source — a
 * local file or a remote URL — at build time. It runs during the mdast phase,
 * before any syntax highlighter (e.g. Expressive Code) reads the fence, so the
 * imported text is highlighted, framed and line-numbered like any inline block.
 *
 * ## Syntax
 *
 * Add a `file="…"` or `url="…"` attribute to the fence's meta string. Any other
 * meta (title, highlight ranges like `{2-4}`, `showLineNumbers`, …) is left
 * untouched for the highlighter to consume.
 *
 * ````md
 * ```ts file="../snippets/server.ts"           // whole file
 * ```ts file="../snippets/server.ts#L10-L24"   // a line range
 * ```ts file="../snippets/server.ts#L10" {1}   // one line, highlighted
 * ```ts url="https://raw.githubusercontent.com/owner/repo/<sha>/file.ts#L1-L20"
 * ````
 *
 * - Paths are resolved relative to the Markdown/MDX file that references them.
 * - A `#L<start>` or `#L<start>-L<end>` fragment selects a 1-based, inclusive
 *   line range. Highlight ranges in the remaining meta (`{1-3}`) apply to the
 *   **sliced** output, so they line up with what the reader sees.
 *
 * ## Remote safety
 *
 * Remote fetches are a build-time supply-chain surface, so they are locked down:
 * only `https:` URLs are allowed, the host must be on {@link CodeSourceOptions.allowedHosts}
 * (GitHub raw + gists by default), the request times out, and the response size
 * is capped. The fetched bytes are rendered as escaped code text — never
 * executed — so there is no XSS path.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { visit } from 'unist-util-visit';

/** Minimal shape of an mdast fenced-code node (avoids an @types/mdast dep). */
interface CodeNode {
  type: 'code';
  lang?: string | null;
  meta?: string | null;
  value: string;
}

/** The vfile passed to the transformer; `path`/`history` locate the source. */
interface VFileLike {
  path?: string;
  history?: string[];
  cwd?: string;
}

export interface CodeSourceOptions {
  /**
   * Hostnames a `url="…"` import may fetch from. Defaults to GitHub's raw and
   * gist hosts. Add your own (e.g. an internal docs host) to widen the set.
   */
  allowedHosts?: string[];
  /** Abort a remote fetch after this many milliseconds. @default 10000 */
  timeoutMs?: number;
  /** Reject a remote response larger than this many bytes. @default 524288 */
  maxBytes?: number;
}

const DEFAULT_ALLOWED_HOSTS = [
  'raw.githubusercontent.com',
  'gist.githubusercontent.com',
];

/** Pull `file="…"` / `url="…"` out of a meta string, returning the rest. */
function parseSource(meta: string): {
  kind: 'file' | 'url';
  ref: string;
  rest: string;
} | null {
  const match = meta.match(/\b(file|url)\s*=\s*"([^"]+)"/);
  if (!match) return null;
  const rest = (meta.slice(0, match.index) + meta.slice(match.index! + match[0].length))
    .replace(/\s+/g, ' ')
    .trim();
  return { kind: match[1] as 'file' | 'url', ref: match[2], rest };
}

/** Split a trailing `#L10` / `#L10-L24` fragment off a reference. */
function splitLineRange(ref: string): {
  base: string;
  start?: number;
  end?: number;
} {
  const match = ref.match(/#L(\d+)(?:-L?(\d+))?$/);
  if (!match) return { base: ref };
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : start;
  return { base: ref.slice(0, match.index), start, end };
}

/** Keep only `start..end` (1-based, inclusive) of `source`. */
function sliceLines(source: string, start?: number, end?: number): string {
  if (!start) return source.replace(/\n$/, '');
  const lines = source.split(/\r?\n/);
  return lines.slice(start - 1, end).join('\n');
}

/** Read a local file resolved relative to the referencing Markdown file. */
async function readLocal(ref: string, file: VFileLike): Promise<string> {
  const { base, start, end } = splitLineRange(ref);
  const fromPath = file.path ?? file.history?.[0];
  const baseDir = fromPath ? path.dirname(fromPath) : (file.cwd ?? process.cwd());
  const resolved = path.resolve(baseDir, base);
  const raw = await readFile(resolved, 'utf8');
  return sliceLines(raw, start, end);
}

/** Fetch a remote file over https, enforcing host/size/time limits. */
async function readRemote(ref: string, opts: Required<CodeSourceOptions>): Promise<string> {
  const { base, start, end } = splitLineRange(ref);
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error(`[remark-code-source] Invalid url: ${base}`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`[remark-code-source] Only https urls are allowed: ${base}`);
  }
  if (!opts.allowedHosts.includes(url.hostname)) {
    throw new Error(
      `[remark-code-source] Host "${url.hostname}" is not in allowedHosts ` +
        `(${opts.allowedHosts.join(', ')}). Add it to enable this import.`,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  let raw: string;
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'error' });
    if (!res.ok) {
      throw new Error(`[remark-code-source] Fetch failed (${res.status}) for ${base}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > opts.maxBytes) {
      throw new Error(
        `[remark-code-source] Remote file exceeds maxBytes ` +
          `(${buf.byteLength} > ${opts.maxBytes}): ${base}`,
      );
    }
    raw = new TextDecoder('utf8').decode(buf);
  } finally {
    clearTimeout(timer);
  }
  return sliceLines(raw, start, end);
}

/**
 * Remark plugin: replace fenced code blocks carrying `file=`/`url=` meta with
 * the referenced source. Use it before the highlighter in any unified pipeline.
 */
export function remarkCodeSource(userOptions: CodeSourceOptions = {}) {
  const opts: Required<CodeSourceOptions> = {
    allowedHosts: userOptions.allowedHosts ?? DEFAULT_ALLOWED_HOSTS,
    timeoutMs: userOptions.timeoutMs ?? 10_000,
    maxBytes: userOptions.maxBytes ?? 512 * 1024,
  };

  return async function transformer(tree: unknown, file: VFileLike): Promise<void> {
    const jobs: Promise<void>[] = [];

    visit(tree as never, 'code', (node: CodeNode) => {
      if (!node.meta) return;
      const parsed = parseSource(node.meta);
      if (!parsed) return;

      jobs.push(
        (parsed.kind === 'file'
          ? readLocal(parsed.ref, file)
          : readRemote(parsed.ref, opts)
        ).then((value) => {
          node.value = value;
          // Drop the import attribute; keep the rest for the highlighter.
          node.meta = parsed.rest || null;
        }),
      );
    });

    await Promise.all(jobs);
  };
}

export default remarkCodeSource;
