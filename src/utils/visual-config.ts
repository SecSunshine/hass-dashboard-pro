/**
 * Visual Configuration Utility (v2.1)
 *
 * Resolves user-configured token overrides from:
 *   1. YAML config → theme preset defaults
 *   2. YAML config → per-field color/shape overrides
 *   3. localStorage → settings page runtime changes
 *
 * When a field is undefined, the CSS layer falls back to
 * HA native theme tokens (var(--primary-color, #fallback)).
 */

import type { StrategyConfig } from '../types';
import { THEME_PRESETS } from '../types';

// ─── localStorage key ─────────────────────────────────────────────────────

const STORAGE_KEY = 'hdp_visual_config';

// ─── Resolved Token Overrides ─────────────────────────────────────────────

/**
 * Only contains fields the user has explicitly overridden.
 * Undefined fields → CSS falls back to HA theme tokens.
 */
export interface ResolvedTokens {
  page_bg?: string;
  card_bg?: string;
  primary?: string;
  text_primary?: string;
  text_secondary?: string;
  border?: string;
  border_radius?: number;
  card_padding?: number;
  card_gap?: number;
  font_family?: string;
  shadows?: boolean;
  card_style?: string;
}

/**
 * Resolve the merged token overrides from strategy config + localStorage.
 */
export function resolveTokens(config: StrategyConfig): ResolvedTokens {
  const result: ResolvedTokens = {};

  // 1. Apply theme preset (only color overrides, not HA-native values)
  const visual = config.visual;
  if (visual?.theme) {
    const preset = THEME_PRESETS[visual.theme];
    if (preset?.colors) {
      result.page_bg = preset.colors.page_bg;
      result.card_bg = preset.colors.card_bg;
      result.primary = preset.colors.primary;
      result.text_primary = preset.colors.text_primary;
      result.text_secondary = preset.colors.text_secondary;
      result.border = preset.colors.border;
    }
    if (preset.border_radius != null) result.border_radius = preset.border_radius;
    if (preset.card_padding != null) result.card_padding = preset.card_padding;
    if (preset.card_gap != null) result.card_gap = preset.card_gap;
    if (preset.font_family) result.font_family = preset.font_family;
    if (preset.shadows === false) result.shadows = false;
  }

  // 2. Apply per-field YAML overrides
  if (visual?.colors) {
    const c = visual.colors;
    if (c.page_bg) result.page_bg = c.page_bg;
    if (c.card_bg) result.card_bg = c.card_bg;
    if (c.primary) result.primary = c.primary;
    if (c.text_primary) result.text_primary = c.text_primary;
    if (c.text_secondary) result.text_secondary = c.text_secondary;
    if (c.border) result.border = c.border;
  }
  if (visual?.border_radius !== undefined) result.border_radius = visual.border_radius;
  if (visual?.card_padding !== undefined) result.card_padding = visual.card_padding;
  if (visual?.card_gap !== undefined) result.card_gap = visual.card_gap;
  if (visual?.font_family) result.font_family = visual.font_family;
  if (visual?.shadows === false) result.shadows = false;
  if (visual?.card_style) result.card_style = visual.card_style;

  // 3. Apply localStorage overrides (Settings page)
  const stored = loadStoredConfig();
  if (stored) {
    if (stored.page_bg) result.page_bg = stored.page_bg;
    if (stored.card_bg) result.card_bg = stored.card_bg;
    if (stored.primary) result.primary = stored.primary;
    if (stored.text_primary) result.text_primary = stored.text_primary;
    if (stored.text_secondary) result.text_secondary = stored.text_secondary;
    if (stored.border) result.border = stored.border;
    if (stored.border_radius !== undefined) result.border_radius = stored.border_radius;
    if (stored.card_padding !== undefined) result.card_padding = stored.card_padding;
    if (stored.font_family) result.font_family = stored.font_family;
    if (stored.shadows === false) result.shadows = false;
    if (stored.card_style) result.card_style = stored.card_style;
  }

  return result;
}

// ─── localStorage Persistence ──────────────────────────────────────────────

export interface StoredVisualConfig {
  [key: string]: string | number | boolean | undefined;
  page_bg?: string;
  card_bg?: string;
  primary?: string;
  text_primary?: string;
  text_secondary?: string;
  border?: string;
  border_radius?: number;
  card_padding?: number;
  font_family?: string;
  shadows?: boolean;
  card_style?: string;
  theme?: string;
}

export function loadStoredConfig(): StoredVisualConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredVisualConfig;
  } catch {
    return null;
  }
}

export function saveStoredConfig(config: StoredVisualConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage might be unavailable
  }
}

export function clearStoredConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
