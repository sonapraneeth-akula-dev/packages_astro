import { defineDocsAstroConfig } from '@grihasetu/notes-core/astro';
import { docsConfig } from './docs.config';

// Demo showcase site for notebooks mode. The engine owns all page
// routing/search; the home page is a hub of notebooks, each with a scoped
// sidebar auto-generated from its folder. PUBLIC_SITE_URL overrides the URL.
export default defineDocsAstroConfig({ port: 4311, docsConfig });
