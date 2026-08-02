export interface PathSelectionConfig {
  enabled: boolean;
  /** Route prefixes to include. Empty means every route. */
  include: string[];
  /** Route prefixes to exclude. Exclusions take precedence. */
  exclude: string[];
}

export interface RobotsConfig {
  enabled: boolean;
  /** Whether crawlers may index all builds, no builds, or production builds only. */
  indexing: 'always' | 'never' | 'production-only';
  allow: string[];
  disallow: string[];
}

export interface DiscoveryConfig {
  robots: RobotsConfig;
  rss: PathSelectionConfig;
  sitemap: PathSelectionConfig;
}

export interface DiscoveryConfigInput {
  robots?: boolean | Partial<RobotsConfig>;
  rss?: boolean | Partial<PathSelectionConfig>;
  sitemap?: boolean | Partial<PathSelectionConfig>;
}

const DEFAULT_DISCOVERY: DiscoveryConfig = {
  robots: {
    enabled: true,
    indexing: 'production-only',
    allow: ['/'],
    disallow: [],
  },
  rss: { enabled: true, include: [], exclude: [] },
  sitemap: { enabled: true, include: [], exclude: [] },
};

function resolveFeature<T extends { enabled: boolean }>(
  input: boolean | Partial<T> | undefined,
  defaults: T,
): T {
  if (typeof input === 'boolean') return { ...defaults, enabled: input };
  return { ...defaults, ...input };
}

export function resolveDiscoveryConfig(input: DiscoveryConfigInput = {}): DiscoveryConfig {
  return {
    robots: resolveFeature(input.robots, DEFAULT_DISCOVERY.robots),
    rss: resolveFeature(input.rss, DEFAULT_DISCOVERY.rss),
    sitemap: resolveFeature(input.sitemap, DEFAULT_DISCOVERY.sitemap),
  };
}

function normalizePath(value: string): string {
  const pathname = URL.canParse(value, 'http://localhost')
    ? new URL(value, 'http://localhost').pathname
    : value;
  const normalized = `/${pathname}`.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return normalized || '/';
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  const normalizedPrefix = normalizePath(prefix);
  return normalizedPrefix === '/'
    || pathname === normalizedPrefix
    || pathname.startsWith(`${normalizedPrefix}/`);
}

export function routeIncluded(value: string, config: PathSelectionConfig): boolean {
  if (!config.enabled) return false;
  const pathname = normalizePath(value);
  const included = config.include.length === 0
    || config.include.some((prefix) => matchesPrefix(pathname, prefix));
  return included && !config.exclude.some((prefix) => matchesPrefix(pathname, prefix));
}

export function renderRobots(
  config: DiscoveryConfig,
  site: URL,
  isProduction: boolean,
): string {
  const indexingAllowed = config.robots.indexing === 'always'
    || (config.robots.indexing === 'production-only' && isProduction);
  const lines = ['User-agent: *'];

  if (!indexingAllowed) {
    lines.push('Disallow: /');
  } else {
    lines.push(...config.robots.allow.map((path) => `Allow: ${path}`));
    lines.push(...config.robots.disallow.map((path) => `Disallow: ${path}`));
  }

  if (config.sitemap.enabled) {
    lines.push('', `Sitemap: ${new URL('/sitemap.xml', site).href}`);
  }

  return `${lines.join('\n')}\n`;
}