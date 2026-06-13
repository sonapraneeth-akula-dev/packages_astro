/**
 * Astro MDX/Markdown preset for the satteri plugin family.
 *
 * The whole Markdown pipeline lives here so docs engines and sites just spread
 * it into their Astro config rather than re-wiring `@astrojs/mdx`, a slug plugin
 * and an autolink plugin by hand.
 */
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import rehypeSlug from 'rehype-slug';
import rehypeSatteriAutolinkHeadings from './index';

/**
 * The `@astrojs/mdx` integration. Spread the result into `integrations` (after
 * any code-highlighting integration such as Expressive Code, which must run
 * first so it can process fenced code inside `.mdx`).
 *
 *   integrations: [expressiveCode(...), satteriMdx(), ...]
 */
export function satteriMdx() {
  return mdx();
}

/**
 * The shared Markdown processor: `unified()` builds Astro's default pipeline,
 * then `rehype-slug` assigns heading ids and the satteri autolink plugin
 * appends a clickable anchor beside each heading. The plugin's defaults (append
 * behavior, `.heading-anchor` class, chain SVG) are what the engine's styles
 * expect, so no options are needed here.
 *
 *   markdown: { processor: satteriMarkdownProcessor() }
 */
export function satteriMarkdownProcessor() {
  return unified({
    rehypePlugins: [rehypeSlug, rehypeSatteriAutolinkHeadings],
  });
}
