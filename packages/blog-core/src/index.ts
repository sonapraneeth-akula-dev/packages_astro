/**
 * Public API for @grihasetu/blog-core.
 *
 * Astro components, layouts, routes and styles are imported via their own
 * subpaths (so `.astro`/`.css` files load through Astro's plugins), e.g.:
 *
 *   import BlogPost from '@grihasetu/blog-core/layouts/BlogPost.astro';
 *   import { mdxComponents } from '@grihasetu/blog-core/components/mdx';
 *   import '@grihasetu/blog-core/styles/global.css';
 *
 * This entry re-exports the TypeScript building blocks: config, schema, the
 * posts collection, the Astro config factory and the route integration.
 */

// Site configuration
export {
  defineBlogConfig,
  defaultBlogConfig,
  activeSocials,
} from './config';
export type { BlogConfig, NavLink, SocialProfile } from './config';

// Frontmatter schema
export { postFrontmatterSchema } from './schema';
export type { PostFrontmatter } from './schema';

// Content collection
export { postsCollection } from './content';
export type { PostEntry } from './content';

// Astro config factory
export { defineBlogAstroConfig } from './astro-config';
export type { BlogAstroConfigOptions } from './astro-config';

// Route-injection integration (used internally by the config factory)
export { blogRoutes } from './routes-integration';
export type { BlogRoutesOptions } from './routes-integration';

// Posts + taxonomy helpers
export {
  getPublishedPosts,
  slugify,
  getCategories,
  getTags,
  postsInCategory,
  postsWithTag,
  readingTime,
  formatDate,
  formatDateTime,
} from './utils/posts';
export type { Post, Taxonomy } from './utils/posts';
