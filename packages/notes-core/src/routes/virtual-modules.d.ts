/**
 * Ambient declarations for the per-site virtual modules supplied by the route
 * integration (see `routes-integration.ts`). These let the injected route
 * components in `./routes/` type-check against the engine's own types.
 */
declare module 'virtual:notes-core/config' {
  import type { DocsConfig } from '../config';
  export const docsConfig: DocsConfig;
}

declare module 'virtual:notes-core/components' {
  export const components: Record<string, unknown>;
}

declare module 'virtual:notes-core/sidebar' {
  import type { SidebarConfig } from '../schema';
  export const sidebar: SidebarConfig | null;
}
