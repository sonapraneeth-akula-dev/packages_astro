/**
 * The minimal, engine-agnostic site config shared by the chrome components
 * (Header / Footer). Both the notes engine's `DocsConfig` and the blog engine's
 * `BlogConfig` extend {@link SiteChrome}, so the shared components only ever
 * depend on these common fields — never on an engine-specific config shape.
 */

export interface NavLink {
  href: string;
  label: string;
  /** Inner SVG markup (24×24, stroke-based) for the mobile tab bar. */
  icon: string;
}

export interface SocialProfile {
  id: string;
  href: string;
  label: string;
  /** Inner SVG markup (24×24, stroke-based). */
  icon: string;
}

/** Common branding/navigation fields the shared chrome (Header/Footer) needs. */
export interface SiteChrome {
  /** Short brand shown in the header. */
  brand: string;
  /** Default meta description / tagline, shown in the footer. */
  description: string;
  /** Author shown in the footer. */
  author: string;
  /** Header / mobile-tab navigation links. */
  nav: NavLink[];
  /** Footer social links. Entries with an empty href are hidden. */
  socials: SocialProfile[];
}

/** Active socials (href set) — used by the footer. */
export function activeSocials(config: SiteChrome): SocialProfile[] {
  return config.socials.filter((s) => s.href !== '');
}
