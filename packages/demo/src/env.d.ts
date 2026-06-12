/// <reference path="../.astro/types.d.ts" />

// Build-time constants injected via Vite define (see @grihasetu/notes-core/astro).
declare const __APP_ENV__: string;
declare const __GIT_COMMIT__: string;
declare const __GIT_BRANCH__: string;

// `astro/client` declares image/markdown/css modules but not `*.astro`. The
// Astro language server resolves component imports on its own, but the plain
// TypeScript server needs this fallback when a `.ts` file imports a component.
declare module '*.astro' {
  const Component: (props: Record<string, unknown>) => unknown;
  export default Component;
}
