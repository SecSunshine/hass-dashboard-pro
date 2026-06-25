/**
 * Design Token System — html-pro-card compliant (v2.0)
 *
 * 设计哲学: Apple HIG · Dieter Rams 极简主义
 * 规约参照: html-card-pro 设计规范
 *
 * Usage: 在 html-pro-card 模板中注入为 <style> 内部样式块
 */

// ─── Color System ─────────────────────────────────────────────────────────

export const COLORS = {
  // Surface
  page_bg: '#F4F6FA',
  card_bg: '#FFFFFF',
  sidebar_bg: '#FFFFFF',

  // Primary
  primary: '#4F6EF7',
  primary_light: '#EEF1FE',
  primary_50: '#EEF1FE',
  primary_100: '#DDE3FD',
  primary_500: '#6B85F9',
  primary_700: '#3D5CE5',
  primary_900: '#2A43B8',

  // Accent
  accent_violet: '#7C6EF7',

  // Text
  text_primary: '#1A1D26',
  text_secondary: '#6B7280',
  text_muted: '#9CA3AF',
  text_inverse: '#FFFFFF',

  // Semantic
  success: '#22C55E',
  success_light: '#DCFCE7',
  warning: '#F59E0B',
  warning_light: '#FEF3C7',
  danger: '#EF4444',
  danger_light: '#FEE2E2',
  info: '#3B82F6',
  info_light: '#DBEAFE',
  purple: '#7C6EF7',
  purple_light: '#EDE9FE',

  // Border
  border: 'rgba(0, 0, 0, 0.06)',
  border_light: 'rgba(0, 0, 0, 0.03)',
  divider: 'rgba(0, 0, 0, 0.04)',
};

// ─── Gradient System ──────────────────────────────────────────────────────

export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #4F6EF7 0%, #38BDF8 100%)',
  warm: 'linear-gradient(135deg, #F59E0B 0%, #FB923C 100%)',
  cool: 'linear-gradient(135deg, #06B6D4 0%, #4F6EF7 100%)',
  green: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
};

// ─── Spacing System (8px base) ────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ─── Typography ───────────────────────────────────────────────────────────

export const TYPOGRAPHY = {
  font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  font_sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  },
  font_weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

// ─── Shape ────────────────────────────────────────────────────────────────

export const SHAPE = {
  radius_sm: 8,
  radius_md: 10,
  radius: 14, // 默认圆角 (html-pro-card 规约)
  radius_lg: 20,
  radius_xl: 24,
  radius_pill: 9999,
};

// ─── Shadows ──────────────────────────────────────────────────────────────

export const SHADOWS = {
  card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)',
  elevated: '0 4px 24px rgba(0, 0, 0, 0.08)',
  nav: '0 -1px 0 rgba(0, 0, 0, 0.06)',
};

// ─── Animation ────────────────────────────────────────────────────────────

