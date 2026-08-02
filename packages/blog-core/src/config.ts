/**
 * Site-level configuration for a blog. Each site provides its own
 * `blog.config.ts` that calls {@link defineBlogConfig} with overrides; the rest
 * fall back to these sensible defaults.
 */
import type { SiteChrome } from '@sonapraneeth/components/chrome';
import type { ThemeConfig } from '@sonapraneeth/components/theme';
import type { PwaConfig } from '@sonapraneeth/components/pwa';
import {
  resolveDiscoveryConfig,
  type DiscoveryConfig,
  type DiscoveryConfigInput,
} from '@sonapraneeth/components/discovery';

export type { NavLink, SocialProfile } from '@sonapraneeth/components/chrome';
export type { PwaConfig } from '@sonapraneeth/components/pwa';
export type { DiscoveryConfig, DiscoveryConfigInput } from '@sonapraneeth/components/discovery';
export { activeSocials } from '@sonapraneeth/components/chrome';

import type { CaptionAlignConfig } from '@sonapraneeth/components/captions';
export type {
  CaptionAlign,
  CaptionKind,
  CaptionAlignConfig,
} from '@sonapraneeth/components/captions';
export { resolveCaptionAlign } from '@sonapraneeth/components/captions';

export interface BlogConfig extends SiteChrome {
  /** Full site name used in <title> and metadata. */
  title: string;
  /** Posts per page on the home feed and taxonomy listings. */
  pageSize: number;
  /** IANA time zone used to render post timestamps. */
  timeZone: string;
  /** Human-readable abbreviation appended after timestamps (e.g. IST, UTC). */
  timeZoneLabel: string;
  /** Enable the Pagefind-powered offline search page. */
  search: boolean;
  /**
   * Robots, RSS and sitemap generation. Every endpoint is enabled by default.
   *
   * @example
   * discovery: {
   *   robots: { indexing: 'production-only', disallow: ['/private'] },
   *   rss: { include: ['/blog'], exclude: ['/blog/archive'] },
   *   sitemap: false,
   * }
   */
  discovery: DiscoveryConfig;
  /**
   * Visual theme — accent palette, font combination and corner roundedness.
   * Only the selected options ship (fonts register per combo; accents + radius
   * inline per page). Omit any axis to keep the engine's default look.
   */
  theme: ThemeConfig;
  /**
   * Opt-in Progressive Web App support. Disabled unless `pwa.enabled` is set;
   * when on, the build emits a web manifest + a runtime-caching service worker
   * so the site is installable and works offline once visited.
   */
  pwa?: PwaConfig;
  /**
   * Alignment of numbered-block and figure captions (Algorithm, Listing,
   * DocImage). Each kind falls back to `default`, which itself defaults to
   * `'center'`. Posts may override any kind via the `captionAlign` frontmatter
   * field.
   */
  captionAlign?: CaptionAlignConfig;
}

const ICON_HOME =
  '<path d="M3 9.5 12 3l9 6.5"></path><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"></path><path d="M9 21v-6h6v6"></path>';
const ICON_CATEGORIES =
  '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect>';
const ICON_TAGS =
  '<path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59A2 2 0 0 0 3.83 11l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83z"></path><circle cx="7" cy="7" r="1.2"></circle>';
const ICON_SEARCH =
  '<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>';
const ICON_RSS =
  '<path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1.4"></circle>';

export const defaultBlogConfig: BlogConfig = {
  brand: 'Grihasetu',
  title: 'Grihasetu Blog',
  description:
    'Engineering notes, deep dives and field reports — built with Astro, MDX and a lot of care for performance.',
  author: 'Sona Praneeth Akula',
  pageSize: 7,
  timeZone: 'Asia/Kolkata',
  timeZoneLabel: 'IST',
  search: true,
  discovery: resolveDiscoveryConfig(),
  theme: {},
  captionAlign: { default: 'center' },
  nav: [
    { href: '/', label: 'Home', icon: ICON_HOME },
    { href: '/categories', label: 'Categories', icon: ICON_CATEGORIES },
    { href: '/tags', label: 'Tags', icon: ICON_TAGS },
    { href: '/search', label: 'Search', icon: ICON_SEARCH },
    { href: '/rss.xml', label: 'RSS', icon: ICON_RSS },
  ],
  socials: [
    {
      id: 'github',
      href: 'https://github.com/grihasetu',
      label: 'GitHub',
      icon: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path>',
    },
    {
      id: 'rss',
      href: '/rss.xml',
      label: 'RSS',
      icon: ICON_RSS,
    },
  ],
};

/** Merge a partial site config onto the defaults. */
export type BlogConfigInput = Omit<Partial<BlogConfig>, 'discovery'> & {
  discovery?: DiscoveryConfigInput;
};

export function defineBlogConfig(config: BlogConfigInput): BlogConfig {
  const discovery = resolveDiscoveryConfig(config.discovery);
  const nav = config.nav ?? defaultBlogConfig.nav;
  const hasRssLink = nav.some((link) => link.href === '/rss.xml');
  const resolvedNav = discovery.rss.enabled
    ? (hasRssLink ? nav : [...nav, { href: '/rss.xml', label: 'RSS', icon: ICON_RSS }])
    : nav.filter((link) => link.href !== '/rss.xml');
  const socials = (config.socials ?? defaultBlogConfig.socials)
    .filter((social) => discovery.rss.enabled || social.id !== 'rss');
  return { ...defaultBlogConfig, ...config, discovery, nav: resolvedNav, socials };
}
