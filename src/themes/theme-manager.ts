/**
 * Theme Manager — Selection, Application, and Persistence
 *
 * Manages the theme resolution chain:
 *   1. User-selected theme file (from /local/hass-dashboard-pro/themes/)
 *   2. Built-in theme (light, dark, warm, forest)
 *   3. HA native theme tokens (CSS variable fallbacks)
 */

import type { ThemeDefinition, StoredVisualConfig } from '../types';
import { BUILT_IN_THEMES } from './built-in';

// ─── Theme Cache ───────────────────────────────────────────────────────────

const themeCache = new Map<string, ThemeDefinition>();

/**
 * Resolve a theme by ID.
 * - Built-in names: 'light', 'dark', 'warm', 'forest' → return bundled definition
 * - Filename: fetch from /local/ path
 */
export function resolveTheme(themeId: string): ThemeDefinition {
  // Check cache first
  if (themeCache.has(themeId)) {
    return themeCache.get(themeId)!;
  }

  // Built-in themes
  const builtIn = BUILT_IN_THEMES[themeId];
  if (builtIn) {
    themeCache.set(themeId, builtIn);
    return builtIn;
  }

  // Fallback to light theme
  const fallback = BUILT_IN_THEMES['light'];
  themeCache.set(themeId, fallback);
  return fallback;
}

/**
 * Apply a theme definition to the stored visual config.
 * Maps theme colors/layout into the visual config format.
 */
export function applyThemeToVisual(
  theme: ThemeDefinition,
  overrides?: Partial<StoredVisualConfig>,
): Partial<StoredVisualConfig> {
  return {
    theme_id: theme.name,
    colors: {
      page_bg: theme.colors.page_bg,
      card_bg: theme.colors.card_bg,
      sidebar_bg: theme.colors.sidebar_bg,
      primary: theme.colors.primary,
      text_primary: theme.colors.text_primary,
      text_secondary: theme.colors.text_secondary,
      text_muted: theme.colors.text_muted,
      border: theme.colors.border,
      ...(theme.colors.accent ? { accent: theme.colors.accent } : {}),
      ...(overrides?.colors || {}),
    },
    border_radius: overrides?.border_radius ?? theme.layout.border_radius,
    card_padding: overrides?.card_padding ?? theme.layout.card_padding,
    card_gap: overrides?.card_gap ?? theme.layout.card_gap,
    font_family: overrides?.font_family || theme.font_family,
    ...(theme.gradient_primary ? { gradient_primary: theme.gradient_primary } : {}),
  };
}

/**
 * Get all available themes (built-in + any cached file themes).
 */
export function getAvailableThemes(): Array<{ id: string; name: string; is_builtin: boolean }> {
  const themes: Array<{ id: string; name: string; is_builtin: boolean }> = [];

  // Built-in themes
  for (const [id, def] of Object.entries(BUILT_IN_THEMES)) {
    themes.push({ id, name: def.name, is_builtin: true });
  }

  // Cached file themes
  for (const [id, def] of themeCache) {
    if (!BUILT_IN_THEMES[id]) {
      themes.push({ id, name: def.name, is_builtin: false });
    }
  }

  return themes;
}

/**
 * Cache a loaded theme file definition.
 */
export function cacheTheme(id: string, theme: ThemeDefinition): void {
  themeCache.set(id, theme);
}

/**
 * Generate client-side JS for theme management.
 */
export function generateThemeManagerJS(): string {
  const builtInJSON = JSON.stringify(
    Object.fromEntries(
      Object.entries(BUILT_IN_THEMES).map(([id, def]) => [
        id,
        { name: def.name, colors: def.colors, layout: def.layout, font_family: def.font_family },
      ]),
    ),
  );

  return `
var HDP_BUILTIN_THEMES = ${builtInJSON};

function hdpGetTheme(themeId) {
  if (HDP_BUILTIN_THEMES[themeId]) {
    return HDP_BUILTIN_THEMES[themeId];
  }
  return HDP_BUILTIN_THEMES['light'];
}

function hdpApplyTheme(themeId) {
  var theme = hdpGetTheme(themeId);
  var config = hdpLoadConfig();
  config.visual = config.visual || {};
  config.visual.theme_id = themeId;
  config.visual.colors = Object.assign({}, theme.colors, config.visual.colors);
  config.visual.border_radius = theme.layout.border_radius;
  config.visual.card_padding = theme.layout.card_padding;
  config.visual.card_gap = theme.layout.card_gap;
  config.visual.font_family = theme.font_family;
  hdpSaveConfig(config);
  // Reload to apply
  window.location.reload();
}
`;
}
