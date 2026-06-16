// A trimmed illustration of how the engine injects its routes. The blog post
// imports specific line ranges from this file so the prose and the code never
// drift apart.
import type { AstroIntegration } from 'astro';

const ROUTES = {
  home: '@sonapraneeth/blog-core/routes/index.astro',
  post: '@sonapraneeth/blog-core/routes/post.astro',
  categories: '@sonapraneeth/blog-core/routes/categories.astro',
  tags: '@sonapraneeth/blog-core/routes/tags.astro',
  search: '@sonapraneeth/blog-core/routes/search.astro',
  rss: '@sonapraneeth/blog-core/routes/rss.xml.ts',
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
