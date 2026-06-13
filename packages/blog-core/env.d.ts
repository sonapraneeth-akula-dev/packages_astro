/// <reference types="astro/client" />

// Build-time constants injected via Vite `define` by the Astro config factory
// (see src/astro-config.ts). Each consuming site re-declares these too.
declare const __APP_ENV__: string;
declare const __GIT_COMMIT__: string;
declare const __GIT_BRANCH__: string;
