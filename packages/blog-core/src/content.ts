import { defineCollection, type CollectionEntry } from 'astro:content';
import { glob } from 'astro/loaders';
import { postFrontmatterSchema } from './schema';

/**
 * Factory for the `blog` content collection. Each site calls this from its
 * `src/content.config.ts`:
 *
 * ```ts
 * import { postsCollection } from '@sonapraneeth/blog-core/content';
 * export const collections = { blog: postsCollection() };
 * ```
 *
 * Content lives in a top-level `content/` directory (outside `src/`) so authors
 * keep prose separate from application code. The path is configurable per site
 * via the `base` argument.
 *
 * @param base Directory (relative to the site root) holding the posts.
 *             Defaults to `./content`.
 */
export function postsCollection(base = './content') {
  return defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base }),
    schema: postFrontmatterSchema,
  });
}

/** A single post entry. Sites should declare their collection key as `blog`. */
export type PostEntry = CollectionEntry<'blog'>;
