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
 * By default only the selected option ships:
 *   - Fonts are registered with Astro's Fonts API per combo (see
 *     {@link themeFontEntries}), so a build downloads only the chosen families.
 *   - Accent colours + radius are emitted as a tiny inline `<style>` per page
 *     (see {@link renderThemeStyle}), so no unused palette ever ships.
 *
 * Setting `switcher: true` opts into a live preview: every palette, font combo
 * and radius is shipped (as `data-*` presets) and the ThemeSwitcher panel flips
 * them at runtime. This is a design/preview aid — leave it off for production so
 * only the selected option ships.
 *
 * The engines keep their existing neutral surface tokens (`--bg`, `--surface`,
 * `--text`, …) in `global.css`; this module only overrides the per-config
 * accent + radius (+ font) tokens.
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
  /**
   * Show the live theme switcher and ship every palette / font / radius so a
   * visitor can preview them. Off by default (production ships only the
   * selected option). Enable to evaluate which combination fits best.
   */
  switcher?: boolean;
}

export interface ResolvedTheme {
  palette: PaletteName;
  fonts: FontComboName;
  radius: RadiusName;
  switcher: boolean;
}

/** Preserves the engines' original look when a site sets no `theme`. */
export const DEFAULT_THEME: ResolvedTheme = {
  palette: 'indigo',
  fonts: 'jakarta',
  radius: 'default',
  switcher: false,
};

