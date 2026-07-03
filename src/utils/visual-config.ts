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

import type { Hass, StrategyConfig } from '../types';
import { THEME_PRESETS } from '../types';
import { generateFromMood, generateFromSeed, generateFromTimeMood, paletteToTokens, resolveMode, type MoodPaletteResult } from '../themes/palette-generator';
import { applyDefaultStylePack } from './style-packs';

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
  // Seed color engine
  seed_color?: string;
  mood_preset?: string;
  auto_dark?: boolean;
  // Phase 6: Context-aware adaptation
  auto_mood?: boolean;
  time_moods?: {
    dawn?: string;
    day?: string;
    dusk?: string;
    night?: string;
    midnight?: string;
  };
  area_skins?: Record<string, string>;
  // card_sizes: per-card Bento size overrides
  card_sizes?: Record<string, string>;
  // layout_density: compact | standard | spacious
  layout_density?: 'compact' | 'standard' | 'spacious';
  // Palette-generated semantic colors
  accent?: string;
  text_muted?: string;
  success?: string;
  warning?: string;
  danger?: string;
  info?: string;
  primary_light?: string;
  gradient_primary?: string;
  shadow_card?: string;
  shadow_elevated?: string;
}

/**
 * Resolve the merged token overrides from strategy config + localStorage.
 */
export function resolveTokens(config: StrategyConfig, hass?: Hass): ResolvedTokens {
  const result: ResolvedTokens = {};
  const persistedVisual = normalizePersistedVisualConfig(config);
  const localVisual = loadStoredConfig();
  const storedVisual = mergeStoredVisualConfig(persistedVisual, localVisual);

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

  // 1b. Apply seed color / mood preset palette (if active in localStorage)
  //     This generates a full palette from a seed color and sets it as the
  //     base color layer. Explicit YAML/localStorage overrides below still
  //     take precedence for individual fields.
  if (storedVisual) {
    let palette: MoodPaletteResult | null = null;

    // Phase 6: Auto mood switching — time-based mood takes priority
    if (storedVisual.auto_mood) {
      const autoDark = storedVisual.auto_dark !== false;
      palette = generateFromTimeMood(storedVisual.time_moods, autoDark);
    } else if (storedVisual.mood_preset && storedVisual.mood_preset !== 'custom') {
      const autoDark = storedVisual.auto_dark !== false; // default true
      palette = generateFromMood(storedVisual.mood_preset, autoDark);
    } else if (storedVisual.seed_color) {
      const mode = storedVisual.auto_dark !== false ? 'auto' : 'light';
      palette = generateFromSeed(storedVisual.seed_color, mode);
    }

    if (palette) {
      const tokens = paletteToTokens(palette);
      // Apply palette as base layer (only if not already overridden by theme preset)
      if (tokens.primary) result.primary = tokens.primary;
      if (tokens.page_bg) result.page_bg = tokens.page_bg;
      if (tokens.card_bg) result.card_bg = tokens.card_bg;
      if (tokens.text_primary) result.text_primary = tokens.text_primary;
      if (tokens.text_secondary) result.text_secondary = tokens.text_secondary;
      if (tokens.border) result.border = tokens.border;
      if (tokens.card_style) result.card_style = tokens.card_style;
      if (tokens.border_radius != null) result.border_radius = tokens.border_radius;
      // Store palette metadata
      result.seed_color = palette.seed;
      result.mood_preset = palette.mood_id;
      result.auto_dark = storedVisual.auto_dark !== false;
      // Phase 6: Context-aware adaptation
      result.auto_mood = storedVisual.auto_mood === true;
      result.time_moods = storedVisual.time_moods as ResolvedTokens['time_moods'];
      result.area_skins = storedVisual.area_skins as ResolvedTokens['area_skins'];
      result.card_sizes = storedVisual.card_sizes as ResolvedTokens['card_sizes'];
      result.layout_density = storedVisual.layout_density as ResolvedTokens['layout_density'];
      // Store semantic/derived colors
      result.accent = palette.accent;
      result.text_muted = palette.text_muted;
      result.success = palette.success;
      result.warning = palette.warning;
      result.danger = palette.danger;
      result.info = palette.info;
      result.primary_light = palette.primary_light;
      result.gradient_primary = palette.gradient_primary;
      result.shadow_card = palette.shadow_card;
      result.shadow_elevated = palette.shadow_elevated;
    }
  }

  // 2. Apply per-field YAML overrides (these take precedence over palette)
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

  // 3. Apply persisted + localStorage overrides (Settings page)
  if (storedVisual) {
    if (storedVisual.page_bg) result.page_bg = storedVisual.page_bg;
    if (storedVisual.card_bg) result.card_bg = storedVisual.card_bg;
    if (storedVisual.primary) result.primary = storedVisual.primary;
    if (storedVisual.text_primary) result.text_primary = storedVisual.text_primary;
    if (storedVisual.text_secondary) result.text_secondary = storedVisual.text_secondary;
    if (storedVisual.border) result.border = storedVisual.border;
    if (storedVisual.border_radius !== undefined) result.border_radius = storedVisual.border_radius;
    if (storedVisual.card_padding !== undefined) result.card_padding = storedVisual.card_padding;
    if (storedVisual.card_gap !== undefined) result.card_gap = storedVisual.card_gap as number;
    if (storedVisual.font_family) result.font_family = storedVisual.font_family;
    if (storedVisual.shadows === false) result.shadows = false;
    if (storedVisual.card_style) result.card_style = storedVisual.card_style;
    if (storedVisual.card_sizes) result.card_sizes = storedVisual.card_sizes as ResolvedTokens['card_sizes'];
    if (storedVisual.layout_density) result.layout_density = storedVisual.layout_density as ResolvedTokens['layout_density'];
  }

  return hass ? applyDefaultStylePack(result, hass, config) : result;
}

