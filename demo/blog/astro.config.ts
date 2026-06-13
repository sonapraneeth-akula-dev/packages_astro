import { defineBlogAstroConfig } from '@grihasetu/blog-core/astro';
import { blogConfig } from './blog.config';

// Demo showcase blog. The engine owns all page routing/search; this site only
// supplies its config, content collection and component registry.
// PUBLIC_SITE_URL overrides the URL per environment.
export default defineBlogAstroConfig({ port: 4312, blogConfig });
