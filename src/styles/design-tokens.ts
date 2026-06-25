/**
 * Design Token System — HA Native Theme Integration (v2.1)
 *
 * Uses Home Assistant native theme CSS variables as primary values,
 * with sensible fallbacks for themes that don't define all tokens.
 *
 * html-card-pro conventions:
 *   - Hardcoded hex/RGB values are FORBIDDEN in card templates
 *   - Use native HA theme tokens: var(--primary-color), var(--primary-text-color), etc.
 *   - border-radius: 10px (html-pro-card spec)
 *   - All styles in <style> blocks, no inline styles
 *   - Min touch target: 44px × 44px
 *   - Animation: all 0.2s ease
 *   - Hover: translateY(-2px)
 *
 * Custom --hdp-* namespace maps to HA theme tokens with fallbacks,
 * ensuring cards look correct regardless of the active HA theme.
 */

import type { ResolvedTokens } from '../utils/visual-config';

// ─── Spacing & Layout Constants ───────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const SHAPE = {
  radius: 10,
  radius_sm: 6,
  radius_lg: 16,
  radius_pill: 999,
};

export const LAYOUT = {
  card_padding: 16,
  card_gap: 12,
  touch_target: 44,
};

// ─── Gradient System (custom, no HA equivalent) ──────────────────────────

export const GRADIENTS = {
  primary: 'linear-gradient(135deg, var(--hdp-primary) 0%, var(--hdp-info, #38BDF8) 100%)',
  warm: 'linear-gradient(135deg, var(--hdp-warning) 0%, #FB923C 100%)',
  cool: 'linear-gradient(135deg, #06B6D4 0%, var(--hdp-primary) 100%)',
  green: 'linear-gradient(135deg, var(--hdp-success) 0%, #16A34A 100%)',
};

// ─── CSS Injection for html-pro-card Templates ────────────────────────────

/**
 * Generates a <style> block that maps HA theme tokens to the --hdp-* namespace.
 * All card templates should call this function to inject consistent variables.
 *
 * When user overrides exist (from settings page localStorage), they take
 * precedence over HA theme tokens.
 */
export function generateDesignTokenCSS(tokens?: ResolvedTokens): string {
  // User overrides from settings (if any)
  const primaryOverride = tokens?.primary || '';
  const bgOverride = tokens?.page_bg || '';
  const cardBgOverride = tokens?.card_bg || '';
  const textOverride = tokens?.text_primary || '';
  const textSecOverride = tokens?.text_secondary || '';
  const borderOverride = tokens?.border || '';

  // Build CSS: HA theme tokens with hardcoded fallbacks
  return /* css */ `
<style>
  :host, :root {
    /* ── Primary Colors (HA theme → fallback) ── */
    --hdp-primary: ${primaryOverride || 'var(--primary-color, #4F6EF7)'};
    --hdp-primary-light: var(--light-primary-color, #EEF1FE);
    --hdp-accent: var(--accent-color, #7C6EF7);

    /* ── Surfaces ── */
    --hdp-bg: ${bgOverride || 'var(--lovelace-background, var(--primary-background-color, #F4F6FA))'};
    --hdp-card-bg: ${cardBgOverride || 'var(--ha-card-background, var(--card-background-color, #FFFFFF))'};

    /* ── Text ── */
    --hdp-text: ${textOverride || 'var(--primary-text-color, #1A1D26)'};
    --hdp-text-secondary: ${textSecOverride || 'var(--secondary-text-color, #6B7280)'};
    --hdp-text-muted: var(--disabled-text-color, #9CA3AF);
    --hdp-text-inverse: var(--text-primary-color, #FFFFFF);

    /* ── Borders & Dividers ── */
    --hdp-border: ${borderOverride || 'var(--divider-color, rgba(0,0,0,0.06))'};
    --hdp-divider: var(--divider-color, rgba(0,0,0,0.04));

    /* ── Semantic Colors ── */
    --hdp-success: var(--success-color, #22C55E);
    --hdp-success-light: rgba(34, 197, 94, 0.12);
    --hdp-warning: var(--warning-color, #F59E0B);
    --hdp-warning-light: rgba(245, 158, 11, 0.12);
    --hdp-danger: var(--error-color, #EF4444);
    --hdp-danger-light: rgba(239, 68, 68, 0.12);
    --hdp-info: var(--info-color, #3B82F6);
    --hdp-info-light: rgba(59, 130, 246, 0.12);

    /* ── Shadows ── */
    --hdp-shadow-card: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03));
    --hdp-shadow-elevated: 0 4px 24px rgba(0,0,0,0.08);

    /* ── Gradients (defined after semantic colors they reference) ── */
    --hdp-gradient-primary: linear-gradient(135deg, var(--hdp-primary) 0%, var(--hdp-info) 100%);
    --hdp-gradient-green: linear-gradient(135deg, var(--hdp-success) 0%, #16A34A 100%);

    /* ── Shape (html-pro-card spec: 10px) ── */
    --hdp-radius: ${tokens?.border_radius != null ? tokens.border_radius : SHAPE.radius}px;
    --hdp-radius-sm: ${SHAPE.radius_sm}px;
    --hdp-radius-lg: ${SHAPE.radius_lg}px;
    --hdp-radius-pill: ${SHAPE.radius_pill}px;

    /* ── Spacing ── */
    --hdp-card-padding: ${tokens?.card_padding != null ? tokens.card_padding : LAYOUT.card_padding}px;
    --hdp-card-gap: ${tokens?.card_gap != null ? tokens.card_gap : LAYOUT.card_gap}px;

    /* ── Typography ── */
    --hdp-font: ${tokens?.font_family || 'inherit'};

    /* ── Motion ── */
    --hdp-transition: all 0.2s ease;
    --hdp-motion-fast: 150ms;
    --hdp-motion-base: 250ms;
    --hdp-motion-easing: cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>`;
}
