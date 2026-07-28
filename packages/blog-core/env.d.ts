/// <reference types="astro/client" />

// Build-time constants injected via Vite `define` by the Astro config factory
// (see src/astro-config.ts). Each consuming site re-declares these too.
declare const __APP_ENV__: string;
declare const __THEME_SWITCHER__: boolean;
declare const __GIT_COMMIT__: string;
declare const __GIT_BRANCH__: string;

/**
 * Per-request caption alignment, resolved by the blog post route from site
 * config + post frontmatter and read by caption components (Algorithm, Listing,
 * DocImage).
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
