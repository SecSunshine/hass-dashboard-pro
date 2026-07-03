import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StrategyConfig } from '../types';
import { resolveTokens } from './visual-config';

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
});
