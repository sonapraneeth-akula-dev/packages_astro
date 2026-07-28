/// <reference types="astro/client" />

// Build-time constants injected via Vite `define` by each site's Astro config
// factory. Re-declared here so the shared components type-check standalone.
declare const __APP_ENV__: string;
declare const __THEME_SWITCHER__: boolean;
declare const __GIT_COMMIT__: string;
declare const __GIT_BRANCH__: string;

/**
 * Ambient type for the build-time numbering map provided by the `numbering`
 * integration (see numbering.ts). Consumed by the numbered block components
 * (Algorithm, Listing, CalloutNumbered) and Ref.
 */
declare module 'virtual:numbering' {
  interface NumberEntry {
    number: string;
    label: string;
    url: string;
    type: 'Callout' | 'Algorithm' | 'Listing';
  }
  const map: { byId: Record<string, NumberEntry> };
  export default map;
}

/**
 * Per-request caption alignment, set by the notes doc route and read by caption
 * components (e.g. DocImage). Absent outside the notes engine, so consumers must
 * fall back to their own default.
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
