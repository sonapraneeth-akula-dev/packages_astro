/**
 * Astro MDX/Markdown preset for the satteri plugin family.
 *
 * The whole Markdown pipeline lives here so docs engines and sites just spread
 * it into their Astro config rather than re-wiring `@astrojs/mdx`, a slug plugin
 * and an autolink plugin by hand.
 */
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkMath from 'remark-math';
import rehypeSatteriAutolinkHeadings, { rehypeSatteriExternalLinks } from './index';
import { remarkCodeSource, type CodeSourceOptions } from './remark-code-source';
import { remarkMermaid } from './remark-mermaid';

/** Options shared by the satteri Markdown/MDX preset functions. */
export interface SatteriPresetOptions {
  /**
   * Options for the code-source remark plugin, which fills fenced code blocks
   * from a local `file="…"` or remote `url="…"`. Use this to widen the remote
   * host allowlist or tune fetch limits.
   */
  codeSource?: CodeSourceOptions;
}

/**
 * The `@astrojs/mdx` integration. Spread the result into `integrations` (after
 * any code-highlighting integration such as Expressive Code, which must run
 * first so it can process fenced code inside `.mdx`).
 *
 *   integrations: [expressiveCode(...), satteriMdx(), ...]
 *
 * MDX inherits its remark/rehype plugins from the `markdown.processor` built by
 * {@link satteriMarkdownProcessor}, so fenced blocks in `.mdx` can import their
 * contents from a file or URL too \u2014 see {@link remarkCodeSource}.
 */
export function satteriMdx() {
  return mdx();
}

/**
 * The shared Markdown processor: `unified()` builds Astro's default pipeline,
 * then layers on the satteri plugins:
 *
 *   - `remark-math` parses LaTeX (`$inline$` and `$$block$$`) into math nodes
 *     and `rehype-katex` renders them to HTML at build time (KaTeX). Ship
 *     `katex/dist/katex.min.css` in your layout so the math is styled.
 *   - `rehype-slug` assigns heading ids and the satteri autolink plugin
 *     appends a clickable anchor beside each heading.
 *   - External HTTP(S) links open in a new tab with `noopener noreferrer` and
 *     receive a decorative external-link icon.
 *
 * The plugin defaults (append behavior, `.heading-anchor` class and SVG icons)
 * are what the engine's styles expect, so no options are needed here. Because
 * MDX inherits this pipeline, these transforms and LaTeX work in both `.md`
 * and `.mdx`.
 *
 *   markdown: { processor: satteriMarkdownProcessor() }
 */
export function satteriMarkdownProcessor(options: SatteriPresetOptions = {}) {
  const autolinkHeadings = rehypeSatteriAutolinkHeadings as unknown as typeof rehypeSlug;
  const externalLinks = rehypeSatteriExternalLinks as unknown as typeof rehypeSlug;

  return unified({
    remarkPlugins: [remarkMath, [remarkCodeSource, options.codeSource ?? {}], remarkMermaid],
    rehypePlugins: [rehypeSlug, autolinkHeadings, externalLinks, rehypeKatex],
  });
}
