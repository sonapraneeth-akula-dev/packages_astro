import { defineCollection, type CollectionEntry } from 'astro:content';
import { glob } from 'astro/loaders';
import { postFrontmatterSchema } from './schema';

/**
 * Factory for the `blog` content collection. Each site calls this from its
 * `src/content.config.ts`:
 *
 * ```ts
 * import { postsCollection } from '@grihasetu/blog-core/content';
 * export const collections = { blog: postsCollection() };
 * ```
 *
 * @param base Directory (relative to the site root) holding the posts.
 *             Defaults to `./src/content/blog`.
 */
export function postsCollection(base = './src/content/blog') {
  return defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base }),
    schema: postFrontmatterSchema,
  });
}

/** A single post entry. Sites should declare their collection key as `blog`. */
export type PostEntry = CollectionEntry<'blog'>;
