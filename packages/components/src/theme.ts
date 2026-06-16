/**
 * Shared, config-driven theme system for the blog and notes engines.
 *
 * Three independent axes — copied/adapted from the Griha Setu design system —
 * let a site restyle itself from its config without touching CSS:
 *
 *   - `palette` — the accent colour family (neutral surfaces stay shared).
 *   - `fonts`   — a font combination (heading / body / mono).
 *   - `radius`  — corner roundedness.
 *
 * Only the selected option ships:
 *   - Fonts are registered with Astro's Fonts API per combo (see
 *     {@link themeFontEntries}), so a build downloads only the chosen families.
 *   - Accent colours + radius are emitted as a tiny inline `<style>` per page
 *     (see {@link renderThemeStyle}), so no unused palette ever ships.
 *
 * The engines keep their existing neutral surface tokens (`--bg`, `--surface`,
 * `--text`, …) in `global.css`; this module only overrides the per-config
 * accent + radius tokens.
 */

export type PaletteName = 'indigo' | 'emerald' | 'violet';
export type FontComboName =
  | 'jakarta'
  | 'modern'
  | 'classical'
  | 'geometric'
  | 'system';
export type RadiusName = 'none' | 'small' | 'default' | 'large' | 'full';

/** Per-site theme selection. Any omitted axis falls back to {@link DEFAULT_THEME}. */
export interface ThemeConfig {
  /** Accent colour family. Default `indigo`. */
  palette?: PaletteName;
  /** Font combination. Default `jakarta` (the engine's original fonts). */
  fonts?: FontComboName;
  /** Corner roundedness. Default `default`. */
  radius?: RadiusName;
}

export interface ResolvedTheme {
  palette: PaletteName;
  fonts: FontComboName;
  radius: RadiusName;
}

/** Preserves the engines' original look when a site sets no `theme`. */
export const DEFAULT_THEME: ResolvedTheme = {
  palette: 'indigo',
  fonts: 'jakarta',
  radius: 'default',
};

/** The six accent custom properties each palette defines for one colour scheme. */
interface AccentTokens {
  '--accent': string;
  '--accent-gradient-end': string;
  '--accent-text': string;
  '--accent-contrast': string;
  '--accent-glow': string;
  '--accent-soft': string;
}

interface Palette {
  light: AccentTokens;
  dark: AccentTokens;
}

/**
 * Accent families. Neutral surfaces/text are shared (defined in each engine's
 * `global.css`); only these accent tokens vary per palette.
 *
 *   - indigo  — the engines' original indigo→violet accent (unchanged default).
 *   - emerald — adapted from the design system's `expense` brand (green hue).
 *   - violet  — adapted from the design system's `identity` brand (blue-purple).
 */
const PALETTES: Record<PaletteName, Palette> = {
  indigo: {
    light: {
      '--accent': '#4f46e5',
      '--accent-gradient-end': '#7c3aed',
      '--accent-text': '#4f46e5',
      '--accent-contrast': '#ffffff',
      '--accent-glow': 'rgba(79, 70, 229, 0.12)',
      '--accent-soft': 'rgba(79, 70, 229, 0.08)',
    },
    dark: {
      '--accent': '#818cf8',
      '--accent-gradient-end': '#c084fc',
      '--accent-text': '#a5b4fc',
      '--accent-contrast': '#0d0f12',
      '--accent-glow': 'rgba(129, 140, 248, 0.25)',
      '--accent-soft': 'rgba(129, 140, 248, 0.12)',
    },
  },
  emerald: {
    light: {
      '--accent': '#059669',
      '--accent-gradient-end': '#0d9488',
      '--accent-text': '#047857',
      '--accent-contrast': '#ffffff',
      '--accent-glow': 'rgba(5, 150, 105, 0.12)',
      '--accent-soft': 'rgba(5, 150, 105, 0.08)',
    },
    dark: {
      '--accent': '#34d399',
      '--accent-gradient-end': '#2dd4bf',
      '--accent-text': '#6ee7b7',
      '--accent-contrast': '#0d0f12',
      '--accent-glow': 'rgba(52, 211, 153, 0.25)',
      '--accent-soft': 'rgba(52, 211, 153, 0.12)',
    },
  },
  violet: {
    light: {
      '--accent': '#7c3aed',
      '--accent-gradient-end': '#c026d3',
      '--accent-text': '#6d28d9',
      '--accent-contrast': '#ffffff',
      '--accent-glow': 'rgba(124, 58, 237, 0.12)',
      '--accent-soft': 'rgba(124, 58, 237, 0.08)',
    },
    dark: {
      '--accent': '#a78bfa',
      '--accent-gradient-end': '#e879f9',
      '--accent-text': '#c4b5fd',
      '--accent-contrast': '#0d0f12',
      '--accent-glow': 'rgba(167, 139, 250, 0.25)',
      '--accent-soft': 'rgba(167, 139, 250, 0.12)',
    },
  },
};

/**
 * Roundedness presets, mirroring the design system's radius scale. The value
 * sets `--radius-base`; the engines derive `--radius-sm/-lg` from it via calc.
 */
const RADII: Record<RadiusName, string> = {
  none: '0px',
  small: '0.35rem',
  default: '0.5rem',
  large: '0.875rem',
  full: '9999px',
};

