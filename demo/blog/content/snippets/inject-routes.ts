// A trimmed illustration of how the engine injects its routes. The blog post
// imports specific line ranges from this file so the prose and the code never
// drift apart.
import type { AstroIntegration } from 'astro';

const ROUTES = {
  home: '@grihasetu/blog-core/routes/index.astro',
  post: '@grihasetu/blog-core/routes/post.astro',
  categories: '@grihasetu/blog-core/routes/categories.astro',
  tags: '@grihasetu/blog-core/routes/tags.astro',
  search: '@grihasetu/blog-core/routes/search.astro',
  rss: '@grihasetu/blog-core/routes/rss.xml.ts',
} as const;

export function routesIntegration(): AstroIntegration {
  return {
    name: 'blog-core:routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        injectRoute({ pattern: '/', entrypoint: ROUTES.home });
        injectRoute({ pattern: '/blog/[...id]', entrypoint: ROUTES.post });
        injectRoute({ pattern: '/categories', entrypoint: ROUTES.categories });
        injectRoute({ pattern: '/tags', entrypoint: ROUTES.tags });
        injectRoute({ pattern: '/search', entrypoint: ROUTES.search });
        injectRoute({ pattern: '/rss.xml', entrypoint: ROUTES.rss, prerender: true });
      },
    },
  };
}
