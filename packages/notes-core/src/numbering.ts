/**
 * Build-time auto-numbering for referenceable blocks (notes engine).
 *
 * Parses every note under a site's `content/` directory and assigns each labeled
 * block (`<Callout id>`, `<Algorithm id>`, `<Listing id>`) a hierarchical number
 * of the form `[part.][chapter.]section[.subsection].n`, where:
 *
 * - `part` / `chapter` come from the page's frontmatter (`part:` / `chapter:`),
 * - `section` / `subsection` are auto-derived from `##` / `###` headings,
 * - `n` is a per-type running counter that resets at every heading.
 *
 * The result is exposed as the `virtual:numbering` module (`{ byId }`), consumed
 * by the block components (to render their own number) and `<Ref id />` (to
 * resolve a cross-page link). Everything happens at build time — no runtime JS,
 * no layout shift, and references stay correct because numbers are never typed
 * by hand.
 *
 * IMPORTANT authoring rule: on a numbered block, `id` must be the FIRST
 * attribute, e.g. `<Algorithm id="kmp" …/>`, so the parser can find it reliably
 * without fully parsing JSX (the `code={…}` prop can contain `<`, `>` and `{`).
 */
import type { AstroIntegration } from 'astro';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

export interface NumberEntry {
  number: string;
  label: string;
  url: string;
  type: 'Callout' | 'Algorithm' | 'Listing';
}
export interface NumberingMap {
  byId: Record<string, NumberEntry>;
}

type BlockType = NumberEntry['type'];

const DEFAULT_LABEL: Record<BlockType, string> = {
  Callout: 'Note',
  Algorithm: 'Algorithm',
  Listing: 'Listing',
};
const CALLOUT_TYPE_LABEL: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  caution: 'Caution',
  warning: 'Warning',
  danger: 'Danger',
};

/** Read a `name="value"` (or `'value'`) attribute out of a raw tag's attrs. */
function attr(attrs: string, name: string): string | undefined {
  const m = attrs.match(new RegExp(`\\b${name}=["']([^"']*)["']`));
  return m ? m[1] : undefined;
}

/** Read a scalar `key: value` out of a YAML frontmatter block. */
function frontmatterValue(fm: string, key: string): string | undefined {
  const m = fm.match(new RegExp(`^[ \\t]*${key}:[ \\t]*["']?([^"'\\n]+?)["']?[ \\t]*$`, 'm'));
  return m ? m[1].trim() : undefined;
}

/** Strip frontmatter, fenced code, `code={\`…\`}` props and inline code. */
function stripNoise(src: string): string {
  return src
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, '') // frontmatter
    .replace(/```[\s\S]*?```/g, '') // fenced code
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/code=\{`[\s\S]*?`\}/g, 'code={``}') // Algorithm code prop
    .replace(/`[^`\n]*`/g, ''); // inline code
}

/** Map a content file path to its route, honoring a frontmatter `slug`. */
function toUrl(contentDir: string, file: string, fm: string): string {
  const slug = frontmatterValue(fm, 'slug');
  if (slug) return '/' + slug.replace(/^\/+/, '').replace(/\/+$/, '');
  let rel = path.relative(contentDir, file).split(path.sep).join('/').replace(/\.(mdx|md)$/, '');
  if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
  if (rel === 'index') rel = '';
  return '/' + rel;
}

/** Recursively collect every `.md` / `.mdx` file under a directory. */
function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.mdx?$/.test(e.name)) out.push(p);
  }
  return out;
}

const TOKEN =
  /(?:^|\n)(#{2,6})[ \t]+[^\n]*|<(Callout|Algorithm|Listing)\s+id=["']([^"']+)["']([^>]*?)\/?>/g;

/** Parse all notes and compute the id → number map. */
export function buildNumberingMap(contentDir: string): NumberingMap {
  const byId: Record<string, NumberEntry> = {};

  for (const file of walk(contentDir)) {
    const raw = fs.readFileSync(file, 'utf8');
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const url = toUrl(contentDir, file, fm);
    const part = frontmatterValue(fm, 'part') ?? '';
    const chapter = frontmatterValue(fm, 'chapter') ?? '';
    const body = stripNoise(raw);

    let section = 0;
    let subsection = 0;
    const counters: Record<BlockType, number> = { Callout: 0, Algorithm: 0, Listing: 0 };
    const resetCounters = () => {
      counters.Callout = 0;
      counters.Algorithm = 0;
      counters.Listing = 0;
    };

    TOKEN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TOKEN.exec(body))) {
      if (m[1]) {
        // Heading: level 2 = section, level 3 = subsection, deeper ignored.
        const level = m[1].length;
        if (level === 2) {
          section += 1;
          subsection = 0;
          resetCounters();
        } else if (level === 3) {
          subsection += 1;
          resetCounters();
        }
      } else if (m[2]) {
        // A numbered block.
        const type = m[2] as BlockType;
        const id = m[3];
        const attrs = m[4] ?? '';
        counters[type] += 1;

        const levels: (string | number)[] = [];
        if (part) levels.push(part);
        if (chapter) levels.push(chapter);
        if (section > 0) levels.push(section);
        if (subsection > 0) levels.push(subsection);
        levels.push(counters[type]);

        const label =
          attr(attrs, 'label') ??
          (type === 'Callout' ? CALLOUT_TYPE_LABEL[attr(attrs, 'type') ?? 'note'] ?? 'Note' : DEFAULT_LABEL[type]);

        byId[id] = { number: levels.join('.'), label, url, type };
      }
    }
  }

  return { byId };
}

const VIRTUAL_ID = 'virtual:numbering';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/**
 * Astro integration that serves the computed numbering map as `virtual:numbering`
 * and refreshes it whenever a note changes in dev. Added by default to every
 * notes site through {@link defineDocsAstroConfig}.
 */
export function numbering(): AstroIntegration {
  let contentDir = '';
  return {
    name: 'notes-core-numbering',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        contentDir = fileURLToPath(new URL('content/', config.root));
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'virtual-numbering',
                resolveId(id: string) {
                  if (id === VIRTUAL_ID) return RESOLVED_ID;
                },
                load(id: string) {
                  if (id === RESOLVED_ID) {
                    return `export default ${JSON.stringify(buildNumberingMap(contentDir))};`;
                  }
                },
                handleHotUpdate({ file, server }: { file: string; server: any }) {
                  if (/\.mdx?$/.test(file)) {
                    const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
                    if (mod) server.moduleGraph.invalidateModule(mod);
                    server.ws.send({ type: 'full-reload' });
                  }
                },
              },
            ],
          },
        });
      },
    },
  };
}
