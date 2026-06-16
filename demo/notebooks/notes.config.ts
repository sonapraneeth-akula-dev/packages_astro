import { defineDocsConfig } from '@grihasetu/notes-core/config';

const ICON_HOME =
  '<path d="M3 9.5 12 3l9 6.5"></path><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"></path><path d="M9 21v-6h6v6"></path>';
const ICON_SEARCH =
  '<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>';

export const docsConfig = defineDocsConfig({
  brand: 'Notebooks',
  title: 'Notebooks — Demo',
  description:
    'A showcase site demonstrating @grihasetu/notes-core notebooks mode: multiple self-contained sub-notes (C++, Go, C#) under one site, each with its own scoped sidebar, landing page and offline search.',
  author: 'Sonapraneeth Akula',
  subject: 'Notebooks',
  nav: [
    { href: '/', label: 'Home', icon: ICON_HOME },
    { href: '/search', label: 'Search', icon: ICON_SEARCH },
  ],
  socials: [
    {
      id: 'github',
      href: 'https://github.com/grihasetu',
      label: 'GitHub',
      icon: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>',
    },
  ],
  search: true,
  // Notebooks demo: each top-level content folder is a self-contained sub-note.
  // The home page is a hub of notebook cards, and every notebook gets its own
  // scoped sidebar, landing page and prev/next navigation.
  notebooks: true,
  // Showcase the theme system: indigo accent, the Poppins "geometric" font
  // combo and fully-rounded (pill) corners. `switcher` renders the live theme
  // switcher so you can preview palette/font/radius combinations.
  theme: { palette: 'indigo', fonts: 'geometric', radius: 'full', switcher: true },
});
