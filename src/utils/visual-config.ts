/**
 * Visual Configuration Utility
 *
 * Merges user YAML config with THEME_PRESETS defaults.
 * Supports localStorage-based runtime overrides (Settings page).
 */

import type { VisualConfig, StrategyConfig, ThemePreset } from '../types';
import { THEME_PRESETS } from '../types';
import { COLORS, SPACING, SHAPE, SHADOWS, TYPOGRAPHY, MOTION, LAYOUT } from '../styles/design-tokens';

// ─── localStorage key ─────────────────────────────────────────────────────

const STORAGE_KEY = 'hdp_visual_config';

// ─── Merged Design Tokens ─────────────────────────────────────────────────

export interface ResolvedTokens {
  page_bg: string;
  card_bg: string;
  sidebar_bg: string;
  primary: string;
  primary_light: string;
  text_primary: string;
  text_secondary: string;
  text_muted: string;
  text_inverse: string;
  success: string;
  success_light: string;
  warning: string;
  warning_light: string;
  danger: string;
  danger_light: string;
  border: string;
  border_light: string;
  divider: string;
  border_radius: number;
  border_radius_lg: number;
  border_radius_pill: number;
  card_padding: number;
  sidebar_width: number;
  card_gap: number;
  font_family: string;
  shadow_card: string;
  shadow_elevated: string;
  shadow_nav: string;
  motion_base: string;
  motion_easing: string;
  animations: boolean;
  touch_target: number;
}

/**
 * Resolve the final design tokens from strategy config + localStorage.
 */
