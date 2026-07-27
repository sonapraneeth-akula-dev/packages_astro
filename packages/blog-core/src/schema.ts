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
    /**
     * Extra search-only keywords/aliases. Indexed by Pagefind but not shown on
     * the page — useful for terms the tokenizer mangles (e.g. `csharp`/`dotnet`
     * for a "C#" post, since `C#` indexes as the bare token `c`).
     */
    keywords: z.array(z.string()).default([]),
    /** Hide from listings while drafting. */
    draft: z.boolean().default(false),
    /**
     * Archive the post: keep it reachable by direct URL and in tag/category
     * listings, but drop it from the main home feed and the RSS feed. Useful for
     * older posts you want to preserve without surfacing them up front.
     */
    archived: z.boolean().default(false),
    /**
     * Reserved opt-in flag for LaTeX math. Currently a no-op: the post layout
     * imports `katex.min.css` on every post (Approach 1 in
     * `docs/math-rendering.md`), so math renders whether or not this is set.
     * Kept so existing frontmatter stays valid and so a future conditional
     * loader has a flag to read.
     */
    math: z.boolean().default(false),
    /** Optional accent emoji/glyph shown on cards when no hero image. */
    cover: z.string().optional(),
    /**
     * Optional hero/cover image, given as a path relative to the post file
     * (e.g. `./images/hero.jpg`). Optimized at build time via `astro:assets`.
     */
    coverImage: image().optional(),
    /** Alt text for `coverImage`; falls back to the post title when omitted. */
    coverAlt: z.string().optional(),
    /**
     * Per-post caption alignment override. Any kind left unset inherits the
     * site config (which defaults to `'center'`). `default` applies to kinds
     * not listed. See the `captionAlign` blog config option.
     */
    captionAlign: z
      .object({
        default: z.enum(['left', 'center', 'right']).optional(),
        algorithm: z.enum(['left', 'center', 'right']).optional(),
        listing: z.enum(['left', 'center', 'right']).optional(),
        figure: z.enum(['left', 'center', 'right']).optional(),
      })
      .optional(),
  });
}

export type PostFrontmatter = z.infer<ReturnType<typeof postFrontmatterSchema>>;
