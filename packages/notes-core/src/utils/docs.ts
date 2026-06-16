import type { ImageMetadata } from 'astro';
import type { DocEntry } from '../content';
import type { SidebarConfig } from '../schema';
import { humanize, slugify } from './format';

/** Drafts are only visible outside production builds. */
const includeDrafts = import.meta.env.DEV;

// ─── Sidebar tree types ──────────────────────────────────────────────────────

export interface SidebarLeaf {
  type: 'doc';
  label: string;
  href: string;
  id?: string;
  badge?: string;
  isExternal?: boolean;
}

export interface SidebarGroup {
  type: 'group';
  label: string;
  href?: string;
  badge?: string;
  collapsed: boolean;
  items: SidebarNode[];
}

export type SidebarNode = SidebarLeaf | SidebarGroup;

/** A flattened reading-order stop, used for previous/next navigation. */
export interface DocLink {
  label: string;
  href: string;
}

export interface Breadcrumb {
  label: string;
  href?: string;
}

/** A sub-note ("notebook"): a self-contained top-level handbook. */
export interface Notebook {
  /** Top-level folder segment (e.g. `cpp`). */
  id: string;
  /** Display label (from the folder index frontmatter, else a humanized id). */
  label: string;
  description?: string;
  /** Optional author shown on the hub card. */
  author?: string;
  /** Accent emoji/glyph (used when no `coverImage` is set). */
  cover?: string;
  /** Optional optimised cover image (local) or URL string (remote). */
  coverImage?: ImageMetadata | string;
  badge?: string;
  /** Landing route, `/<id>`. */
  href: string;
  /** Sort order from the folder index `sidebar.order` (Infinity when unset). */
  order: number;
}

// ─── Path helpers ────────────────────────────────────────────────────────────

/** Normalise to a leading-slash, no-trailing-slash path. */
export function normalizePath(input: string): string {
  let s = (input ?? '').trim().replace(/\\/g, '/');
  if (!s.startsWith('/')) s = `/${s}`;
  s = s.replace(/\/{2,}/g, '/');
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s === '' ? '/' : s;
}

/** Convert a collection id (path without extension) to a route path. */
function idToPath(id: string): string {
  let s = id.replace(/\\/g, '/').replace(/\.(mdx?|markdown)$/i, '');
  if (s === 'index' || s === '') return '/';
  s = s.replace(/\/index$/i, '');
  return normalizePath(`/${s}`);
}

/** The route path for an entry — honours a custom `slug`, else the path slug. */
export function entrySlug(entry: DocEntry): string {
  const custom = entry.data.slug;
  return custom ? normalizePath(custom) : idToPath(entry.id);
}

