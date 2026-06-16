import { defineBlogConfig } from '@sonapraneeth/blog-core/config';

const ICON_HOME =
  '<path d="M3 9.5 12 3l9 6.5"></path><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"></path><path d="M9 21v-6h6v6"></path>';
const ICON_CATEGORIES =
  '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect>';
const ICON_TAGS =
  '<path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59A2 2 0 0 0 3.83 11l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83z"></path><circle cx="7" cy="7" r="1.2"></circle>';
const ICON_SEARCH =
  '<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>';

export const blogConfig = defineBlogConfig({
  brand: 'Blog',
  title: 'Blog Engine — Demo',
  description:
    'A showcase journal demonstrating the @sonapraneeth/blog-core engine: a paginated feed, categories, tags, optimised code blocks, MDX components and offline search.',
  author: 'Sona Praneeth Akula',
  pageSize: 5,
  timeZone: 'Asia/Kolkata',
  timeZoneLabel: 'IST',
  search: true,
  // Showcase the theme system: violet accent, the Inter "modern" font combo
  // and large corner radius. `switcher` ships every preset and renders the live
  // theme switcher so you can preview palette/font/radius combinations.
  theme: { palette: 'violet', fonts: 'modern', radius: 'large', switcher: true },
  nav: [
    { href: '/', label: 'Home', icon: ICON_HOME },
    { href: '/categories', label: 'Categories', icon: ICON_CATEGORIES },
    { href: '/tags', label: 'Tags', icon: ICON_TAGS },
    { href: '/search', label: 'Search', icon: ICON_SEARCH },
  ],
  socials: [
    {
      id: 'github',
      href: 'https://github.com/grihasetu',
      label: 'GitHub',
      icon: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>',
    },
    {
      id: 'rss',
      href: '/rss.xml',
      label: 'RSS',
      icon: '<path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1.4"></circle>',
    },
  ],
});
