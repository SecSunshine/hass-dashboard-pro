import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { resolveTokens } from './visual-config';

const hass: Hass = {
  states: {
    'light.kitchen': {
      entity_id: 'light.kitchen',
      state: 'on',
      attributes: {},
      last_changed: '',
      last_updated: '',
    },
  },
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen', picture: null },
  },
  devices: {
    dev_light: { id: 'dev_light', area_id: 'kitchen', name: 'Light' },
  },
  floors: {},
  entities: {
    'light.kitchen': {
      entity_id: 'light.kitchen',
      device_id: 'dev_light',
      area_id: null,
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
  },
};

describe('visual config', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses persisted hdp_config visual tokens as a fallback', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        visual: {
          colors: {
            page_bg: '#101010',
            card_bg: '#202020',
            primary: '#3366ff',
            text_primary: '#f8fafc',
            text_secondary: '#cbd5e1',
            border: '#334155',
          },
          card_style: 'glass',
          border_radius: 18,
          card_padding: 20,
          card_gap: 16,
          layout_density: 'compact',
        },
      } as any,
    };

    const tokens = resolveTokens(config);

    expect(tokens.primary).toBe('#3366ff');
    expect(tokens.page_bg).toBe('#101010');
    expect(tokens.card_style).toBe('glass');
    expect(tokens.card_gap).toBe(16);
    expect(tokens.layout_density).toBe('compact');
  });

  it('lets local visual settings override persisted visual tokens', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => key === 'hdp_visual_config'
        ? JSON.stringify({ primary: '#ff3366', card_gap: 22 })
        : null,
    });
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        visual: {
          colors: { primary: '#3366ff' },
          card_gap: 16,
        },
      } as any,
    };

    const tokens = resolveTokens(config);

    expect(tokens.primary).toBe('#ff3366');
    expect(tokens.card_gap).toBe(22);
  });

  it('applies stored theme presets to resolved tokens', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => key === 'hdp_visual_config'
        ? JSON.stringify({ theme: 'dark' })
        : null,
    });
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      visual: { theme: 'light' },
    };

    const tokens = resolveTokens(config);

    expect(tokens.page_bg).toBe('#0C0E14');
    expect(tokens.card_bg).toBe('#161922');
    expect(tokens.primary).toBe('#6B85F9');
  });

  it('ignores default persisted visual placeholders', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        visual: {
          theme_id: 'light',
          card_style: 'classic',
          colors: {},
          border_radius: 10,
          card_padding: 16,
          card_gap: 12,
          font_family: '',
          shadows: true,
        },
      } as any,
    };

    expect(resolveTokens(config)).toEqual({});
    expect(resolveTokens(config, hass).mood_preset).toBe('warm-home');
  });
});
