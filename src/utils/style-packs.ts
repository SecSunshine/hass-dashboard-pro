import type { Hass, StrategyConfig } from '../types';
import type { ResolvedTokens } from './visual-config';
import { buildHomeProfile, type HomeProfile } from './dashboard-model';

export interface StylePack {
  id: string;
  label: string;
  tokens: ResolvedTokens;
}

export const STYLE_PACKS: Record<string, StylePack> = {
  'minimal-light': {
    id: 'minimal-light',
    label: 'Minimal Light',
    tokens: {
      page_bg: '#F7F8FB',
      card_bg: '#FFFFFF',
      primary: '#4F6EF7',
      text_primary: '#1A1D26',
      text_secondary: '#667085',
      border: 'rgba(16, 24, 40, 0.08)',
      card_style: 'classic',
      border_radius: 12,
      card_padding: 16,
      card_gap: 12,
      layout_density: 'standard',
      shadows: true,
    },
  },
  'dark-glass': {
    id: 'dark-glass',
    label: 'Dark Glass',
    tokens: {
      page_bg: '#0C0E14',
      card_bg: '#161922',
      primary: '#6B85F9',
      text_primary: '#F1F3F8',
      text_secondary: '#A0A7B8',
      border: 'rgba(255, 255, 255, 0.08)',
      card_style: 'glass',
      border_radius: 16,
      card_padding: 16,
      card_gap: 12,
      layout_density: 'standard',
      shadows: true,
    },
  },
  'warm-home': {
    id: 'warm-home',
    label: 'Warm Home',
    tokens: {
      page_bg: '#FBF8F3',
      card_bg: '#FFFFFF',
      primary: '#C2702E',
      text_primary: '#2C1810',
      text_secondary: '#7A6150',
      border: 'rgba(139, 110, 90, 0.12)',
      card_style: 'soft',
      border_radius: 18,
      card_padding: 18,
      card_gap: 14,
      layout_density: 'spacious',
      shadows: true,
    },
  },
  'colorful-family': {
    id: 'colorful-family',
    label: 'Colorful Family',
    tokens: {
      page_bg: '#F4F7FF',
      card_bg: '#FFFFFF',
      primary: '#2563EB',
      accent: '#E11D48',
      text_primary: '#172033',
      text_secondary: '#64748B',
      border: 'rgba(37, 99, 235, 0.10)',
      card_style: 'gradient',
      border_radius: 16,
      card_padding: 16,
      card_gap: 14,
      layout_density: 'standard',
      shadows: true,
    },
  },
};

export function selectDefaultStylePack(hass: Hass, config: StrategyConfig): { pack: StylePack; profile: HomeProfile } {
  const profile = buildHomeProfile(hass, config);

  if (hass.themes?.darkMode) {
    return { pack: STYLE_PACKS['dark-glass'], profile };
  }

  if (profile.dominant_semantics.includes('presence') || profile.dominant_semantics.includes('media')) {
    return { pack: STYLE_PACKS['colorful-family'], profile };
  }

  if (profile.entity_count < 30) {
    return { pack: STYLE_PACKS['warm-home'], profile };
  }

  return { pack: STYLE_PACKS['minimal-light'], profile };
}

export function applyDefaultStylePack(base: ResolvedTokens, hass: Hass, config: StrategyConfig): ResolvedTokens {
  const hasExplicitVisual = Boolean(config.visual?.theme || config.visual?.colors || config.visual?.card_style);
  const hasStoredVisual = Boolean(
    base.seed_color
    || base.mood_preset
    || base.primary
    || base.page_bg
    || base.card_bg
    || base.card_style,
  );

  if (hasExplicitVisual || hasStoredVisual) {
    return base;
  }

  const { pack, profile } = selectDefaultStylePack(hass, config);
  return {
    ...pack.tokens,
    layout_density: pack.tokens.layout_density || profile.density,
    mood_preset: pack.id,
    ...base,
  };
}

