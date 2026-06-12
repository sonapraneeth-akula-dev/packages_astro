import { defineDocsAstroConfig } from '@grihasetu/notes-core/astro';
import type { SidebarConfig } from '@grihasetu/notes-core';
import { docsConfig } from './docs.config';
import sidebar from './sidebar.json';

// Real Go notes site. The engine owns all page routing/search; this site only
// supplies its config and a curated sidebar.json (overriding the auto tree).
// PUBLIC_SITE_URL overrides the URL per environment.
export default defineDocsAstroConfig({
  port: 4320,
  docsConfig,
  sidebar: sidebar as SidebarConfig,
});
