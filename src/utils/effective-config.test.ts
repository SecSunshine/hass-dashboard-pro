import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StrategyConfig } from '../types';
import { deepMerge, getEffectiveStrategyConfig } from './effective-config';

describe('effective config', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deep merges nested config objects without flattening sections', () => {
    expect(deepMerge(
      { dashboard: { name: 'Home' }, areas: { hidden_areas: ['closet'] } },
      { devices: { hidden_domains: ['sensor'] } },
    )).toEqual({
      dashboard: { name: 'Home' },
      areas: { hidden_areas: ['closet'] },
      devices: { hidden_domains: ['sensor'] },
    });
  });

  it('uses local hdp_config as an effective strategy override', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => key === 'hdp_config'
        ? JSON.stringify({
          areas: { hidden_areas: ['kitchen'] },
          devices: { hidden_domains: ['sensor'] },
        })
        : null,
    });

    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hidden_areas: ['closet'] },
      } as any,
    };

    const effective = getEffectiveStrategyConfig(config);
    expect(effective.hdp_config?.areas?.hidden_areas).toEqual(['kitchen']);
    expect(effective.hdp_config?.devices?.hidden_domains).toEqual(['sensor']);
  });
});