export function resolveTokens(config: StrategyConfig): ResolvedTokens {
  // 1. Start with hardcoded defaults (design-tokens.ts)
  const base: ResolvedTokens = {
    page_bg: COLORS.page_bg,
    card_bg: COLORS.card_bg,
    sidebar_bg: COLORS.sidebar_bg,
    primary: COLORS.primary,
    primary_light: COLORS.primary_100,
    text_primary: COLORS.text_primary,
    text_secondary: COLORS.text_secondary,
    text_muted: COLORS.text_muted,
    text_inverse: COLORS.text_inverse,
    success: COLORS.success,
    success_light: COLORS.success_light,
    warning: COLORS.warning,
    warning_light: COLORS.warning_light,
    danger: COLORS.danger,
    danger_light: COLORS.danger_light,
    border: COLORS.border,
    border_light: COLORS.border_light,
    divider: COLORS.divider,
    border_radius: SHAPE.radius,
    border_radius_lg: SHAPE.radius_lg,
    border_radius_pill: SHAPE.radius_pill,
    card_padding: LAYOUT.card_padding,
    sidebar_width: LAYOUT.sidebar_width,
    card_gap: LAYOUT.gap_grid,
    font_family: TYPOGRAPHY.font_family,
    shadow_card: SHADOWS.card,
    shadow_elevated: SHADOWS.elevated,
    shadow_nav: SHADOWS.nav,
    motion_base: MOTION.duration_base,
    motion_easing: MOTION.easing,
    animations: true,
    touch_target: LAYOUT.touch_target,
  };

  // 2. Apply theme preset from YAML config
  const visualConfig = config.visual;
  if (visualConfig?.theme) {
    const preset = THEME_PRESETS[visualConfig.theme];
    if (preset && preset.colors) {
      base.page_bg = preset.colors.page_bg ?? base.page_bg;
      base.card_bg = preset.colors.card_bg ?? base.card_bg;
      base.sidebar_bg = preset.colors.sidebar_bg ?? base.sidebar_bg;
      base.primary = preset.colors.primary ?? base.primary;
      base.text_primary = preset.colors.text_primary ?? base.text_primary;
      base.text_secondary = preset.colors.text_secondary ?? base.text_secondary;
      base.text_muted = preset.colors.text_muted ?? base.text_muted;
      base.border = preset.colors.border ?? base.border;
      base.border_radius = preset.border_radius ?? base.border_radius;
      base.card_padding = preset.card_padding ?? base.card_padding;
      base.sidebar_width = preset.sidebar_width ?? base.sidebar_width;
      base.font_family = preset.font_family ?? base.font_family;
      base.card_gap = preset.card_gap ?? base.card_gap;
      base.shadow_card = preset.shadows === false ? 'none' : base.shadow_card;
      base.shadow_elevated = preset.shadows === false ? 'none' : base.shadow_elevated;
      base.shadow_nav = preset.shadows === false ? 'none' : base.shadow_nav;
      base.animations = preset.animations ?? true;
    }
  }

  // 3. Apply per-field overrides from YAML config
  if (visualConfig?.colors) {
    const c = visualConfig.colors;
    if (c.page_bg) base.page_bg = c.page_bg;
    if (c.card_bg) base.card_bg = c.card_bg;
    if (c.sidebar_bg) base.sidebar_bg = c.sidebar_bg;
    if (c.primary) base.primary = c.primary;
    if (c.text_primary) base.text_primary = c.text_primary;
    if (c.text_secondary) base.text_secondary = c.text_secondary;
    if (c.text_muted) base.text_muted = c.text_muted;
    if (c.border) base.border = c.border;
  }
  if (visualConfig?.border_radius !== undefined) base.border_radius = visualConfig.border_radius;
  if (visualConfig?.card_padding !== undefined) base.card_padding = visualConfig.card_padding;
  if (visualConfig?.sidebar_width !== undefined) base.sidebar_width = visualConfig.sidebar_width;
  if (visualConfig?.font_family) base.font_family = visualConfig.font_family;
  if (visualConfig?.card_gap !== undefined) base.card_gap = visualConfig.card_gap;
  if (visualConfig?.shadows === false) {
    base.shadow_card = 'none';
    base.shadow_elevated = 'none';
    base.shadow_nav = 'none';
  }
  if (visualConfig?.animations !== undefined) base.animations = visualConfig.animations;

  // 4. Apply localStorage runtime overrides (Settings page)
  const stored = loadStoredConfig();
  if (stored) {
    if (stored.page_bg) base.page_bg = stored.page_bg;
    if (stored.card_bg) base.card_bg = stored.card_bg;
    if (stored.sidebar_bg) base.sidebar_bg = stored.sidebar_bg;
    if (stored.primary) base.primary = stored.primary;
    if (stored.text_primary) base.text_primary = stored.text_primary;
    if (stored.text_secondary) base.text_secondary = stored.text_secondary;
    if (stored.text_muted) base.text_muted = stored.text_muted;
    if (stored.border) base.border = stored.border;
    if (stored.border_radius !== undefined) base.border_radius = stored.border_radius;
    if (stored.card_padding !== undefined) base.card_padding = stored.card_padding;
    if (stored.sidebar_width !== undefined) base.sidebar_width = stored.sidebar_width;
    if (stored.font_family) base.font_family = stored.font_family;
    if (stored.shadows === false) {
      base.shadow_card = 'none';
      base.shadow_elevated = 'none';
      base.shadow_nav = 'none';
    }
  }

  return base;
}

// ─── localStorage Persistence ──────────────────────────────────────────────

export interface StoredVisualConfig {
  [key: string]: string | number | boolean | undefined;
  page_bg?: string;
  card_bg?: string;
  sidebar_bg?: string;
  primary?: string;
  text_primary?: string;
  text_secondary?: string;
  text_muted?: string;
  border?: string;
  border_radius?: number;
  card_padding?: number;
  sidebar_width?: number;
  font_family?: string;
  shadows?: boolean;
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
    // localStorage might be unavailable (private browsing)
  }
}

export function clearStoredConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

// ─── Derive derived values ─────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  const v = parseInt(match[1], 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, rgb.r + amount);
  const g = Math.min(255, rgb.g + amount);
  const b = Math.min(255, rgb.b + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Derive the divider color from the border color (lightened version).
 */
export function deriveDividerColor(border: string): string {
  return lighten(border, 20);
}

/**
 * Derive a light primary variant (used for hover states, backgrounds).
 */
export function derivePrimaryLight(primary: string): string {
  return lighten(primary, 200);
}
