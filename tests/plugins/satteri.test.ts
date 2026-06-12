import { describe, expect, it } from 'bun:test';
import type { Element, Root } from 'hast';
import rehypeSatteriAutolinkHeadings from '@grihasetu/rehype-satteri-autolink-headings';

/** Build a minimal hast document tree wrapping the given heading nodes. */
function tree(...nodes: Element[]): Root {
  return { type: 'root', children: nodes };
}

/** A heading element with optional id and text content. */
function heading(tagName: string, id: string | undefined, text = 'Title'): Element {
  return {
    type: 'element',
    tagName,
    properties: id === undefined ? {} : { id },
    children: [{ type: 'text', value: text }],
  };
}

/** Run the plugin (with options) against a tree and return the mutated tree. */
function run(root: Root, options?: Parameters<typeof rehypeSatteriAutolinkHeadings>[0]): Root {
  rehypeSatteriAutolinkHeadings(options)(root);
  return root;
}

/** The last child of a heading, asserted to be an anchor element. */
function anchorOf(h: Element): Element {
  const last = h.children[h.children.length - 1];
  expect(last?.type).toBe('element');
  return last as Element;
}

describe('rehypeSatteriAutolinkHeadings', () => {
  it('appends an anchor to a heading that has an id', () => {
    const h2 = heading('h2', 'getting-started');
    run(tree(h2));

    expect(h2.children).toHaveLength(2); // original text + anchor
    const anchor = anchorOf(h2);
    expect(anchor.tagName).toBe('a');
    expect(anchor.properties?.['href']).toBe('#getting-started');
  });

  it('decorates all six heading levels', () => {
    const levels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const headings = levels.map((tag, i) => heading(tag, `id-${i}`));
    run(tree(...headings));

    for (const h of headings) {
      expect(anchorOf(h).tagName).toBe('a');
    }
  });

  it('skips headings without an id', () => {
    const h2 = heading('h2', undefined);
    run(tree(h2));

    expect(h2.children).toHaveLength(1); // unchanged: only the original text
  });

  it('skips headings with an empty id', () => {
    const h2 = heading('h2', '');
    run(tree(h2));

    expect(h2.children).toHaveLength(1);
  });

  it('ignores non-heading elements', () => {
    const p: Element = {
      type: 'element',
      tagName: 'p',
      properties: { id: 'para' },
      children: [{ type: 'text', value: 'Not a heading' }],
    };
    run(tree(p));

    expect(p.children).toHaveLength(1);
  });

  it('applies the default anchor properties and link icon', () => {
    const h2 = heading('h2', 'intro');
    run(tree(h2));

    const anchor = anchorOf(h2);
    expect(anchor.properties?.['className']).toEqual(['heading-anchor']);
    expect(anchor.properties?.['ariaHidden']).toBe('true');
    expect(anchor.properties?.['tabIndex']).toBe(-1);

    const svg = anchor.children[0] as Element;
    expect(svg.tagName).toBe('svg');
    expect(svg.children).toHaveLength(2); // two <path> segments
  });

  it('prepends the anchor when behavior is "prepend"', () => {
    const h2 = heading('h2', 'top');
    run(tree(h2), { behavior: 'prepend' });

    const first = h2.children[0] as Element;
    expect(first.tagName).toBe('a');
    expect(first.properties?.['href']).toBe('#top');
  });

  it('honours custom properties but always forces the correct href', () => {
    const h2 = heading('h2', 'real-id');
    run(tree(h2), {
      properties: { className: ['custom'], href: '#should-be-overridden' },
    });

    const anchor = anchorOf(h2);
    expect(anchor.properties?.['className']).toEqual(['custom']);
    expect(anchor.properties?.['href']).toBe('#real-id');
  });

  it('uses custom content when provided', () => {
    const h2 = heading('h2', 'with-hash');
    run(tree(h2), {
      content: { type: 'text', value: '#' },
    });

    const anchor = anchorOf(h2);
    expect(anchor.children).toEqual([{ type: 'text', value: '#' }]);
  });

  it('does not alias shared content across multiple headings', () => {
    const a = heading('h2', 'a');
    const b = heading('h2', 'b');
    run(tree(a, b), {
      content: { type: 'element', tagName: 'span', properties: {}, children: [] },
    });

    const spanA = anchorOf(a).children[0] as Element;
    const spanB = anchorOf(b).children[0] as Element;
    expect(spanA).not.toBe(spanB); // cloned, not the same object reference
  });
});
