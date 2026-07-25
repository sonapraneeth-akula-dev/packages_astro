/**
 * Remark plugin that rewrites ```` ```mermaid ```` fenced code blocks into a
 * `<pre class="mermaid">` element carrying the raw diagram source.
 *
 * The rewrite happens at the **mdast** stage via `data.hName` / `hChildren`, so
 * the block is emitted as a plain `<pre>` (no inner `<code class="language-…">`)
 * and therefore never reaches the code highlighter (Expressive Code), which only
 * targets `<pre><code class="language-…">`. A small client runtime (see
 * `@sonapraneeth/components/mermaid`) then renders the SVG and keeps it in sync
 * with the light/dark theme.
 *
 * Because the MDX pipeline inherits this processor's remark plugins, the same
 * transform works in both `.md` and `.mdx`. It runs after `remark-code-source`,
 * so a diagram whose source is loaded from a `file="…"` / `url="…"` is filled in
 * first, then converted here.
 */
import type { Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * Convert every ```` ```mermaid ```` code block into a themable
 * `<pre class="mermaid">` element. The raw definition is kept both as the
 * element's text (what Mermaid reads on first render) and in a
 * `data-mermaid-source` attribute (so the client can re-render it verbatim after
 * a theme switch, once Mermaid has replaced the text with an `<svg>`).
 *
 * The `code` node is **replaced** with a custom node (rather than mutating its
 * `data`) so mdast-util-to-hast's `code` handler is bypassed. Mutating a `code`
 * node's `hName` still leaves the handler's wrapping `<pre>` in place, producing
 * an invalid `<pre><pre class="mermaid">` nesting; the custom node routes through
 * the unknown-node handler, which honours `hName`/`hChildren` and emits a single
 * `<pre>`.
 */
export function remarkMermaid() {
  return (tree: Root): void => {
    visit(tree, 'code', (node, index, parent) => {
      if ((node.lang ?? '').toLowerCase() !== 'mermaid') {
        return;
      }
      if (!parent || typeof index !== 'number') {
        return;
      }

      const source = node.value ?? '';
      parent.children[index] = {
        type: 'mermaid',
        data: {
          hName: 'pre',
          hProperties: {
            className: ['mermaid'],
            'data-mermaid-source': source,
          },
          hChildren: [{ type: 'text', value: source }],
        },
      } as unknown as RootContent;
    });
  };
}

export default remarkMermaid;
