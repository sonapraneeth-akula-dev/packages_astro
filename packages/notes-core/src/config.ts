/**
 * Site-level configuration for a docs/notes site. Each site provides its own
 * `notes.config.ts` that calls {@link defineDocsConfig} with overrides; the rest
 * fall back to these sensible defaults.
 */

import type { SiteChrome } from '@grihasetu/components/chrome';
import type { ThemeConfig } from '@grihasetu/components/theme';

export type { NavLink, SocialProfile } from '@grihasetu/components/chrome';
export { activeSocials } from '@grihasetu/components/chrome';

export interface DocsConfig extends SiteChrome {
  /** Full site name used in <title> and metadata. */
  title: string;
  /** Posts/notes subject, shown on the landing page. */
  subject: string;
  /** IANA time zone used to render timestamps. */
  timeZone: string;
  /** Human-readable abbreviation appended after timestamps (e.g. IST, UTC). */
  timeZoneLabel: string;
  /**
   * Optional base URL for "Edit this page" links, e.g.
   * `https://github.com/org/repo/edit/main/app/notes/go/src/content/docs`.
   * The doc id + extension is appended.
   */
  editUrlBase?: string;
  /** Enable the Pagefind-powered offline search page. */
  search: boolean;
  /**
   * Treat each top-level content folder as a self-contained "notebook"
   * (sub-note). The home page becomes a hub of notebook cards, and each notebook
   * gets its own scoped sidebar, landing page and prev/next navigation — so a
   * single site can host several independent handbooks (e.g. C++, Go, C#).
   * Defaults to `false` (one flat handbook). Ignored when a curated
   * `sidebar.json` is supplied.
   */
  notebooks: boolean;
  /**
   * Visual theme — accent palette, font combination and corner roundedness.
   * Only the selected options ship (fonts register per combo; accents + radius
   * inline per page). Omit any axis to keep the engine's default look.
   */
  theme: ThemeConfig;
}

const ICON_HOME =
  '<path d="M3 9.5 12 3l9 6.5"></path><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"></path><path d="M9 21v-6h6v6"></path>';
const ICON_SEARCH =
  '<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>';
const ICON_BOOK =
  '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>';

export const defaultDocsConfig: DocsConfig = {
  brand: 'Grihasetu',
  title: 'Grihasetu Notes',
  description:
    'A fast, accessible documentation site built with Astro + MDX — folding sidebar, offline search and optimised images.',
  author: 'Grihasetu',
  subject: 'Documentation',
  timeZone: 'Asia/Kolkata',
  timeZoneLabel: 'IST',
  nav: [
    { href: '/', label: 'Home', icon: ICON_HOME },
    { href: '/search', label: 'Search', icon: ICON_SEARCH },
  ],
  socials: [
    {
      id: 'github',
      href: 'https://github.com/grihasetu',
      label: 'GitHub',
      icon: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path>',
    },
  ],
  search: true,
  notebooks: false,
  theme: {},
};

export { ICON_BOOK };

/** Merge a partial site config onto the defaults. */
export function defineDocsConfig(config: Partial<DocsConfig>): DocsConfig {
  return { ...defaultDocsConfig, ...config };
}
