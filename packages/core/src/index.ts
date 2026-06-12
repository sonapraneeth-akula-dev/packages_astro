/**
 * Public API for @grihasetu/notes-core.
 *
 * Astro components, layouts and styles are imported via their own subpaths
 * (so `.astro`/`.css` files load through Astro's plugins), e.g.:
 *
 *   import DocLayout from '@grihasetu/notes-core/layouts/DocLayout.astro';
 *   import { mdxComponents } from '@grihasetu/notes-core/components/mdx';
 *   import '@grihasetu/notes-core/styles/global.css';
 *
 * This entry re-exports the TypeScript building blocks: config, schema,
 * content collection, the Astro config factory and the sidebar/route helpers.
 */

// Site configuration
export {
  defineDocsConfig,
  defaultDocsConfig,
  activeSocials,
} from './config';
export type { DocsConfig, NavLink, SocialProfile } from './config';

// Frontmatter + sidebar schemas
export {
  docFrontmatterSchema,
  docSidebarMetaSchema,
  sidebarSchema,
} from './schema';
export type { DocFrontmatter, SidebarConfig } from './schema';

// Content collection
export { docsCollection } from './content';
export type { DocEntry } from './content';

// Astro config factory
export { defineDocsAstroConfig } from './astro-config';
export type { DocsAstroConfigOptions } from './astro-config';

// Routing + sidebar generation
export {
  buildDocRoutes,
  buildHomeData,
  buildSidebar,
  flattenSidebar,
  normalizePath,
  entrySlug,
  entryParam,
  entryLabel,
  isRootIndex,
  editUrl,
} from './utils/docs';
export type {
  SidebarNode,
  SidebarGroup,
  SidebarLeaf,
  DocLink,
  Breadcrumb,
  DocRoute,
  DocRouteProps,
  HomeData,
} from './utils/docs';

// Formatting helpers
export {
  slugify,
  humanize,
  readingTime,
  formatDateTime,
} from './utils/format';