export const MOTION = {
  duration_fast: '150ms',
  duration_base: '250ms',
  duration_slow: '400ms',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

// ─── Layout ───────────────────────────────────────────────────────────────

export const LAYOUT = {
  sidebar_width: 72,
  card_padding: 18,
  touch_target: 48,
  gap_grid: 14,
  gap_section: 20,
  max_content_width: 960,
  bottom_nav_height: 72,
};

// ─── html-pro-card CSS Variable Injection ─────────────────────────────────

import type { ResolvedTokens } from '../utils/visual-config';

export function generateDesignTokenCSS(tokens?: ResolvedTokens): string {
  const t = tokens;
  return /* css */ `
<style>
  :root {
    /* Colors */
    --hdp-bg: ${t?.page_bg || COLORS.page_bg};
    --hdp-card-bg: ${t?.card_bg || COLORS.card_bg};
    --hdp-sidebar-bg: ${t?.sidebar_bg || COLORS.sidebar_bg};
    --hdp-primary: ${t?.primary || COLORS.primary};
    --hdp-primary-light: ${t?.primary_light || COLORS.primary_light};
    --hdp-primary-glow: ${t?.primary ? `rgba(${hexToRgbStr(t.primary)}, 0.15)` : 'rgba(79, 110, 247, 0.15)'};
    --hdp-accent-violet: ${t?.accent_violet || COLORS.accent_violet};
    --hdp-text: ${t?.text_primary || COLORS.text_primary};
    --hdp-text-secondary: ${t?.text_secondary || COLORS.text_secondary};
    --hdp-text-muted: ${t?.text_muted || COLORS.text_muted};
    --hdp-text-inverse: ${COLORS.text_inverse};
    --hdp-success: ${t?.success || COLORS.success};
    --hdp-success-light: ${t?.success_light || COLORS.success_light};
    --hdp-warning: ${t?.warning || COLORS.warning};
    --hdp-warning-light: ${t?.warning_light || COLORS.warning_light};
    --hdp-danger: ${t?.danger || COLORS.danger};
    --hdp-danger-light: ${t?.danger_light || COLORS.danger_light};
    --hdp-info: ${COLORS.info};
    --hdp-border: ${t?.border || COLORS.border};
    --hdp-divider: ${t?.divider || COLORS.divider};

    /* Gradient */
    --hdp-gradient-primary: ${t?.gradient_primary || GRADIENTS.primary};
    --hdp-gradient-green: ${GRADIENTS.green};

    /* Spacing */
    --hdp-spacing-xs: ${SPACING.xs}px;
    --hdp-spacing-sm: ${SPACING.sm}px;
    --hdp-spacing-md: ${SPACING.md}px;
    --hdp-spacing-lg: ${t?.card_padding != null ? t.card_padding : SPACING.lg}px;
    --hdp-spacing-xl: ${SPACING.xl}px;
    --hdp-spacing-xxl: ${SPACING.xxl}px;
    --hdp-card-gap: ${t?.card_gap != null ? t.card_gap : LAYOUT.gap_grid}px;

    /* Typography */
    --hdp-font: ${t?.font_family || TYPOGRAPHY.font_family};

    /* Shape */
    --hdp-radius-sm: ${t?.border_radius != null ? Math.max(4, t.border_radius - 6) : SHAPE.radius_sm}px;
    --hdp-radius: ${t?.border_radius != null ? t.border_radius : SHAPE.radius}px;
    --hdp-radius-lg: ${t?.border_radius_lg != null ? t.border_radius_lg : SHAPE.radius_lg}px;
    --hdp-radius-pill: ${t?.border_radius_pill != null ? t.border_radius_pill : SHAPE.radius_pill}px;

    /* Shadow */
    --hdp-shadow-card: ${t?.shadow_card || SHADOWS.card};
    --hdp-shadow-elevated: ${t?.shadow_elevated || SHADOWS.elevated};
    --hdp-shadow-nav: ${t?.shadow_nav || SHADOWS.nav};

    /* Motion */
    --hdp-transition: all ${t?.motion_base || MOTION.duration_base} ${t?.motion_easing || MOTION.easing};
    --hdp-motion-fast: ${MOTION.duration_fast};
    --hdp-motion-base: ${t?.motion_base || MOTION.duration_base};
    --hdp-motion-easing: ${t?.motion_easing || MOTION.easing};

    /* Layout */
    --hdp-sidebar-width: ${t?.sidebar_width != null ? t.sidebar_width : LAYOUT.sidebar_width}px;
    --hdp-card-padding: ${t?.card_padding != null ? t.card_padding : LAYOUT.card_padding}px;
    --hdp-touch-target: ${t?.touch_target != null ? t.touch_target : LAYOUT.touch_target}px;
  }
</style>`;
}

// ─── Color Utilities ──────────────────────────────────────────────────────

function hexToRgbStr(hex: string): string {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) return '79, 110, 247';
  const v = parseInt(match[1], 16);
  return `${(v >> 16) & 0xff}, ${(v >> 8) & 0xff}, ${v & 0xff}`;
}
