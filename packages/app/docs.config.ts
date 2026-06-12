import { defineDocsConfig } from '@grihasetu/notes-core/config';

const ICON_HOME =
  '<path d="M3 9.5 12 3l9 6.5"></path><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"></path><path d="M9 21v-6h6v6"></path>';
const ICON_SEARCH =
  '<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>';
const ICON_BOOK =
  '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>';

export const docsConfig = defineDocsConfig({
  brand: 'Go Notes',
  title: 'Go Notes — A Practical Handbook',
  description:
    'A working handbook of the Go programming language, from the fundamentals (types, control flow, functions) to advanced topics (interfaces, goroutines, channels, generics).',
  author: 'Grihasetu',
  subject: 'The Go Programming Language',
  editUrlBase:
    'https://github.com/grihasetu/notes/edit/main/packages/app/src/content/docs',
  nav: [
    { href: '/', label: 'Home', icon: ICON_HOME },
    { href: '/basics/hello-world', label: 'Notes', icon: ICON_BOOK },
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
});