/** The six accent custom properties each palette defines for one colour scheme. */
interface AccentTokens {
  '--accent': string;
  '--accent-gradient-end': string;
  '--accent-text': string;
  '--accent-contrast': string;
  '--accent-glow': string;
  '--accent-soft': string;
  /** Allows passing the token map to {@link declarations} (Record<string,string>). */
  [key: string]: string;
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

/* ───────────────────────────── Fonts (families) ─────────────────────────── */

/** A self-hosted family to register with Astro's Fonts API. */
interface FontFamily {
  /** Google Fonts family name. */
  name: string;
  /** Variable-axis range or discrete weights (non-empty). */
  weights: [string, ...string[]];
}

/** The three logical roles a font combo can fill. */
interface FontCombo {
  sans?: FontFamily;
  heading?: FontFamily;
  mono?: FontFamily;
}

type FontRole = 'sans' | 'heading' | 'mono';

/** The standard `--font-*-files` variable each role binds to in `global.css`. */
const ROLE_VAR: Record<FontRole, string> = {
  sans: '--font-sans-files',
  heading: '--font-heading-files',
  mono: '--font-mono-files',
};

const FONT_ROLES: FontRole[] = ['sans', 'heading', 'mono'];

/**
 * Font combinations. `jakarta` is the engines' original trio; the rest are
 * adapted from the design system's font stacks. `system` registers nothing —
 * text uses the native OS stack via the `var(--font-*-files, <system>)`
 * fallback already in `global.css`. Combos that omit `mono` fall back to the
 * system monospace stack.
 */
const FONT_COMBOS: Record<FontComboName, FontCombo> = {
  jakarta: {
    sans: { name: 'Plus Jakarta Sans', weights: ['300 800'] },
    heading: { name: 'Space Grotesk', weights: ['300 700'] },
    mono: { name: 'JetBrains Mono', weights: ['400 700'] },
  },
  modern: {
    sans: { name: 'Inter', weights: ['300 800'] },
    heading: { name: 'Inter', weights: ['300 800'] },
    mono: { name: 'JetBrains Mono', weights: ['400 700'] },
  },
  classical: {
    sans: { name: 'Merriweather', weights: ['400 700'] },
    heading: { name: 'Playfair Display', weights: ['400 700'] },
  },
  geometric: {
    sans: { name: 'Poppins', weights: ['400 700'] },
    heading: { name: 'Poppins', weights: ['400 700'] },
  },
  system: {},
};

/** Lower-kebab slug of a family name, used for switcher-mode CSS variables. */
function familySlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * A self-hosted font family to register with Astro's Fonts API. The engine adds
 * the provider (Google Fonts); this stays provider-agnostic so it can live in
 * the shared package without importing `astro/config`.
 */
export interface ThemeFontEntry {
  /** Google Fonts family name. */
  name: string;
  /** Custom property the `<Font>` component binds the self-hosted family to. */
  cssVariable: string;
  /** Variable-axis range or discrete weights (non-empty). */
  weights: [string, ...string[]];
  styles: ['normal'];
  subsets: ['latin'];
}

/** A `<Font>` slot the layout renders for an active, registered family. */
export interface ThemeFontVar {
  cssVariable: string;
  /** Preload above-the-fold families (body + heading), defer mono. */
  preload: boolean;
}

function fontEntry(name: string, cssVariable: string, weights: [string, ...string[]]): ThemeFontEntry {
  return { name, cssVariable, weights, styles: ['normal'], subsets: ['latin'] };
}

/** Body + heading roles preload (above the fold); mono defers. */
const PRELOAD_ROLES = new Set<FontRole>(['sans', 'heading']);

/* ─────────────────────────── Switcher option lists ──────────────────────── */

export interface PaletteOption {
  value: PaletteName;
  label: string;
  /** Representative light-mode swatch colour for the UI. */
  swatch: string;
}
export interface FontOption {
  value: FontComboName;
  label: string;
}
export interface RadiusOption {
  value: RadiusName;
  label: string;
}

export const PALETTE_OPTIONS: PaletteOption[] = [
  { value: 'indigo', label: 'Indigo', swatch: PALETTES.indigo.light['--accent'] },
  { value: 'emerald', label: 'Emerald', swatch: PALETTES.emerald.light['--accent'] },
  { value: 'violet', label: 'Violet', swatch: PALETTES.violet.light['--accent'] },
];

export const FONT_OPTIONS: FontOption[] = [
  { value: 'jakarta', label: 'Jakarta' },
  { value: 'modern', label: 'Modern' },
  { value: 'classical', label: 'Classical' },
  { value: 'geometric', label: 'Geometric' },
  { value: 'system', label: 'System' },
];

export const RADIUS_OPTIONS: RadiusOption[] = [
  { value: 'none', label: 'None' },
  { value: 'small', label: 'Small' },
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
  { value: 'full', label: 'Full' },
];

/* ─────────────────────────────── Resolution ─────────────────────────────── */

/** Merge a partial theme selection onto the defaults. */
export function resolveTheme(theme?: ThemeConfig): ResolvedTheme {
  return { ...DEFAULT_THEME, ...theme };
}

/** Every unique family across all combos, registered under `--ff-<slug>`. */
function allFamilyEntries(): ThemeFontEntry[] {
  const seen = new Map<string, ThemeFontEntry>();
  for (const combo of Object.values(FONT_COMBOS)) {
    for (const role of FONT_ROLES) {
      const fam = combo[role];
      if (!fam) continue;
      const slug = familySlug(fam.name);
      if (!seen.has(slug)) seen.set(slug, fontEntry(fam.name, `--ff-${slug}`, fam.weights));
    }
  }
  return [...seen.values()];
}

/**
 * Font families to register with Astro's Fonts API.
 *
 *   - Default: only the selected combo's families, bound to the standard
 *     `--font-*-files` variables (so only those download).
 *   - Switcher: every family across all combos, bound to `--ff-<slug>`; the
 *     active combo is mapped onto the standard variables in CSS (see
 *     {@link renderThemeStyle}), enabling runtime font switching.
 */
export function themeFontEntries(theme: ResolvedTheme): ThemeFontEntry[] {
  if (theme.switcher) return allFamilyEntries();
  const combo = FONT_COMBOS[theme.fonts];
  const entries: ThemeFontEntry[] = [];
  const seen = new Set<string>();
  for (const role of FONT_ROLES) {
    const fam = combo[role];
    if (!fam) continue;
    const cssVariable = ROLE_VAR[role];
    if (seen.has(cssVariable)) continue;
    seen.add(cssVariable);
    entries.push(fontEntry(fam.name, cssVariable, fam.weights));
  }
  return entries;
}

/**
 * The `<Font>` slots the layout should render. In switcher mode every family is
 * rendered (so any combo can be selected); only the active combo's body +
 * heading families are preloaded to keep the initial paint fast.
 */
export function themeFontVars(theme: ResolvedTheme): ThemeFontVar[] {
  if (theme.switcher) {
    const combo = FONT_COMBOS[theme.fonts];
    const preload = new Set<string>();
    for (const role of FONT_ROLES) {
      const fam = combo[role];
      if (fam && PRELOAD_ROLES.has(role)) preload.add(`--ff-${familySlug(fam.name)}`);
    }
    return allFamilyEntries().map((e) => ({
      cssVariable: e.cssVariable,
      preload: preload.has(e.cssVariable),
    }));
  }
  const combo = FONT_COMBOS[theme.fonts];
  const vars: ThemeFontVar[] = [];
  const seen = new Set<string>();
  for (const role of FONT_ROLES) {
    const fam = combo[role];
    if (!fam) continue;
    const cssVariable = ROLE_VAR[role];
    if (seen.has(cssVariable)) continue;
    seen.add(cssVariable);
    vars.push({ cssVariable, preload: PRELOAD_ROLES.has(role) });
  }
  return vars;
}

/* ──────────────────────────── CSS / script output ───────────────────────── */

/** Render `key: value;` declarations, one per line, at a given indent. */
function declarations(tokens: Record<string, string>, indent = '  '): string {
  return Object.entries(tokens)
    .map(([key, value]) => `${indent}${key}: ${value};`)
    .join('\n');
}

/**
 * Map the active `--font-*-files` variables onto a combo's families. Roles a
 * combo doesn't define are reset to `initial` so `var(--font-*-files, <system>)`
 * falls back to the native OS stack.
 */
function fontMap(fonts: FontComboName): Record<string, string> {
  const combo = FONT_COMBOS[fonts];
  const map: Record<string, string> = {};
  for (const role of FONT_ROLES) {
    const fam = combo[role];
    map[ROLE_VAR[role]] = fam ? `var(--ff-${familySlug(fam.name)})` : 'initial';
  }
  return map;
}

/**
 * Inline CSS that applies the theme. By default only the selected palette +
 * radius ship. In switcher mode every palette, radius and font combo ships as a
 * `data-*` preset (plus the selected one as the `:root` default), so the
 * switcher can flip them at runtime.
 *
 * Mirrors the engines' colour-scheme structure: defaults in `:root`, dark via
 * the system media query, plus explicit `data-theme` overrides for the toggle.
 */
export function renderThemeStyle(theme: ResolvedTheme): string {
  const palette = PALETTES[theme.palette];
  const radius = RADII[theme.radius];

  if (!theme.switcher) {
    return [
      `:root {\n${declarations({ ...palette.light, '--radius-base': radius })}\n}`,
      `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${declarations(palette.dark, '    ')}\n  }\n}`,
      `html[data-theme="light"] {\n${declarations(palette.light)}\n}`,
      `html[data-theme="dark"] {\n${declarations(palette.dark)}\n}`,
    ].join('\n');
  }

  const blocks: string[] = [];

  // Selected defaults on :root (accents + radius + active font mapping).
  blocks.push(
    `:root {\n${declarations({ ...palette.light, '--radius-base': radius, ...fontMap(theme.fonts) })}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${declarations(palette.dark, '    ')}\n  }\n}`,
    `html[data-theme="dark"] {\n${declarations(palette.dark)}\n}`,
  );

  // Every palette as a switchable preset (light + both dark paths).
  for (const { value } of PALETTE_OPTIONS) {
    const p = PALETTES[value];
    blocks.push(
      `html[data-palette="${value}"] {\n${declarations(p.light)}\n}`,
      `@media (prefers-color-scheme: dark) {\n  html[data-palette="${value}"]:not([data-theme="light"]) {\n${declarations(p.dark, '    ')}\n  }\n}`,
      `html[data-palette="${value}"][data-theme="dark"] {\n${declarations(p.dark)}\n}`,
    );
  }

  // Every radius + font combo as a switchable preset.
  for (const { value } of RADIUS_OPTIONS) {
    blocks.push(`html[data-radius="${value}"] {\n  --radius-base: ${RADII[value]};\n}`);
  }
  for (const { value } of FONT_OPTIONS) {
    blocks.push(`html[data-font="${value}"] {\n${declarations(fontMap(value))}\n}`);
  }

  return blocks.join('\n');
}

/**
 * Tiny synchronous script that applies the visitor's stored switcher selections
 * before first paint (avoiding a flash). Only emitted in switcher mode; the
 * light/dark `data-theme` is already handled by the layout's existing script.
 */
export function renderThemeInitScript(): string {
  return [
    '(() => {',
    '  try {',
    '    const d = document.documentElement;',
    "    const p = localStorage.getItem('theme-palette');",
    "    const f = localStorage.getItem('theme-font');",
    "    const r = localStorage.getItem('theme-radius');",
    "    if (p) d.setAttribute('data-palette', p);",
    "    if (f) d.setAttribute('data-font', f);",
    "    if (r) d.setAttribute('data-radius', r);",
    '  } catch {}',
    '})();',
  ].join('\n');
}