function mergeStoredVisualConfig(
  persisted: StoredVisualConfig | null,
  local: StoredVisualConfig | null,
): StoredVisualConfig | null {
  if (!persisted && !local) return null;
  return { ...(persisted || {}), ...(local || {}) };
}

function normalizePersistedVisualConfig(config: StrategyConfig): StoredVisualConfig | null {
  const visual = config.hdp_config?.visual as Record<string, unknown> | undefined;
  if (!visual || typeof visual !== 'object' || Array.isArray(visual)) return null;

  const normalized: StoredVisualConfig = {};
  const colors = visual.colors && typeof visual.colors === 'object' && !Array.isArray(visual.colors)
    ? visual.colors as Record<string, unknown>
    : {};

  for (const key of ['page_bg', 'card_bg', 'primary', 'text_primary', 'text_secondary', 'border']) {
    const value = colors[key] ?? visual[key];
    if (typeof value === 'string') normalized[key] = value;
  }

  for (const key of ['card_style', 'font_family', 'seed_color', 'mood_preset', 'theme']) {
    const value = visual[key];
    if (typeof value === 'string') normalized[key] = value;
  }

  if (typeof visual.theme_id === 'string') normalized.theme = visual.theme_id;

  for (const key of ['border_radius', 'card_padding', 'card_gap']) {
    const value = visual[key];
    if (typeof value === 'number' && Number.isFinite(value)) normalized[key] = value;
  }

  if (typeof visual.shadows === 'boolean') normalized.shadows = visual.shadows;
  if (typeof visual.auto_dark === 'boolean') normalized.auto_dark = visual.auto_dark;
  if (typeof visual.auto_mood === 'boolean') normalized.auto_mood = visual.auto_mood;

  if (visual.time_moods && typeof visual.time_moods === 'object' && !Array.isArray(visual.time_moods)) {
    normalized.time_moods = visual.time_moods as StoredVisualConfig['time_moods'];
  }
  if (visual.area_skins && typeof visual.area_skins === 'object' && !Array.isArray(visual.area_skins)) {
    normalized.area_skins = visual.area_skins as Record<string, string>;
  }
  if (visual.card_sizes && typeof visual.card_sizes === 'object' && !Array.isArray(visual.card_sizes)) {
    normalized.card_sizes = visual.card_sizes as Record<string, string>;
  }
  if (visual.layout_density === 'compact' || visual.layout_density === 'standard' || visual.layout_density === 'spacious') {
    normalized.layout_density = visual.layout_density;
  }

  return Object.keys(normalized).length ? normalized : null;
}

// ─── localStorage Persistence ──────────────────────────────────────────────

export interface StoredVisualConfig {
  [key: string]: string | number | boolean | undefined | Record<string, string> | object;
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
  theme?: string;
  // Seed color engine
  seed_color?: string;
  mood_preset?: string;
  auto_dark?: boolean;
  // Phase 6: Context-aware adaptation
  auto_mood?: boolean;
  time_moods?: {
    dawn?: string;
    day?: string;
    dusk?: string;
    night?: string;
    midnight?: string;
  };
  area_skins?: Record<string, string>;
  card_sizes?: Record<string, string>;
  layout_density?: 'compact' | 'standard' | 'spacious';
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
