/**
 * Client runtime that renders `<pre class="mermaid">` blocks (emitted by the
 * `remark-mermaid` transform) into SVG diagrams and keeps them in sync with the
 * site's light/dark appearance.
 *
 * This module lives inside the components package on purpose: its lazy
 * `import('mermaid')` resolves relative to *this* package (where `mermaid` is a
 * dependency), so it works for every consuming site without each site having to
 * depend on `mermaid` directly. The Mermaid bundle is only fetched on pages that
 * actually contain a diagram; the runtime re-renders on theme changes (explicit
 * `data-theme` toggle or an OS `prefers-color-scheme` change) and after Astro
 * client-side navigations.
 */
type MermaidApi = (typeof import('mermaid'))['default'];

const SELECTOR = 'pre.mermaid';
const SOURCE_ATTR = 'data-mermaid-source';

let mermaidApi: MermaidApi | null = null;
let loader: Promise<MermaidApi> | null = null;
let rendering = false;
let pending = false;

/** Resolve the active appearance: an explicit `data-theme` wins, else OS pref. */
function activeTheme(): 'dark' | 'light' {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit === 'dark' || explicit === 'light') {
    return explicit;
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Lazily import Mermaid once and cache the module for later re-renders. */
async function ensureMermaid(): Promise<MermaidApi> {
  if (mermaidApi) {
    return mermaidApi;
  }
  if (!loader) {
    loader = import('mermaid').then((module) => (mermaidApi = module.default));
  }
  return loader;
}

/** Render (or re-render) every diagram on the page with the current theme. */
async function renderAll(): Promise<void> {
  if (rendering) {
    // A theme change mid-render: coalesce into a single follow-up pass.
    pending = true;
    return;
  }

  const nodes = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
  if (nodes.length === 0) {
    return;
  }

  rendering = true;
  try {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
    const mermaid = await ensureMermaid();
    mermaid.initialize({
      startOnLoad: false,
      theme: activeTheme() === 'dark' ? 'dark' : 'default',
      securityLevel: 'strict',
      fontFamily: 'inherit',
      // Drops the body of a class that declares neither members nor methods.
      // Classes that declare only methods are handled after rendering, by
      // `collapseEmptyMembersBoxes` — this option does not cover them.
      class: { hideEmptyMembersBox: true, padding: 8 },
    });

    for (const node of nodes) {
      // Restore the original definition so an already-rendered diagram can be
      // re-rendered after a theme switch (Mermaid replaces the text with an SVG
      // and marks the node with `data-processed`).
      const source = node.getAttribute(SOURCE_ATTR);
      if (source !== null) {
        node.textContent = source;
      }
      node.removeAttribute('data-processed');
    }

    await mermaid.run({ nodes });

    // Fit each diagram to the content column (no horizontal scroll) and make it
    // click-to-enlarge: the inline copy is a preview, the overlay is readable.
    // Measure every diagram first, then write: interleaving `getBBox()` reads
    // with attribute writes would force one synchronous reflow per diagram.
    const measured: Array<{ svg: SVGSVGElement; bounds: DOMRect }> = [];
    for (const node of nodes) {
      const svg = node.querySelector<SVGSVGElement>('svg');
      if (!svg) {
        continue;
      }
      collapseEmptyMembersBoxes(svg);
      const bounds = measure(svg);
      if (bounds) {
        measured.push({ svg, bounds });
      }
      if (node.dataset.zoomBound !== 'true') {
        node.dataset.zoomBound = 'true';
        node.addEventListener('click', () => {
          const current = node.querySelector<SVGSVGElement>('svg');
          if (current) {
            openLightbox(current);
          }
        });
      }
    }
    // Shrink-wrap each canvas to its drawing, then let CSS scale it to the
    // column width.
    for (const { svg, bounds } of measured) {
      normalizeViewBox(svg, bounds);
    }
  } catch (error) {
    console.error('[mermaid] failed to render diagrams', error);
  } finally {
    rendering = false;
    if (pending) {
      pending = false;
      void renderAll();
    }
  }
}

/** The drawn content box of a diagram, or `null` when it can't be measured. */
function measure(svg: SVGSVGElement): DOMRect | null {
  let bounds: DOMRect;
  try {
    bounds = svg.getBBox();
  } catch {
    return null; // not rendered/measurable (e.g. display:none)
  }
  return bounds.width && bounds.height ? bounds : null;
}

/** The `y` of a divider line, read off its `M<x> <y> …` path command. */
function dividerY(path: SVGPathElement): number | null {
  const match = /^M\s*-?[\d.]+\s+(-?[\d.]+)/.exec(path.getAttribute('d') ?? '');
  return match ? Number.parseFloat(match[1]) : null;
}

/**
 * Merge away the empty attributes compartment of a class node.
 *
 * Mermaid's `class.hideEmptyMembersBox` only applies when a class declares
 * *neither* members *nor* methods (mermaid-js/mermaid#6657, #6192 — both open),
 * so a class listing methods only still gets an empty strip between two divider
 * lines. Every class diagram in this project is methods-only, so the strip shows
 * up in all of them as dead space.
 *
 * The node's outer box is positioned by dagre and its edges terminate on that
 * box, so the height is left untouched: we drop the members/methods divider and
 * re-centre the method rows in the taller compartment that results. The diagram
 * reads as a normal two-compartment UML class, and no edge moves.
 */
function collapseEmptyMembersBoxes(svg: SVGSVGElement): void {
  for (const node of svg.querySelectorAll<SVGGElement>('g.node')) {
    const members = node.querySelector<SVGGElement>('g.members-group');
    const methods = node.querySelector<SVGGElement>('g.methods-group');
    if (!members || !methods || members.childElementCount > 0 || methods.childElementCount === 0) {
      continue;
    }

    const dividers = node.querySelectorAll<SVGPathElement>('g.divider path');
    if (dividers.length !== 2) {
      continue;
    }
    const top = dividerY(dividers[0]);
    const bottom = dividerY(dividers[1]);
    if (top === null || bottom === null) {
      continue;
    }

    dividers[1].parentElement?.remove();
    const offset = (bottom - top) / 2;
    const current = methods.transform.baseVal.consolidate()?.matrix;
    methods.setAttribute(
      'transform',
      `translate(${current?.e ?? 0}, ${(current?.f ?? 0) - offset})`,
    );
  }
}

/**
 * Shrink-wrap a diagram's `viewBox` to its actual drawn content.
 *
 * Mermaid sometimes emits a canvas far larger than the graph it drew (measuring
 * against a transient container width), e.g. a `viewBox` of 2119x2093 for a
 * 430x480 diagram. Scaled to fit the column, that renders the diagram at a
 * fraction of its size surrounded by dead space. Measuring the real content box
 * and rewriting the `viewBox` makes the drawing fill the SVG — and therefore the
 * column — no matter what Mermaid computed.
 */
function normalizeViewBox(svg: SVGSVGElement, bounds: DOMRect): void {
  const padding = 8;
  const width = bounds.width + padding * 2;
  svg.setAttribute(
    'viewBox',
    `${bounds.x - padding} ${bounds.y - padding} ${width} ${bounds.height + padding * 2}`,
  );
  // Cap the diagram at its own content width. Mermaid's inline `max-width` was
  // computed from the canvas it measured against, which the correction above
  // just invalidated; without this the stylesheet's `width: 100%` would blow the
  // diagram up to the column width and render its labels larger than the prose.
  svg.style.maxWidth = `${Math.round(width)}px`;
  // Drop any fixed height so the browser derives it from the corrected aspect
  // ratio (CSS sets width: 100%; height: auto).
  svg.removeAttribute('height');
  svg.style.height = '';
}

/**
 * Open a large, readable copy of a diagram in a click-to-dismiss overlay. The
 * clone is scaled to fill most of the viewport while preserving aspect ratio, so
 * even a small inline preview becomes comfortably legible.
 */
function openLightbox(svg: SVGSVGElement): void {
  const overlay = document.createElement('div');
  overlay.className = 'mermaid-lightbox';

  const content = document.createElement('div');
  content.className = 'mermaid-lightbox__content';

  const clone = svg.cloneNode(true) as SVGSVGElement;
  const box = svg.viewBox.baseVal;
  if (box && box.width && box.height) {
    // Scale diagram to fit viewport, but enforce a minimum 0.85x scale so
    // text never shrinks into unreadable micro-text. Large diagrams scroll.
    const fitScale = Math.min(
      (window.innerWidth * 0.92 - 48) / box.width,
      (window.innerHeight * 0.86 - 48) / box.height,
    );
    const scale = Math.max(fitScale, 0.85);
    clone.style.maxWidth = 'none';
    clone.style.width = `${Math.round(box.width * scale)}px`;
    clone.style.height = `${Math.round(box.height * scale)}px`;
  }
  content.appendChild(clone);
  overlay.appendChild(content);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
    }
  };
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
}

function boot(): void {
  void renderAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

// Re-render after client-side navigations (Astro ClientRouter, when enabled).
document.addEventListener('astro:after-swap', boot);

// Re-render when the appearance toggles (explicit override on <html>) …
new MutationObserver((records) => {
  if (records.some((record) => record.attributeName === 'data-theme')) {
    void renderAll();
  }
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme'],
});

// … or when the OS-level colour scheme changes while on "system".
window
  .matchMedia?.('(prefers-color-scheme: dark)')
  .addEventListener?.('change', () => void renderAll());
