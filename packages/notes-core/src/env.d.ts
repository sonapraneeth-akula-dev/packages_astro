/**
 * Per-request caption alignment, resolved by the notes doc route from site
 * config + page frontmatter and read by caption components (Algorithm, Listing,
 * DocImage). The `virtual:numbering` ambient type lives in the shared
 * `@sonapraneeth/components` package, alongside the numbered-block components.
 */
declare namespace App {
  interface Locals {
    captionAlign?: {
      algorithm: 'left' | 'center' | 'right';
      listing: 'left' | 'center' | 'right';
      figure: 'left' | 'center' | 'right';
    };
  }
}
