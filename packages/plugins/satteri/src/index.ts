import type { Element, ElementContent, Root } from 'hast';
import { visit } from 'unist-util-visit';

/** The six heading tag names this plugin decorates. */
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** Where the generated anchor is placed relative to the heading's children. */
export type Behavior = 'append' | 'prepend';

export interface SatteriAutolinkHeadingsOptions {
  /**
   * Where to insert the anchor relative to the heading's existing children.
   * @default 'append'
   */
  behavior?: Behavior;
  /**
   * Properties applied to the generated `<a>` element. `href` is always set
   * to `#<heading-id>` and cannot be overridden.
   * @default { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 }
   */
  properties?: Record<string, unknown>;
  /**
   * The visible content placed inside the anchor. Defaults to a 15×15 link
   * (chain) SVG icon.
   */
  content?: ElementContent | ElementContent[];
}

const EXTERNAL_WEB_LINK = /^(?:https?:)?\/\//i;
type RehypeTransformer = (tree: unknown) => void;

/** Mark external web links as secure new-tab links and append a visual cue. */
export function rehypeSatteriExternalLinks(): RehypeTransformer {
  return (tree: unknown): void => {
    visit(tree as Root, 'element', (node: Element) => {
      if (node.tagName !== 'a') return;

      const href = node.properties?.['href'];
      if (typeof href !== 'string' || !EXTERNAL_WEB_LINK.test(href)) return;

      node.properties['target'] = '_blank';
      node.properties['rel'] = ['noopener', 'noreferrer'];
      node.children.push({
        type: 'element',
        tagName: 'svg',
        properties: {
          className: ['external-link-icon'],
          width: 14,
          height: 14,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '2',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          ariaHidden: 'true',
          style: 'display:inline-block;width:.8em;height:.8em;margin-inline-start:.2em;vertical-align:-.05em',
        },
        children: [
          {
            type: 'element',
            tagName: 'path',
            properties: { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' },
            children: [],
          },
          {
            type: 'element',
            tagName: 'polyline',
            properties: { points: '15 3 21 3 21 9' },
            children: [],
          },
          {
            type: 'element',
            tagName: 'line',
            properties: { x1: '10', y1: '14', x2: '21', y2: '3' },
            children: [],
          },
        ],
      });
    });
  };
}

const DEFAULT_PROPERTIES: Record<string, unknown> = {
  className: ['heading-anchor'],
  ariaHidden: 'true',
  tabIndex: -1,
};

/** The default link/chain SVG icon shown beside each heading. */
function defaultContent(): Element {
  return {
    type: 'element',
    tagName: 'svg',
    properties: {
      width: 15,
      height: 15,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    children: [
      {
        type: 'element',
        tagName: 'path',
        properties: {
          d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
        },
        children: [],
      },
      {
        type: 'element',
        tagName: 'path',
        properties: {
          d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
        },
        children: [],
      },
    ],
  };
}

/**
 * Rehype plugin that appends a clickable anchor link beside every heading that
 * already has an `id`. Designed to run after a slug plugin (e.g. `rehype-slug`)
 * which assigns the ids.
 *
 *   import rehypeSlug from 'rehype-slug';
 *   import rehypeSatteriAutolinkHeadings from '@sonapraneeth/rehype-satteri-autolink-headings';
 *
 *   unified().use(rehypeSlug).use(rehypeSatteriAutolinkHeadings);
 */
export default function rehypeSatteriAutolinkHeadings(
  options: SatteriAutolinkHeadingsOptions = {},
): RehypeTransformer {
  const behavior = options.behavior ?? 'append';
  const properties = options.properties ?? DEFAULT_PROPERTIES;

  return (tree: unknown): void => {
    visit(tree as Root, 'element', (node: Element) => {
      if (!HEADINGS.has(node.tagName)) return;

      const id = node.properties?.['id'];
      if (typeof id !== 'string' || id.length === 0) return;

      const content = options.content ?? defaultContent();
      const children = Array.isArray(content) ? content : [content];

      const anchor: Element = {
        type: 'element',
        tagName: 'a',
        properties: { ...properties, href: `#${id}` },
        // Clone so a shared `content` option isn't mutated/aliased across headings.
        children: structuredClone(children),
      };

      if (behavior === 'prepend') {
        node.children.unshift(anchor);
      } else {
        node.children.push(anchor);
      }
    });
  };
}
