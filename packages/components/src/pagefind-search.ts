/**
 * Custom Pagefind search controller, shared by the blog and notes engines.
 *
 * Unlike the bundled `PagefindUI` widget — which only renders its filter panel
 * *after* a query runs — this controller drives Pagefind through its JavaScript
 * API directly so the available filters (tags, categories, notebooks) are shown
 * up front. A visitor can therefore pick a scope and browse with zero typing,
 * or search first and narrow afterwards; both directions update live.
 *
 * It is the same engine and the same static assets as the widget (`pagefind.js`
 * plus the chunked WASM index under `/pagefind/`), so it stays fully offline:
 * once the page and those chunks are cached by the service worker, no network
 * is involved. Indexes load lazily per alphabetical chunk, so nothing here
 * downloads the whole index.
 *
 * The controller is wired up by {@link ../PagefindSearch.astro}, which renders
 * the markup skeleton and passes configuration through `data-*` attributes.
 */

interface FilterCounts {
  [value: string]: number;
}

interface FilterGroups {
  [key: string]: FilterCounts;
}

interface SubResult {
  title: string;
  url: string;
  excerpt: string;
}

interface ResultData {
  url: string;
  meta: { title?: string;[key: string]: string | undefined };
  excerpt: string;
  sub_results?: SubResult[];
}

interface Result {
  id: string;
  data: () => Promise<ResultData>;
}

interface SearchResponse {
  results: Result[];
  filters?: FilterGroups;
}

interface PagefindApi {
  options: (opts: Record<string, unknown>) => Promise<void>;
  init: () => Promise<void>;
  filters: () => Promise<FilterGroups>;
  search: (
    term: string | null,
    opts?: { filters?: Record<string, string[]>; sort?: Record<string, string> },
  ) => Promise<SearchResponse>;
  preload?: (term: string, opts?: { filters?: Record<string, string[]> }) => void;
}

/** A sort option offered in the widget's "Sort by" dropdown (#1). */
interface SortOption {
  /** Stable id, also the option value, e.g. `date-desc`. */
  id: string;
  /** Label shown in the dropdown, e.g. `Newest`. */
  label: string;
  /** Pagefind sort key tagged on pages, e.g. `date`. */
  key: string;
  /** Sort direction. */
  dir: 'asc' | 'desc';
}

/** A metadata field rendered in the result card's meta line (#2). */
interface MetaField {
  /** Pagefind meta key, e.g. `category`. */
  key: string;
  /** Built-in icon shown before the value. */
  icon?: 'category' | 'tag' | 'notebook' | 'clock' | 'calendar';
}


/** Per-filter-key presentation, configured by the host route. */
interface FilterMeta {
  /** Pretty group heading. Defaults to the title-cased key. */
  label?: string;
  /** Base path for the taxonomy page; when set, the chip label links to
   *  `${hrefBase}${slugify(value)}`. Omit to make the whole chip a filter
   *  toggle with no navigation. */
  hrefBase?: string;
  /** Name of a built-in icon to show before the label. */
  icon?: 'category' | 'tag' | 'notebook';
}

type FilterConfig = Record<string, FilterMeta>;

/** Inner SVG markup for the built-in chip icons (static, internal only). */
const ICON_PATHS: Record<string, string> = {
  category:
    '<path d="M2 8a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v1H4z"/><path d="M2 11h18.5a1.5 1.5 0 0 1 1.45 1.9l-1.4 5A2 2 0 0 1 18.6 19H4a2 2 0 0 1-2-2z"/>',
  tag: '<path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59A2 2 0 0 0 3.83 11l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83z"/><circle cx="7" cy="7" r="1.2"/>',
  notebook:
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
};

/** Turn a filter key like `notebook` into a display label like `Notebook`. */
function titleCase(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Mirror of the engines' server-side `slugify` for building taxonomy URLs. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Build an inline icon element from the built-in {@link ICON_PATHS}. */
function makeIcon(name: string | undefined): SVGElement | null {
  if (!name || !ICON_PATHS[name]) return null;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'pf-chip-icon');
  svg.innerHTML = ICON_PATHS[name];
  return svg;
}

