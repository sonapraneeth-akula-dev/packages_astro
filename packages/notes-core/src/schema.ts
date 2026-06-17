import { z } from 'astro/zod';

/**
 * Zod schemas shared across the docs engine.
 *
 * - `docFrontmatterSchema` validates every `.mdx` / `.md` note's frontmatter.
 * - `sidebarSchema` validates an optional `sidebar.json` that overrides the
 *   auto-generated left navigation (see {@link SidebarConfig}).
 */

/** Per-doc sidebar hints (label, ordering, badge, visibility). */
export const docSidebarMetaSchema = z.object({
  /** Override the label shown in the left sidebar (defaults to `title`). */
  label: z.string().optional(),
  /** Lower numbers sort first within a folder group. Defaults to Infinity. */
  order: z.number().optional(),
  /** Hide this entry from the sidebar (still routable). */
  hidden: z.boolean().default(false),
  /** Small badge text shown next to the sidebar label (e.g. "New"). */
  badge: z.string().optional(),
});

/**
 * Astro's content-collection `image()` helper. When a collection passes it,
 * `coverImage` resolves a local path to optimised {@link ImageMetadata};
 * otherwise it falls back to a plain string (e.g. a remote URL).
 */
type ImageHelper = () => z.ZodTypeAny;

/**
 * Frontmatter accepted on every note. A factory so the content collection can
 * pass Astro's `image()` helper (see {@link docsCollection}); call with no
 * argument for a plain, image-less schema.
 */
export function docFrontmatterSchema(image?: ImageHelper) {
  return z.object({
    /** Page + sidebar title. Required. */
    title: z.string(),
    /** Short summary used in metadata and the page lede. */
    description: z.string().default(''),
    /** Optional author shown on the notebook hub card. */
    author: z.string().optional(),
    /**
     * Optional group label used to cluster notebooks into sections on the hub
     * home page. Set on a notebook's landing note (`<id>/index.mdx`); notebooks
     * sharing the same `group` render under one heading. Notebooks without a
     * group fall into an unlabelled section shown last. Ignored outside
     * notebooks mode.
     */
    group: z.string().optional(),
    /**
     * Custom rendering slug. When omitted, the route defaults to the file's path
     * slug (e.g. `advanced/concurrency` for `advanced/concurrency.mdx`).
     * Accepts values with or without a leading slash.
     */
    slug: z.string().optional(),
    /** Per-doc sidebar metadata. */
    sidebar: docSidebarMetaSchema.optional(),
    /** Hide from listings / sidebar while drafting (only shown in dev). */
    draft: z.boolean().default(false),
    /** Optional last-updated date shown in the page header. */
    lastUpdated: z.coerce.date().optional(),
    /** Optional accent emoji/glyph shown in the page header. */
    cover: z.string().optional(),
    /**
     * Optional cover image for the notebook hub card. Local paths are optimised
     * at build time; a string (remote URL) is used as-is when no `image()`
     * helper is available.
     */
    coverImage: (image ? image() : z.string()).optional(),
    /** Hide the right-hand "On this page" table of contents. */
    tableOfContents: z.boolean().default(true),
  });
}

export type DocFrontmatter = z.infer<ReturnType<typeof docFrontmatterSchema>>;

// ─── sidebar.json schema ─────────────────────────────────────────────────────

/** A leaf that references an existing doc by its id (path without extension). */
const sidebarDocItemSchema = z.object({
  /** Doc id, e.g. `basics/variables` or `index`. */
  doc: z.string(),
  /** Override the resolved doc's sidebar label. */
  label: z.string().optional(),
  badge: z.string().optional(),
});

/** A leaf that links to an arbitrary URL. */
const sidebarLinkItemSchema = z.object({
  label: z.string(),
  link: z.string(),
  badge: z.string().optional(),
});

/**
 * A group. Recursive up to six levels deep (matching the folding requirement).
 * `link` optionally makes the group label itself navigable.
 */
type SidebarGroupInput = {
  label: string;
  link?: string;
  badge?: string;
  collapsed?: boolean;
  items: Array<
    | z.infer<typeof sidebarDocItemSchema>
    | z.infer<typeof sidebarLinkItemSchema>
    | SidebarGroupInput
  >;
};

const sidebarGroupItemSchema: z.ZodType<SidebarGroupInput> = z.lazy(() =>
  z.object({
    label: z.string(),
    link: z.string().optional(),
    badge: z.string().optional(),
    collapsed: z.boolean().default(true),
    items: z.array(sidebarItemSchema).max(64),
  }),
);

const sidebarItemSchema: z.ZodType<
  | z.infer<typeof sidebarDocItemSchema>
  | z.infer<typeof sidebarLinkItemSchema>
  | SidebarGroupInput
> = z.union([
  sidebarDocItemSchema,
  sidebarLinkItemSchema,
  sidebarGroupItemSchema,
]);

/** Top-level `sidebar.json` shape: an ordered list of items. */
export const sidebarSchema = z.array(sidebarItemSchema);

export type SidebarConfig = z.infer<typeof sidebarSchema>;
