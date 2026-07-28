import { defineBlogAstroConfig } from '@sonapraneeth/blog-core/astro';
import { blogConfig } from './blog.config';

// Demo showcase blog. The engine owns all page routing/search; this site only
// supplies its config, content collection and component registry.
// PUBLIC_SITE_URL overrides the URL per environment.
export default defineBlogAstroConfig({
  port: 4312,
  blogConfig,
  contentDir: './content',
  // Demo site: render the live ThemeSwitcher panel so visitors can preview
  // every palette / font combo / radius. Real sites leave this off.
  themeSwitcher: true,
});