/**
 * Boot a single search widget rooted at `root`. Reads its configuration from
 * `data-*` attributes, loads Pagefind, renders the filter chips, applies any
 * `?key=value` deep-link scope and then runs searches as the user interacts.
 */
export async function initPagefindSearch(root: HTMLElement): Promise<void> {
  const bundlePath = root.dataset.pfBundle || '/pagefind/';
  const pageSize = Number(root.dataset.pfPageSize || '8') || 8;
  const filterConfig = parseFilterConfig(root.dataset.pfFilters);
  const sortOptions = parseJsonArray<SortOption>(root.dataset.pfSorts);
  const metaFields = parseJsonArray<MetaField>(root.dataset.pfMeta);
  const highlight = root.dataset.pfHighlight === 'true';

  const filtersEl = root.querySelector<HTMLElement>('.pf-filters')!;
  const sortEl = root.querySelector<HTMLSelectElement>('.pf-sort')!;
  const sortWrapEl = root.querySelector<HTMLElement>('.pf-sortwrap')!;
  const scopeEl = root.querySelector<HTMLElement>('.pf-scope')!;
  const input = root.querySelector<HTMLInputElement>('.pf-input')!;
  const clearBtn = root.querySelector<HTMLButtonElement>('.pf-clear')!;
  const statusEl = root.querySelector<HTMLElement>('.pf-status')!;
  const resultsEl = root.querySelector<HTMLElement>('.pf-results')!;
  const moreBtn = root.querySelector<HTMLButtonElement>('.pf-more')!;
  const fallbackEl = root.querySelector<HTMLElement>('.pf-fallback')!;

  // The bundle is emitted at build time and is absent on the dev server. A
  // non-analysable dynamic import keeps the bundler from trying to resolve it.
  // Pagefind detects its bundle directory from this script's URL, so no
  // `bundlePath` option is needed (passing one logs an "unknown option" warning).
  let pagefind: PagefindApi;
  try {
    pagefind = (await import(/* @vite-ignore */ `${bundlePath}pagefind.js`)) as PagefindApi;
    // (#4) Append the matched term as `?highlight=` to result URLs so the
    // destination page can mark it (see the PagefindHighlight script in the
    // article layouts). Must be set before init.
    if (highlight) await pagefind.options({ highlightParam: 'highlight' });
    await pagefind.init();
  } catch {
    fallbackEl.hidden = false;
    return;
  }

  renderSortOptions();

  /** Currently selected filter values, keyed by filter name. */
  const active = new Map<string, Set<string>>();
  let results: Result[] = [];
  let shown = 0;
  /** Normalized query words, used to tighten excerpt highlights (see runSearch). */
  let queryTerms: string[] = [];

  const groups = await pagefind.filters();
  renderFilters(groups);
  applyDeepLinks(Object.keys(groups));
  updateScope();
  await runSearch();

  // --- rendering -----------------------------------------------------------

  /** (#1) Populate the "Sort by" dropdown, or hide it when no sorts configured. */
  function renderSortOptions(): void {
    if (sortOptions.length === 0) {
      sortWrapEl.hidden = true;
      return;
    }
    sortWrapEl.hidden = false;
    sortEl.replaceChildren();
    const relevance = document.createElement('option');
    relevance.value = '';
    relevance.textContent = 'Relevance';
    sortEl.appendChild(relevance);
    for (const opt of sortOptions) {
      const el = document.createElement('option');
      el.value = opt.id;
      el.textContent = opt.label;
      sortEl.appendChild(el);
    }
  }

  /** The Pagefind `sort` object for the current dropdown selection, if any. */
  function buildSort(): Record<string, string> | undefined {
    const chosen = sortOptions.find((o) => o.id === sortEl.value);
    return chosen ? { [chosen.key]: chosen.dir } : undefined;
  }

  function renderFilters(all: FilterGroups): void {
    filtersEl.replaceChildren();
    for (const key of Object.keys(all).sort()) {
      const counts = all[key];
      const values = Object.keys(counts).sort((a, b) => a.localeCompare(b));
      if (values.length === 0) continue;

      const group = document.createElement('div');
      group.className = 'pf-group';

      const label = document.createElement('span');
      label.className = 'pf-group-label';
      label.textContent = filterConfig[key]?.label || titleCase(key);
      group.appendChild(label);

      const chips = document.createElement('div');
      chips.className = 'pf-chips';
      for (const value of values) {
        chips.appendChild(makeChip(key, value, counts[value]));
      }
      group.appendChild(chips);
      filtersEl.appendChild(group);
    }
    filtersEl.hidden = filtersEl.childElementCount === 0;
  }

  function makeChip(key: string, value: string, count: number): HTMLElement {
    const meta = filterConfig[key] ?? {};
    const linkable = Boolean(meta.hrefBase);

    const onToggle = () => {
      toggleChip(key, value);
      updateScope();
      void runSearch();
    };

    const buildMain = (el: HTMLElement) => {
      el.classList.add('pf-chip-main');
      const icon = makeIcon(meta.icon);
      if (icon) el.appendChild(icon);
      const text = document.createElement('span');
      text.className = 'pf-chip-label';
      text.textContent = value;
      el.appendChild(text);
    };

    // Linkable: the label navigates to the taxonomy page, while a separate
    // count segment toggles the in-page filter.
    if (linkable) {
      const chip = document.createElement('div');
      chip.className = 'pf-chip';
      chip.dataset.key = key;
      chip.dataset.value = value;

      const link = document.createElement('a');
      link.href = `${meta.hrefBase}${slugify(value)}`;
      buildMain(link);

      const countBtn = document.createElement('button');
      countBtn.type = 'button';
      countBtn.className = 'pf-chip-count';
      countBtn.textContent = String(count);
      countBtn.setAttribute('aria-pressed', 'false');
      countBtn.setAttribute('aria-label', `Filter results by ${value}`);
      countBtn.addEventListener('click', onToggle);

      chip.append(link, countBtn);
      return chip;
    }

    // Filter-only: the whole chip toggles, with a non-interactive count segment.
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'pf-chip pf-chip--toggle';
    chip.dataset.key = key;
    chip.dataset.value = value;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', onToggle);

    const main = document.createElement('span');
    buildMain(main);

    const badge = document.createElement('span');
    badge.className = 'pf-chip-count';
    badge.textContent = String(count);

    chip.append(main, badge);
    return chip;
  }

  function renderCard(d: ResultData): HTMLElement {
    const card = document.createElement('article');
    card.className = 'pf-result';

    const heading = document.createElement('h2');
    heading.className = 'pf-result-title';
    const link = document.createElement('a');
    link.href = d.url;
    link.textContent = d.meta?.title || d.url;
    heading.appendChild(link);
    card.appendChild(heading);

    // (#2) Meta line built from configured metadata fields present on the page.
    if (metaFields.length > 0) {
      const items: HTMLElement[] = [];
      for (const field of metaFields) {
        const value = d.meta?.[field.key];
        if (!value) continue;
        const item = document.createElement('span');
        item.className = 'pf-meta-item';
        const icon = makeIcon(field.icon);
        if (icon) item.appendChild(icon);
        item.appendChild(document.createTextNode(value));
        items.push(item);
      }
      if (items.length > 0) {
        const metaLine = document.createElement('p');
        metaLine.className = 'pf-result-meta';
        items.forEach((item, i) => {
          if (i > 0) {
            const dot = document.createElement('span');
            dot.className = 'pf-meta-dot';
            dot.setAttribute('aria-hidden', 'true');
            dot.textContent = '\u00b7';
            metaLine.appendChild(dot);
          }
          metaLine.appendChild(item);
        });
        card.appendChild(metaLine);
      }
    }

    const excerpt = document.createElement('p');
    excerpt.className = 'pf-excerpt';
    // Pagefind HTML-entity-encodes excerpts before adding its <mark> tags, so
    // this is safe to assign as innerHTML (see Pagefind API docs). We first
    // tighten the marks so only the matched word stays highlighted, not the
    // whole whitespace token (e.g. `Note(string` → `Note(` + marked `string`).
    excerpt.innerHTML = tightenExcerpt(d.excerpt, queryTerms);
    card.appendChild(excerpt);

    const subs = (d.sub_results ?? []).filter((s) => s.url !== d.url).slice(0, 3);
    if (subs.length > 0) {
      const list = document.createElement('ul');
      list.className = 'pf-subresults';
      for (const sub of subs) {
        const item = document.createElement('li');
        const subLink = document.createElement('a');
        subLink.href = sub.url;
        subLink.textContent = sub.title;
        item.appendChild(subLink);
        list.appendChild(item);
      }
      card.appendChild(list);
    }
    return card;
  }

  // --- state ---------------------------------------------------------------

  function setChip(key: string, value: string, on: boolean): void {
    let set = active.get(key);
    if (!set) {
      set = new Set();
      active.set(key, set);
    }
    if (on) set.add(value);
    else set.delete(value);
    if (set.size === 0) active.delete(key);

    const chip = findChip(key, value);
    if (chip) {
      chip.classList.toggle('is-active', on);
      // The toggle control is the whole chip (filter-only) or its count button.
      const toggle = chip.matches('button') ? chip : chip.querySelector('.pf-chip-count');
      toggle?.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function toggleChip(key: string, value: string): void {
    const on = !active.get(key)?.has(value);
    setChip(key, value, on);
  }

  function findChip(key: string, value: string): HTMLButtonElement | null {
    for (const chip of filtersEl.querySelectorAll<HTMLButtonElement>('.pf-chip')) {
      if (chip.dataset.key === key && chip.dataset.value === value) return chip;
    }
    return null;
  }

  function buildFilters(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const [key, set] of active) {
      if (set.size > 0) out[key] = [...set];
    }
    return out;
  }

  function applyDeepLinks(keys: string[]): void {
    const params = new URLSearchParams(window.location.search);
    for (const key of keys) {
      for (const value of params.getAll(key)) {
        if (findChip(key, value)) setChip(key, value, true);
      }
    }
  }

  function updateScope(): void {
    const parts: string[] = [];
    for (const [, set] of active) parts.push(...set);
    if (parts.length === 0) {
      scopeEl.hidden = true;
      scopeEl.replaceChildren();
      return;
    }
    scopeEl.hidden = false;
    scopeEl.replaceChildren();
    scopeEl.append('Scoped to ');
    const strong = document.createElement('strong');
    strong.textContent = parts.join(', ');
    scopeEl.appendChild(strong);
    scopeEl.append('. ');
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'pf-clear-filters';
    clear.textContent = 'Clear filters';
    clear.addEventListener('click', clearFilters);
    scopeEl.appendChild(clear);
  }

  function clearFilters(): void {
    for (const [key, set] of [...active]) {
      for (const value of [...set]) setChip(key, value, false);
    }
    updateScope();
    void runSearch();
  }

  // --- searching -----------------------------------------------------------

  async function runSearch(): Promise<void> {
    const term = input.value.trim();
    const filters = buildFilters();
    const hasFilters = Object.keys(filters).length > 0;
    clearBtn.hidden = term.length === 0;

    // Split the query into normalized words so excerpt highlights can be
    // tightened to the matched word rather than the whole whitespace token.
    queryTerms = term
      ? term
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .map(normalizeWord)
      : [];

    if (!term && !hasFilters) {
      results = [];
      shown = 0;
      resultsEl.replaceChildren();
      moreBtn.hidden = true;
      statusEl.textContent = 'Type to search, or pick a filter to browse.';
      return;
    }

    const search = await pagefind.search(term || null, { filters, sort: buildSort() });
    results = search.results;
    shown = 0;
    resultsEl.replaceChildren();
    if (search.filters) refreshCounts(search.filters);

    if (results.length === 0) {
      moreBtn.hidden = true;
      statusEl.textContent = term ? `No results for “${term}”.` : 'No results match these filters.';
      return;
    }
    statusEl.textContent = `${results.length} result${results.length === 1 ? '' : 's'}.`;
    await renderMore();
  }

  async function renderMore(): Promise<void> {
    const slice = results.slice(shown, shown + pageSize);
    const data = await Promise.all(slice.map((r) => r.data()));
    for (const d of data) resultsEl.appendChild(renderCard(d));
    shown += slice.length;
    moreBtn.hidden = shown >= results.length;
  }

  /** Update each chip's count from the live facet counts of the last search. */
  function refreshCounts(live: FilterGroups): void {
    for (const chip of filtersEl.querySelectorAll<HTMLButtonElement>('.pf-chip')) {
      const key = chip.dataset.key!;
      const value = chip.dataset.value!;
      const count = live[key]?.[value] ?? 0;
      const badge = chip.querySelector('.pf-chip-count');
      if (badge) badge.textContent = String(count);
      const isActive = active.get(key)?.has(value) ?? false;
      chip.classList.toggle('is-empty', count === 0 && !isActive);
    }
  }

  // --- events --------------------------------------------------------------

  let debounce: ReturnType<typeof setTimeout> | undefined;
  input.addEventListener('input', () => {
    pagefind.preload?.(input.value.trim(), { filters: buildFilters() });
    clearTimeout(debounce);
    debounce = setTimeout(() => void runSearch(), 250);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    input.focus();
    void runSearch();
  });

  sortEl.addEventListener('change', () => void runSearch());

  moreBtn.addEventListener('click', () => void renderMore());
}

function parseFilterConfig(raw: string | undefined): FilterConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as FilterConfig) : {};
  } catch {
    return {};
  }
}

