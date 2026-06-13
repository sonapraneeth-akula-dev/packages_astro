/**
 * Ambient declarations for the per-site virtual modules supplied by the route
 * integration (see `routes-integration.ts`). These let the injected route
 * components in `./routes/` and the engine's `utils/posts.ts` type-check
 * against the engine's own types.
 */
declare module 'virtual:blog-core/config' {
  import type { BlogConfig } from '../config';
  export const blogConfig: BlogConfig;
}

declare module 'virtual:blog-core/components' {
  export const components: Record<string, unknown>;
}
