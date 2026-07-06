/**
 * MDX components for docs/notes.
 *
 * Re-exports the shared UI map from @sonapraneeth/components and adds the
 * engine-specific `Code` block (expressive-code). Use them in a note either:
 *
 * 1. Auto-mapped (no import) — passed to <Content /> on the doc page, so you
 *    can write <Callout>, <Tabs>, <Card>, <DocImage>, … directly. Markdown
 *    images (`![alt](src)`) are auto-upgraded to optimized lazy/async output.
 *
 * 2. Explicit import:
 *      import { Callout, Steps } from '@sonapraneeth/notes-core/components/mdx';
 *
 * Sites can extend the map per-site with {@link mergeMdxComponents}.
 */
import { baseMdxComponents } from '@sonapraneeth/components/mdx';
import { Code } from 'astro-expressive-code/components';
import Algorithm from './Algorithm.astro';
import Listing from './Listing.astro';
import Ref from './Ref.astro';
import Callout from './Callout.astro';

export * from '@sonapraneeth/components/mdx';
export { Code, Algorithm, Listing, Ref };

/** Components auto-injected into every note via <Content components={...} />. */
export const mdxComponents = {
  ...baseMdxComponents,
  Code,
  // Numbered, referenceable blocks (see the numbering integration). `Callout`
  // overrides the shared one so it can carry an auto-number when given an `id`.
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
