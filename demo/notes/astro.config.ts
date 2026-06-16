import { defineDocsAstroConfig } from '@grihasetu/notes-core/astro';
import { docsConfig } from './notes.config';

// Demo showcase site. The engine owns all page routing/search; the sidebar is
// auto-generated from the folder structure (no sidebar.json passed).
// PUBLIC_SITE_URL overrides the URL per environment.
export default defineDocsAstroConfig({ port: 4310, docsConfig });
