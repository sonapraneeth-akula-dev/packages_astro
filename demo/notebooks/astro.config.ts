import { defineDocsAstroConfig } from '@sonapraneeth/notes-core/astro';
import { docsConfig } from './notes.config';

// Demo showcase site for notebooks mode. The engine owns all page
// routing/search; the home page is a hub of notebooks, each with a scoped
// sidebar auto-generated from its folder. PUBLIC_SITE_URL overrides the URL.
export default defineDocsAstroConfig({
  port: 4311,
  docsConfig,
  contentDir: './content',
  // Demo site: render the live ThemeSwitcher panel so visitors can preview
  // every palette / font combo / radius. Real sites leave this off.
  themeSwitcher: true,
});
