import { z } from 'astro/zod';

/** Frontmatter schema for a single blog post. */
export const postFrontmatterSchema = z.object({
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
});

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;
