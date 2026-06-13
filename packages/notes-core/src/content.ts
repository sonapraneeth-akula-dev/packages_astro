import { defineCollection, type CollectionEntry } from 'astro:content';
import { glob } from 'astro/loaders';
import { docFrontmatterSchema } from './schema';

/**
 * Factory for the `docs` content collection. Each site calls this from its
 * `src/content.config.ts`:
 *
 * ```ts
 * import { docsCollection } from '@grihasetu/notes-core/content';
 * export const collections = { docs: docsCollection() };
 * ```
 *
 * @param base Directory (relative to the site root) holding the notes.
 *             Defaults to `./src/content/docs`.
 */
export function docsCollection(base = './src/content/docs') {
  return defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base }),
    schema: docFrontmatterSchema,
  });
}

/** A single note entry. Sites should declare their collection key as `docs`. */
export type DocEntry = CollectionEntry<'docs'>;
