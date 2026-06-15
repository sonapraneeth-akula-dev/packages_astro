/**
 * MDX components for docs/notes.
 *
 * Re-exports the shared UI map from @grihasetu/components and adds the
 * engine-specific `Code` block (expressive-code). Use them in a note either:
 *
 * 1. Auto-mapped (no import) — passed to <Content /> on the doc page, so you
 *    can write <Callout>, <Tabs>, <Card>, <DocImage>, … directly. Markdown
 *    images (`![alt](src)`) are auto-upgraded to optimized lazy/async output.
 *
 * 2. Explicit import:
 *      import { Callout, Steps } from '@grihasetu/notes-core/components/mdx';
 *
 * Sites can extend the map per-site with {@link mergeMdxComponents}.
 */
import { baseMdxComponents } from '@grihasetu/components/mdx';
import { Code } from 'astro-expressive-code/components';

export * from '@grihasetu/components/mdx';
export { Code };

/** Components auto-injected into every note via <Content components={...} />. */
export const mdxComponents = {
  ...baseMdxComponents,
  Code,
};

/** Merge site-specific components onto the shared map (site values win). */
export function mergeMdxComponents(
  extra: Record<string, unknown>,
): Record<string, unknown> {
  return { ...mdxComponents, ...extra };
}
