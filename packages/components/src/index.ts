/**
 * Public TypeScript API for @grihasetu/components.
 *
 * The Astro components themselves are imported via their own subpaths so they
 * load through Astro's plugins, e.g.:
 *
 *   import Header from '@grihasetu/components/Header.astro';
 *   import { activeSocials, type SiteChrome } from '@grihasetu/components/chrome';
 */
export { activeSocials } from './chrome';
export type { NavLink, SocialProfile, SiteChrome } from './chrome';
export { icons, isIconName } from './icons';
export type { IconName } from './icons';
