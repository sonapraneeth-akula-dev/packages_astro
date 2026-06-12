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
}

export interface DocRoute {
  params: { slug: string };
  props: DocRouteProps;
}

/**
 * Compute every `[...slug]` route (all notes except the root landing page),
 * attaching the shared sidebar tree, prev/next links and breadcrumbs.
 */
export function buildDocRoutes(
  entries: DocEntry[],
  options: { sidebarConfig?: SidebarConfig } = {},
): DocRoute[] {
  const live = entries.filter((e) => !e.data.draft || includeDrafts);
  const tree = buildSidebar(live, options.sidebarConfig);
  const flat = flattenSidebar(tree);
  const indexByHref = new Map(flat.map((l, i) => [l.href, i]));

  return live
    .filter((e) => !isRootIndex(e))
    .map((entry) => {
      const href = entrySlug(entry);
      const i = indexByHref.get(href) ?? -1;
      return {
        params: { slug: entryParam(entry) },
        props: {
          entry,
          tree,
          prev: i > 0 ? flat[i - 1] : null,
          next: i >= 0 && i < flat.length - 1 ? flat[i + 1] : null,
          breadcrumbs: breadcrumbsFor(tree, href),
        },
      };
    });
}

export interface HomeData {
  rootEntry: DocEntry | null;
  tree: SidebarNode[];
  next: DocLink | null;
}

/** Data for the landing page (`index.astro`). */
export function buildHomeData(
  entries: DocEntry[],
  options: { sidebarConfig?: SidebarConfig } = {},
): HomeData {
  const live = entries.filter((e) => !e.data.draft || includeDrafts);
  const tree = buildSidebar(live, options.sidebarConfig);
  const flat = flattenSidebar(tree);
  const rootEntry = live.find((e) => isRootIndex(e)) ?? null;
  // The first stop after "/" (or the very first stop if there is no root).
  const rootIdx = flat.findIndex((l) => l.href === '/');
  const next =
    rootIdx >= 0 ? flat[rootIdx + 1] ?? null : flat[0] ?? null;
  return { rootEntry, tree, next };
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
