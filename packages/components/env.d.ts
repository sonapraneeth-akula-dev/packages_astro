/// <reference types="astro/client" />

// Build-time constants injected via Vite `define` by each site's Astro config
// factory. Re-declared here so the shared components type-check standalone.
declare const __APP_ENV__: string;
declare const __GIT_COMMIT__: string;
declare const __GIT_BRANCH__: string;
