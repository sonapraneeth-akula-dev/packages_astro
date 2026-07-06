/**
 * Caption alignment for numbered blocks / figures, shared by the notes and blog
 * engines. The numbered-block components (Algorithm, Listing, CalloutNumbered,
 * DocImage) read the resolved value from `Astro.locals.captionAlign`, which each
 * engine's content route sets per page from its site config + frontmatter.
 */

/** Horizontal alignment for a block/figure caption. */
export type CaptionAlign = 'left' | 'center' | 'right';

/** Block kinds that render a caption and honour {@link CaptionAlignConfig}. */
export type CaptionKind = 'algorithm' | 'listing' | 'figure';

/**
 * Per-kind caption alignment. Any kind left unset falls back to `default`,
 * which itself defaults to `'center'`. Set site-wide in the engine config and
 * override per page via the `captionAlign` frontmatter field.
 */
export interface CaptionAlignConfig {
  /** Fallback for kinds not listed below. Defaults to `'center'`. */
  default?: CaptionAlign;
  /** `<Algorithm>` captions. */
  algorithm?: CaptionAlign;
  /** `<Listing>` (code) captions. */
  listing?: CaptionAlign;
  /** `<DocImage>` figure captions. */
  figure?: CaptionAlign;
}

/**
 * Resolve the effective caption alignment for a kind. Page overrides win over
 * the site config; each level falls back to its `default`, then to `'center'`.
 */
export function resolveCaptionAlign(
  kind: CaptionKind,
  site?: CaptionAlignConfig,
  page?: CaptionAlignConfig,
): CaptionAlign {
  return (
    page?.[kind] ?? page?.default ?? site?.[kind] ?? site?.default ?? 'center'
  );
}