/** Parse a `data-*` attribute holding a JSON array; returns `[]` on any error. */
function parseJsonArray<T>(raw: string | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Lowercase + strip diacritics, mirroring Pagefind's normalization for
 *  prefix comparison (e.g. `Café` → `cafe`). */
function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Re-tighten Pagefind's excerpt highlights.
 *
 * Pagefind matches at token granularity (splitting on punctuation) but
 * highlights at whitespace-word granularity, so a glued word like `Note(string`
 * or `std::string{"notes"}` gets fully wrapped in a single <mark> even though
 * only `string` matched. This walks each <mark>, splits it back into
 * word/punctuation runs, and keeps the <mark> only around word runs that match
 * a query term (by the same bidirectional prefix rule Pagefind uses). Glued
 * punctuation and unrelated sub-words become plain text.
 *
 * If a mark contains no word that matches (unexpected), Pagefind's original
 * mark is left untouched so a highlight is never silently dropped.
 */
function tightenExcerpt(html: string, terms: string[]): string {
  if (terms.length === 0) return html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  for (const mark of [...tpl.content.querySelectorAll('mark')]) {
    const text = mark.textContent ?? '';
    // Split keeping delimiters: word runs (letters/numbers) vs everything else.
    const parts = text.split(/([^\p{L}\p{N}]+)/u).filter(Boolean);
    const frag = document.createDocumentFragment();
    let anyMatched = false;
    for (const part of parts) {
      const isWord = /[\p{L}\p{N}]/u.test(part);
      const norm = isWord ? normalizeWord(part) : '';
      const matches =
        isWord && terms.some((t) => norm.startsWith(t) || t.startsWith(norm));
      if (matches) {
        const m = document.createElement('mark');
        m.textContent = part;
        frag.appendChild(m);
        anyMatched = true;
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    }
    if (anyMatched) mark.replaceWith(frag);
  }
  return tpl.innerHTML;
}
