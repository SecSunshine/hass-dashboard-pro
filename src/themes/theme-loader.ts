/**
 * Theme Loader — Fetches JSON theme files from /local/ directory
 *
 * Theme files are stored at: /local/hass-dashboard-pro/themes/<name>.json
 * (mapped from <config>/www/hass-dashboard-pro/themes/ in HA)
 *
 * Format:
 * {
 *   "name": "My Theme",
 *   "version": "1.0",
 *   "colors": { "page_bg": "#...", "card_bg": "#...", ... },
 *   "layout": { "border_radius": 12, "card_padding": 16, ... },
 *   "font_family": "Inter, sans-serif"
 * }
 */

import type { ThemeDefinition } from '../types';

const THEME_BASE_PATH = '/local/hass-dashboard-pro/themes';

/**
 * Fetch a theme definition from a JSON file.
 * Returns null if the file doesn't exist or is invalid.
 */
export async function loadThemeFile(filename: string): Promise<ThemeDefinition | null> {
  try {
    const url = `${THEME_BASE_PATH}/${filename}.json`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.name || !data.colors) return null;
    return normalizeTheme(data);
  } catch {
    return null;
  }
}

/**
 * Generate client-side JS for theme loading.
 * Returns a function that can be called from settings UI.
 */
export function generateThemeLoaderJS(): string {
  return `
function hdpLoadThemeFile(filename) {
  return fetch('/local/hass-dashboard-pro/themes/' + filename + '.json')
    .then(function(resp) {
      if (!resp.ok) return null;
      return resp.json();
    })
    .catch(function() { return null; });
}

function hdpListThemeFiles() {
  // Theme file list is stored in localStorage after scanning at settings load
  try {
    var cached = localStorage.getItem('hdp_theme_list');
    if (cached) return JSON.parse(cached);
  } catch(e) {}
  return [];
}
`;
}

/**
 * Normalize raw theme JSON into a ThemeDefinition.
 */
function normalizeTheme(raw: Record<string, unknown>): ThemeDefinition {
  const colors = (raw.colors || {}) as Record<string, string>;
  const layout = (raw.layout || {}) as Record<string, number>;

  return {
    name: (raw.name as string) || 'Unknown',
    version: (raw.version as string) || '1.0',
    colors: {
      page_bg: colors.page_bg || '#F4F6FA',
      card_bg: colors.card_bg || '#FFFFFF',
      sidebar_bg: colors.sidebar_bg || colors.card_bg || '#FFFFFF',
      primary: colors.primary || '#4F6EF7',
      text_primary: colors.text_primary || '#1A1D26',
      text_secondary: colors.text_secondary || '#6B7280',
      text_muted: colors.text_muted || '#9CA3AF',
      border: colors.border || 'rgba(0,0,0,0.06)',
      accent: colors.accent || undefined,
    },
    layout: {
      border_radius: layout.border_radius ?? 10,
      card_padding: layout.card_padding ?? 16,
      card_gap: layout.card_gap ?? 12,
      sidebar_width: layout.sidebar_width ?? 260,
    },
    font_family: (raw.font_family as string) || '',
    gradient_primary: (raw.gradient_primary as string) || undefined,
  };
}
