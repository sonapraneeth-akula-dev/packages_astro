/**
 * MDX components for blog posts.
 *
 * Re-exports the shared UI map from @sonapraneeth/components and adds the
 * engine-specific `Code` block (expressive-code). Use them in a post either:
 *
 * 1. Auto-mapped (no import) — passed to <Content /> on the post page, so you
 *    can write <Callout>, <Tabs>, <Card>, <DocImage>, … directly. Markdown
 *    images (`![alt](src)`) are auto-upgraded to optimized lazy/async output.
 *
 * 2. Explicit import for anything custom:
 *      import { Callout, Steps } from '@sonapraneeth/blog-core/components/mdx';
 *
 * Sites can extend the map per-site with {@link mergeMdxComponents}.
 */
import { baseMdxComponents } from '@sonapraneeth/components/mdx';
import { Code } from 'astro-expressive-code/components';
import Algorithm from '@sonapraneeth/components/Algorithm.astro';
import Listing from '@sonapraneeth/components/Listing.astro';
import Ref from '@sonapraneeth/components/Ref.astro';
import Callout from '@sonapraneeth/components/CalloutNumbered.astro';

export * from '@sonapraneeth/components/mdx';
export { Code, Algorithm, Listing, Ref };

/** Components auto-injected into every MDX post via <Content components={...} />. */
export const mdxComponents = {
  ...baseMdxComponents,
  Code,
  // Numbered, referenceable blocks (see the numbering integration). `Callout`
  // overrides the shared one so it can carry an auto-number when given an `id`.
  // Blog posts have no part/chapter, so numbers are heading-based.
  Algorithm,
  Listing,
  Ref,
  Callout,
};

/** Merge site-specific components onto the shared map (site values win). */
export function mergeMdxComponents(
  extra: Record<string, unknown>,
): Record<string, unknown> {
  return { ...mdxComponents, ...extra };
}

