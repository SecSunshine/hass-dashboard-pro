/**
 * Built-in Theme Definitions
 *
 * Four pre-configured themes that ship with the dashboard.
 * Users can also create custom JSON theme files in /local/hass-dashboard-pro/themes/.
 */

import type { ThemeDefinition } from '../../types';

const light: ThemeDefinition = {
  name: '明亮',
  version: '4.0',
  colors: {
    page_bg: '#F4F6FA',
    card_bg: '#FFFFFF',
    sidebar_bg: '#FFFFFF',
    primary: '#4F6EF7',
    text_primary: '#1A1D26',
    text_secondary: '#6B7280',
    text_muted: '#9CA3AF',
    border: 'rgba(0, 0, 0, 0.06)',
    accent: '#7C6EF7',
  },
  layout: {
    border_radius: 10,
    card_padding: 16,
    card_gap: 12,
    sidebar_width: 260,
  },
  font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  gradient_primary: 'linear-gradient(135deg, #4F6EF7 0%, #38BDF8 100%)',
};

const dark: ThemeDefinition = {
  name: '暗夜',
  version: '4.0',
  colors: {
    page_bg: '#0C0E14',
    card_bg: '#161922',
    sidebar_bg: '#10121A',
    primary: '#6B85F9',
    text_primary: '#F1F3F8',
    text_secondary: '#8B92A5',
    text_muted: '#565D72',
    border: 'rgba(255, 255, 255, 0.06)',
    accent: '#9DA5FF',
  },
  layout: {
    border_radius: 10,
    card_padding: 16,
    card_gap: 12,
    sidebar_width: 260,
  },
  font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  gradient_primary: 'linear-gradient(135deg, #6B85F9 0%, #60A5FA 100%)',
};

const warm: ThemeDefinition = {
  name: '暖木',
  version: '4.0',
  colors: {
    page_bg: '#FBF8F3',
    card_bg: '#FFFFFF',
    sidebar_bg: '#FFFFFF',
    primary: '#C2702E',
    text_primary: '#2C1810',
    text_secondary: '#8B6E5A',
    text_muted: '#B89B85',
    border: 'rgba(139, 110, 90, 0.1)',
    accent: '#B8860B',
  },
  layout: {
    border_radius: 12,
    card_padding: 16,
    card_gap: 12,
    sidebar_width: 260,
  },
  font_family: "Georgia, 'Noto Serif SC', serif",
  gradient_primary: 'linear-gradient(135deg, #C2702E 0%, #D97706 100%)',
};

const forest: ThemeDefinition = {
  name: '森林',
  version: '4.0',
  colors: {
    page_bg: '#F0F7F2',
    card_bg: '#FFFFFF',
    sidebar_bg: '#FFFFFF',
    primary: '#2D7A4F',
    text_primary: '#1A2E22',
    text_secondary: '#5A7D6A',
    text_muted: '#8BA89A',
    border: 'rgba(45, 122, 79, 0.1)',
    accent: '#3D9A65',
  },
  layout: {
    border_radius: 10,
    card_padding: 16,
    card_gap: 12,
    sidebar_width: 260,
  },
  font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  gradient_primary: 'linear-gradient(135deg, #2D7A4F 0%, #16A34A 100%)',
};

/**
 * All built-in themes, keyed by ID.
 */
export const BUILT_IN_THEMES: Record<string, ThemeDefinition> = {
  light,
  dark,
  warm,
  forest,
};
