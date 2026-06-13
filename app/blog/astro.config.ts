import { defineBlogAstroConfig } from '@grihasetu/blog-core/astro';
import { blogConfig } from './blog.config';

// Real blog site. The engine (@grihasetu/blog-core) owns all page routing,
// search, the MDX/Markdown pipeline and the Astro/Vite setup; this site only
// supplies its config (./blog.config.ts), content collection and component
// registry. PUBLIC_SITE_URL overrides the URL per environment.
export default defineBlogAstroConfig({ port: 4322, blogConfig });
