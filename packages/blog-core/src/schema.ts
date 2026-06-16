import { z } from 'astro/zod';
import type { ImageFunction } from 'astro:content';

/**
 * Frontmatter schema for a single blog post.
 *
 * Declared as a factory so it receives Astro's content-collection `image()`
 * helper. That lets `coverImage` reference a local file (relative to the post)
 * which Astro validates and optimizes at build time into responsive,
 * modern-format variants.
 */
export function postFrontmatterSchema({ image }: { image: ImageFunction }) {
  return z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /** Each post belongs to exactly one category. */
    category: z.string(),
    /** Each post can carry multiple tags. */
    tags: z.array(z.string()).default([]),
    /** Hide from listings while drafting. */
    draft: z.boolean().default(false),
    /** Optional accent emoji/glyph shown on cards when no hero image. */
    cover: z.string().optional(),
    /**
     * Optional hero/cover image, given as a path relative to the post file
     * (e.g. `./images/hero.jpg`). Optimized at build time via `astro:assets`.
     */
    coverImage: image().optional(),
    /** Alt text for `coverImage`; falls back to the post title when omitted. */
    coverAlt: z.string().optional(),
  });
}

export type PostFrontmatter = z.infer<ReturnType<typeof postFrontmatterSchema>>;
