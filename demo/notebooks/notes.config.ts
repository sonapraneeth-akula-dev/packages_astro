import { defineDocsConfig } from '@sonapraneeth/notes-core/config';

const ICON_HOME =
  '<path d="M3 9.5 12 3l9 6.5"></path><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"></path><path d="M9 21v-6h6v6"></path>';
const ICON_SEARCH =
  '<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>';
const ICON_TAG =
  '<path d="M20.59 13.41 12 4.83A2 2 0 0 0 10.59 4H4v6.59a2 2 0 0 0 .59 1.41l8.58 8.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83Z"></path><line x1="7.5" y1="7.5" x2="7.51" y2="7.5"></line>';
const ICON_CATEGORY =
  '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect>';

export const docsConfig = defineDocsConfig({
  // Numbered-block / figure caption alignment (Algorithm, Listing, DocImage).
  // Pages can override per kind via the `captionAlign` frontmatter field.
  captionAlign: { default: 'center' },
  brand: 'Notebooks',
  title: 'Notebooks — Demo',
  description:
    'A showcase site demonstrating @sonapraneeth/notes-core notebooks mode: multiple self-contained sub-notes (C++, Go, C#) under one site, each with its own scoped sidebar, landing page and offline search.',
  author: 'Sona Praneeth Akula',
  subject: 'Notebooks',
  nav: [
    { href: '/', label: 'Home', icon: ICON_HOME },
    { href: '/categories', label: 'Categories', icon: ICON_CATEGORY },
    { href: '/tags', label: 'Tags', icon: ICON_TAG },
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
  // combo and fully-rounded (pill) corners. The live theme switcher is not
  // configurable — it renders on the dev server only (`bun dev`), so use it
  // there to preview palette/font/radius combinations.
  //
  // `scriptFonts` self-hosts Noto Sans Devanagari for this site only and emits a
  // `.font-devanagari` class. Tag a span with it plus `lang`, e.g.
  // `<span lang="sa" class="font-devanagari">अथ योगानुशासनम्</span>`.
  theme: {
    palette: 'indigo',
    fonts: 'geometric',
    radius: 'full',
    scriptFonts: [
      {
        id: 'devanagari',
        name: 'Noto Sans Devanagari',
        weights: ['400 700'],
        subsets: ['devanagari'],
        fallback: "'Nirmala UI', 'Noto Sans Devanagari', sans-serif",
        // Devanagari reads small next to Latin at the same point size; upscale.
        scale: 1.4,
      },
    ],
  },
});
