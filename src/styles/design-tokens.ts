/**
 * Design Token System — html-pro-card compliant
 *
 * 设计哲学: Apple HIG · Dieter Rams 极简主义
 * 规约参照: html-card-pro 设计规范
 *
 * Usage: 在 html-pro-card 模板中注入为 <style> 内部样式块
 */

// ─── Color System ─────────────────────────────────────────────────────────

export const COLORS = {
  // Surface
  page_bg: '#F8FAFC',
  card_bg: '#FFFFFF',
  sidebar_bg: '#FFFFFF',

  // Primary
  primary: '#1E40AF',
  primary_light: '#EFF6FF',
  primary_50: '#EFF6FF',
  primary_100: '#DBEAFE',
  primary_500: '#3B82F6',
  primary_700: '#1D4ED8',
  primary_900: '#1E3A8A',

  // Text
  text_primary: '#1E293B',
  text_secondary: '#64748B',
  text_muted: '#94A3B8',
  text_inverse: '#FFFFFF',

  // Semantic
  success: '#16A34A',
  success_light: '#DCFCE7',
  warning: '#D97706',
  warning_light: '#FEF3C7',
  danger: '#DC2626',
  danger_light: '#FEE2E2',
  info: '#3B82F6',
  info_light: '#DBEAFE',
  purple: '#8B5CF6',
  purple_light: '#EDE9FE',

  // Border
  border: '#DBEAFE',
  border_light: '#E9EEF6',
  divider: '#E9EEF6',
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
  radius_sm: 6,
  radius_md: 8,
  radius: 10, // 强制: html-pro-card 规约
  radius_lg: 16,
  radius_xl: 20,
  radius_pill: 9999,
};

// ─── Shadows ──────────────────────────────────────────────────────────────

export const SHADOWS = {
  card: '0 2px 8px rgba(0, 0, 0, 0.06)',
  elevated: '0 4px 12px rgba(0, 0, 0, 0.08)',
  nav: '0 -4px 12px rgba(0, 0, 0, 0.1)',
};

// ─── Animation ────────────────────────────────────────────────────────────

export const MOTION = {
  duration_fast: '150ms',
  duration_base: '200ms',
  duration_slow: '300ms',
  easing: 'ease',
};

// ─── Layout ───────────────────────────────────────────────────────────────

export const LAYOUT = {
  sidebar_width: 250,
  card_padding: 16, // 强制: HA 原生
  touch_target: 44,
  gap_grid: 16,
  gap_section: 20,
  max_content_width: 1200,
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
    --hdp-text: ${t?.text_primary || COLORS.text_primary};
    --hdp-text-secondary: ${t?.text_secondary || COLORS.text_secondary};
    --hdp-text-muted: ${t?.text_muted || COLORS.text_muted};
    --hdp-text-inverse: ${COLORS.text_inverse};
    --hdp-success: ${t?.success || COLORS.success};
    --hdp-warning: ${t?.warning || COLORS.warning};
    --hdp-danger: ${t?.danger || COLORS.danger};
    --hdp-info: ${COLORS.info};
    --hdp-border: ${t?.border || COLORS.border};
    --hdp-divider: ${t?.divider || COLORS.divider};

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
    --hdp-radius: ${t?.border_radius != null ? t.border_radius : SHAPE.radius}px;
    --hdp-radius-lg: ${t?.border_radius_lg != null ? t.border_radius_lg : SHAPE.radius_lg}px;
    --hdp-radius-pill: ${t?.border_radius_pill != null ? t.border_radius_pill : SHAPE.radius_pill}px;

    /* Shadow */
    --hdp-shadow-card: ${t?.shadow_card || SHADOWS.card};
    --hdp-shadow-nav: ${t?.shadow_nav || SHADOWS.nav};

    /* Motion */
    --hdp-transition: all ${t?.motion_base || MOTION.duration_base} ${t?.motion_easing || MOTION.easing};
    --hdp-motion-base: ${t?.motion_base || MOTION.duration_base};
    --hdp-motion-easing: ${t?.motion_easing || MOTION.easing};

    /* Layout */
    --hdp-sidebar-width: ${t?.sidebar_width != null ? t.sidebar_width : LAYOUT.sidebar_width}px;
    --hdp-card-padding: ${t?.card_padding != null ? t.card_padding : LAYOUT.card_padding}px;
    --hdp-touch-target: ${t?.touch_target != null ? t.touch_target : LAYOUT.touch_target}px;
  }
</style>`;
}