/** The `[...slug]` route param (no leading slash) for an entry. */
export function entryParam(entry: DocEntry): string {
  return entrySlug(entry).replace(/^\//, '');
}

/** The sidebar/page label for an entry. */
export function entryLabel(entry: DocEntry): string {
  return entry.data.sidebar?.label ?? entry.data.title;
}

function entryOrder(entry: DocEntry): number {
  return entry.data.sidebar?.order ?? Number.POSITIVE_INFINITY;
}

/** True for the root landing note (`index.mdx` at the collection root). */
export function isRootIndex(entry: DocEntry): boolean {
  const id = entry.id.replace(/\.(mdx?|markdown)$/i, '');
  return id === 'index' || id === '';
}

/** Folder-landing index (e.g. `basics/index`) — represents its parent folder. */
function isFolderIndex(entry: DocEntry): boolean {
  const id = entry.id.replace(/\.(mdx?|markdown)$/i, '');
  return /\/index$/i.test(id);
}

/** id split into folder segments (path without the file basename). */
function folderSegments(entry: DocEntry): string[] {
  const id = entry.id.replace(/\.(mdx?|markdown)$/i, '');
  const parts = id.split('/');
  if (isFolderIndex(entry)) return parts.slice(0, -1);
  return parts.slice(0, -1);
}

function visible(entry: DocEntry): boolean {
  if (entry.data.draft && !includeDrafts) return false;
  if (entry.data.sidebar?.hidden) return false;
  return true;
}

// ─── Auto sidebar generation ─────────────────────────────────────────────────

interface BuildGroup {
  segment: string;
  label: string;
  hasExplicitLabel: boolean;
  href?: string;
  badge?: string;
  order: number;
  children: Map<string, BuildGroup>;
  leaves: Array<{ label: string; href: string; id: string; badge?: string; order: number }>;
}

function emptyGroup(segment: string): BuildGroup {
  return {
    segment,
    label: humanize(segment),
    hasExplicitLabel: false,
    order: Number.POSITIVE_INFINITY,
    children: new Map(),
    leaves: [],
  };
}

function buildAutoSidebar(entries: DocEntry[]): SidebarNode[] {
  const root = emptyGroup('');

  for (const entry of entries) {
    if (!visible(entry) || isRootIndex(entry)) continue;

    const segs = folderSegments(entry);
    let group = root;
    for (const seg of segs) {
      let child = group.children.get(seg);
      if (!child) {
        child = emptyGroup(seg);
        group.children.set(seg, child);
      }
      group = child;
    }

    if (isFolderIndex(entry)) {
      // This entry describes the group it lives in.
      group.label = entryLabel(entry);
      group.hasExplicitLabel = true;
      group.href = entrySlug(entry);
      group.badge = entry.data.sidebar?.badge;
      group.order = entryOrder(entry);
    } else {
      group.leaves.push({
        label: entryLabel(entry),
        href: entrySlug(entry),
        id: entry.id,
        badge: entry.data.sidebar?.badge,
        order: entryOrder(entry),
      });
    }
  }

  const nodes = groupToNodes(root);

  // Prepend the root landing page as an "Overview" stop when present.
  const rootEntry = entries.find((e) => visible(e) && isRootIndex(e));
  if (rootEntry) {
    nodes.unshift({
      type: 'doc',
      label: entryLabel(rootEntry),
      href: '/',
      id: rootEntry.id,
    });
  }

  return nodes;
}

function groupToNodes(group: BuildGroup): SidebarNode[] {
  const childGroups: Array<{ order: number; label: string; node: SidebarGroup }> = [];
  for (const child of group.children.values()) {
    childGroups.push({
      order: child.order,
      label: child.label,
      node: {
        type: 'group',
        label: child.label,
        href: child.href,
        badge: child.badge,
        collapsed: true,
        items: groupToNodes(child),
      },
    });
  }

  const leafNodes = group.leaves.map((l) => ({
    order: l.order,
    label: l.label,
    node: {
      type: 'doc' as const,
      label: l.label,
      href: l.href,
      id: l.id,
      badge: l.badge,
    },
  }));

  return [...childGroups, ...leafNodes]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((x) => x.node);
}
// ─── Notebooks (sub-notes) ───────────────────────────────────────

/** The notebook (top-level folder) an entry belongs to, or null for root. */
export function notebookSegment(entry: DocEntry): string | null {
  if (isRootIndex(entry)) return null;
  const id = entry.id.replace(/\.(mdx?|markdown)$/i, '');
  return id.split('/')[0] || null;
}

/** True for a notebook's own landing note (`<id>/index` or a top-level `<id>`). */
function isNotebookLanding(entry: DocEntry, id: string): boolean {
  const eid = entry.id.replace(/\.(mdx?|markdown)$/i, '');
  return eid === `${id}/index` || eid === id;
}

/** Discover the notebooks present in a set of entries, ordered for the hub. */
export function getNotebooks(entries: DocEntry[]): Notebook[] {
  const map = new Map<string, { landing?: DocEntry }>();
  for (const entry of entries) {
    if (!visible(entry) || isRootIndex(entry)) continue;
    const id = notebookSegment(entry);
    if (!id) continue;
    const rec = map.get(id) ?? {};
    if (isNotebookLanding(entry, id)) rec.landing = entry;
    map.set(id, rec);
  }
  return [...map.entries()]
    .map(([id, rec]) => ({
      id,
      label: rec.landing ? entryLabel(rec.landing) : humanize(id),
      description: rec.landing?.data.description || undefined,
      author: rec.landing?.data.author,
      cover: rec.landing?.data.cover,
      coverImage: rec.landing?.data.coverImage,
      badge: rec.landing?.data.sidebar?.badge,
      href: normalizePath(`/${id}`),
      order: rec.landing ? entryOrder(rec.landing) : Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

/** Build a sidebar tree scoped to a single notebook. */
function buildNotebookSidebar(
  entries: DocEntry[],
  notebook: Notebook,
): SidebarNode[] {
  const scoped = entries.filter(
    (e) => notebookSegment(e) === notebook.id && visible(e),
  );
  const root = emptyGroup('');

  for (const entry of scoped) {
    if (isNotebookLanding(entry, notebook.id)) continue;
    // Drop the notebook segment so the tree is rooted inside the notebook.
    const segs = folderSegments(entry).slice(1);
    let group = root;
    for (const seg of segs) {
      let child = group.children.get(seg);
      if (!child) {
        child = emptyGroup(seg);
        group.children.set(seg, child);
      }
      group = child;
    }

    if (isFolderIndex(entry)) {
      group.label = entryLabel(entry);
      group.hasExplicitLabel = true;
      group.href = entrySlug(entry);
      group.badge = entry.data.sidebar?.badge;
      group.order = entryOrder(entry);
    } else {
      group.leaves.push({
        label: entryLabel(entry),
        href: entrySlug(entry),
        id: entry.id,
        badge: entry.data.sidebar?.badge,
        order: entryOrder(entry),
      });
    }
  }

  const nodes = groupToNodes(root);

  // The notebook's landing note becomes its "Overview" stop.
  const landing = scoped.find((e) => isNotebookLanding(e, notebook.id));
  nodes.unshift({
    type: 'doc',
    label: landing ? entryLabel(landing) : 'Overview',
    href: notebook.href,
    id: landing?.id,
  });
  return nodes;
}
// ─── Manual sidebar (sidebar.json) ───────────────────────────────────────────

function buildConfigSidebar(
  config: SidebarConfig,
  byId: Map<string, DocEntry>,
): SidebarNode[] {
  return config.map((item) => configItemToNode(item, byId));
}

function configItemToNode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any,
  byId: Map<string, DocEntry>,
): SidebarNode {
  if (Array.isArray(item.items)) {
    return {
      type: 'group',
      label: item.label,
      href: item.link ? normalizePath(item.link) : undefined,
      badge: item.badge,
      collapsed: item.collapsed ?? true,
      items: item.items.map((c: unknown) => configItemToNode(c, byId)),
    };
  }
  if (typeof item.doc === 'string') {
    const entry = byId.get(item.doc);
    return {
      type: 'doc',
      label: item.label ?? (entry ? entryLabel(entry) : humanize(item.doc)),
      href: entry ? entrySlug(entry) : normalizePath(item.doc),
      id: entry?.id ?? item.doc,
      badge: item.badge,
    };
  }
  // External / arbitrary link.
  const isExternal = /^[a-z]+:\/\//i.test(item.link);
  return {
    type: 'doc',
    label: item.label,
    href: isExternal ? item.link : normalizePath(item.link),
    badge: item.badge,
    isExternal,
  };
}

/**
 * Build the left sidebar tree. Auto-generates from the folder structure +
 * frontmatter by default; a non-empty `sidebar.json` (validated by
 * `sidebarSchema`) overrides it entirely.
 */
export function buildSidebar(
  entries: DocEntry[],
  sidebarConfig?: SidebarConfig,
): SidebarNode[] {
  if (sidebarConfig && sidebarConfig.length > 0) {
    const byId = new Map(entries.map((e) => [e.id.replace(/\.(mdx?|markdown)$/i, ''), e]));
    return buildConfigSidebar(sidebarConfig, byId);
  }
  return buildAutoSidebar(entries);
}

// ─── Flatten / navigation ────────────────────────────────────────────────────

/** Depth-first reading order of internal doc stops (for prev/next). */
export function flattenSidebar(nodes: SidebarNode[]): DocLink[] {
  const out: DocLink[] = [];
  const walk = (list: SidebarNode[]) => {
    for (const node of list) {
      if (node.type === 'group') {
        if (node.href) out.push({ label: node.label, href: node.href });
        walk(node.items);
      } else if (!node.isExternal) {
        out.push({ label: node.label, href: node.href });
      }
    }
  };
  walk(nodes);
  return out;
}

/** Trail of nodes (top → target) whose href matches `href`. */
function findTrail(
  nodes: SidebarNode[],
  href: string,
  trail: SidebarNode[] = [],
): SidebarNode[] | null {
  for (const node of nodes) {
    if (node.href === href) return [...trail, node];
    if (node.type === 'group') {
      const found = findTrail(node.items, href, [...trail, node]);
      if (found) return found;
    }
  }
  return null;
}

function breadcrumbsFor(tree: SidebarNode[], href: string): Breadcrumb[] {
  const trail = findTrail(tree, href);
  if (!trail) return [];
  return trail.map((n) => ({ label: n.label, href: n.href }));
}

// ─── Route building ──────────────────────────────────────────────────────────

export interface DocRouteProps {
  entry: DocEntry;
  tree: SidebarNode[];
  prev: DocLink | null;
  next: DocLink | null;
  breadcrumbs: Breadcrumb[];
  /** Present in notebooks mode: the notebook this doc belongs to. */
  notebook?: { id: string; label: string };
  /** Present in notebooks mode: a link back to the notebook hub. */
  backLink?: DocLink;
}

export interface DocRoute {
  params: { slug: string };
  props: DocRouteProps;
}

/** Assemble a single route's params + props from its (scoped) sidebar tree. */
function makeRoute(
  entry: DocEntry,
  tree: SidebarNode[],
  breadcrumbs: Breadcrumb[],
  notebook?: { id: string; label: string },
): DocRoute {
  const flat = flattenSidebar(tree);
  const href = entrySlug(entry);
  const i = flat.findIndex((l) => l.href === href);
  const props: DocRouteProps = {
    entry,
    tree,
    prev: i > 0 ? flat[i - 1] : null,
    next: i >= 0 && i < flat.length - 1 ? flat[i + 1] : null,
    breadcrumbs,
  };
  if (notebook) {
    props.notebook = notebook;
    props.backLink = { label: 'All notebooks', href: '/' };
  }
  return { params: { slug: entryParam(entry) }, props };
}

/**
 * Compute every `[...slug]` route (all notes except the root landing page),
 * attaching the sidebar tree, prev/next links and breadcrumbs.
 *
 * In notebooks mode each top-level folder is a self-contained handbook, so each
 * doc gets a sidebar scoped to its own notebook plus a link back to the hub. A
 * curated `sidebar.json` always takes precedence and keeps the single tree.
 */
export function buildDocRoutes(
  entries: DocEntry[],
  options: { sidebarConfig?: SidebarConfig; notebooks?: boolean } = {},
): DocRoute[] {
  const live = entries.filter((e) => !e.data.draft || includeDrafts);
  const docs = live.filter((e) => !isRootIndex(e));

  if (options.notebooks && !options.sidebarConfig) {
    const byId = new Map(getNotebooks(live).map((n) => [n.id, n]));
    const treeCache = new Map<string, SidebarNode[]>();

    return docs.map((entry) => {
      const id = notebookSegment(entry);
      const notebook = id ? byId.get(id) : undefined;
      if (!notebook) {
        // Stray top-level file with no notebook: route it with a self-only tree.
        const lone: SidebarNode[] = [
          { type: 'doc', label: entryLabel(entry), href: entrySlug(entry), id: entry.id },
        ];
        return makeRoute(entry, lone, []);
      }
      let tree = treeCache.get(notebook.id);
      if (!tree) {
        tree = buildNotebookSidebar(live, notebook);
        treeCache.set(notebook.id, tree);
      }
      const breadcrumbs: Breadcrumb[] = [
        { label: 'Home', href: '/' },
        ...breadcrumbsFor(tree, entrySlug(entry)),
      ];
      return makeRoute(entry, tree, breadcrumbs, {
        id: notebook.id,
        label: notebook.label,
      });
    });
  }

  const tree = buildSidebar(live, options.sidebarConfig);
  return docs.map((entry) =>
    makeRoute(entry, tree, breadcrumbsFor(tree, entrySlug(entry))),
  );
}

export interface HomeData {
  rootEntry: DocEntry | null;
  tree: SidebarNode[];
  next: DocLink | null;
  /** Notebook cards for the hub (empty unless notebooks mode is on). */
  notebooks: Notebook[];
}

/** Data for the landing page (`index.astro`). */
export function buildHomeData(
  entries: DocEntry[],
  options: { sidebarConfig?: SidebarConfig; notebooks?: boolean } = {},
): HomeData {
  const live = entries.filter((e) => !e.data.draft || includeDrafts);
  const tree = buildSidebar(live, options.sidebarConfig);
  const flat = flattenSidebar(tree);
  const rootEntry = live.find((e) => isRootIndex(e)) ?? null;
  // The first stop after "/" (or the very first stop if there is no root).
  const rootIdx = flat.findIndex((l) => l.href === '/');
  const next =
    rootIdx >= 0 ? flat[rootIdx + 1] ?? null : flat[0] ?? null;
  const notebooks =
    options.notebooks && !options.sidebarConfig ? getNotebooks(live) : [];
  return { rootEntry, tree, next, notebooks };
}

/** Edit-this-page URL for an entry, if an edit base is configured. */
export function editUrl(
  entry: DocEntry,
  editUrlBase?: string,
): string | undefined {
  if (!editUrlBase) return undefined;
  const base = editUrlBase.replace(/\/+$/, '');
  return `${base}/${entry.id}`;
}

export { slugify };