/**
 * A self-hosted font family to register with Astro's Fonts API. The engine adds
 * the provider (Google Fonts); this stays provider-agnostic so it can live in
 * the shared package without importing `astro/config`.
 */
export interface ThemeFontEntry {
  /** Google Fonts family name. */
  name: string;
  /** Custom property the `<Font>` component binds the self-hosted family to. */
  cssVariable: '--font-sans-files' | '--font-heading-files' | '--font-mono-files';
  /** Variable-axis range or discrete weights. */
  weights: string[];
  styles: ['normal'];
  subsets: ['latin'];
}

/** A `<Font>` slot the layout renders for an active, registered family. */
export interface ThemeFontVar {
  cssVariable: ThemeFontEntry['cssVariable'];
  /** Preload above-the-fold families (body + heading), defer mono. */
  preload: boolean;
}

/**
 * Font combinations. `jakarta` is the engines' original trio; the rest are
 * adapted from the design system's font stacks (modern/classical/geometric/
 * system). `system` registers nothing — text uses the native OS stack via the
 * `var(--font-*-files, <system>)` fallback already in `global.css`.
 */
const FONT_COMBOS: Record<FontComboName, ThemeFontEntry[]> = {
  jakarta: [
    { name: 'Plus Jakarta Sans', cssVariable: '--font-sans-files', weights: ['300 800'], styles: ['normal'], subsets: ['latin'] },
    { name: 'Space Grotesk', cssVariable: '--font-heading-files', weights: ['300 700'], styles: ['normal'], subsets: ['latin'] },
    { name: 'JetBrains Mono', cssVariable: '--font-mono-files', weights: ['400 700'], styles: ['normal'], subsets: ['latin'] },
  ],
  modern: [
    { name: 'Inter', cssVariable: '--font-sans-files', weights: ['300 800'], styles: ['normal'], subsets: ['latin'] },
    { name: 'Inter', cssVariable: '--font-heading-files', weights: ['300 800'], styles: ['normal'], subsets: ['latin'] },
    { name: 'JetBrains Mono', cssVariable: '--font-mono-files', weights: ['400 700'], styles: ['normal'], subsets: ['latin'] },
  ],
  classical: [
    { name: 'Merriweather', cssVariable: '--font-sans-files', weights: ['400 700'], styles: ['normal'], subsets: ['latin'] },
    { name: 'Playfair Display', cssVariable: '--font-heading-files', weights: ['400 700'], styles: ['normal'], subsets: ['latin'] },
  ],
  geometric: [
    { name: 'Poppins', cssVariable: '--font-sans-files', weights: ['400 700'], styles: ['normal'], subsets: ['latin'] },
    { name: 'Poppins', cssVariable: '--font-heading-files', weights: ['400 700'], styles: ['normal'], subsets: ['latin'] },
  ],
  system: [],
};

/** Body + heading preload; mono defers (only used inside code blocks). */
const PRELOAD_VARS = new Set<ThemeFontEntry['cssVariable']>([
  '--font-sans-files',
  '--font-heading-files',
]);

/** Merge a partial theme selection onto the defaults. */
export function resolveTheme(theme?: ThemeConfig): ResolvedTheme {
  return { ...DEFAULT_THEME, ...theme };
}

/**
 * Font families to register with Astro's Fonts API for the selected combo.
 * Used by the engine config factory; only these families download.
 */
export function themeFontEntries(fonts: FontComboName): ThemeFontEntry[] {
  return FONT_COMBOS[fonts];
}

/**
 * The distinct `<Font>` slots the layout should render for the selected combo
 * (deduplicated by cssVariable). Empty for the `system` combo.
 */
export function themeFontVars(fonts: FontComboName): ThemeFontVar[] {
  const seen = new Set<ThemeFontEntry['cssVariable']>();
  const vars: ThemeFontVar[] = [];
  for (const entry of FONT_COMBOS[fonts]) {
    if (seen.has(entry.cssVariable)) continue;
    seen.add(entry.cssVariable);
    vars.push({ cssVariable: entry.cssVariable, preload: PRELOAD_VARS.has(entry.cssVariable) });
  }
  return vars;
}

function accentBlock(tokens: AccentTokens, extra?: Record<string, string>): string {
  const lines = Object.entries({ ...tokens, ...extra })
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
  return lines;
}

/**
 * Inline CSS that applies the selected palette's accents + radius. Emitted once
 * per page in the layout `<head>`, so only the chosen palette ever ships.
 *
 * Mirrors the engines' colour-scheme structure: defaults in `:root`, dark via
 * the system media query, plus explicit `data-theme` overrides for the toggle.
 */
export function renderThemeStyle(theme: ResolvedTheme): string {
  const palette = PALETTES[theme.palette];
  const radius = RADII[theme.radius];
  return [
    `:root {\n${accentBlock(palette.light, { '--radius-base': radius })}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root {\n${accentBlock(palette.dark)
      .split('\n')
      .map((l) => `  ${l}`)
      .join('\n')}\n  }\n}`,
    `html[data-theme="light"] {\n${accentBlock(palette.light)}\n}`,
    `html[data-theme="dark"] {\n${accentBlock(palette.dark)}\n}`,
  ].join('\n');
}
