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

  it('uses a pending local hdp_config as an effective strategy override', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => key === 'hdp_config_pending_sync'
        ? 'true'
        : key === 'hdp_config'
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

  it('keeps the strategy config authoritative over a normal local cache', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => key === 'hdp_config'
        ? JSON.stringify({
          areas: { hidden_areas: ['kitchen'] },
          permissions: { restrict_non_admin: false, restrict_settings: false },
        })
        : null,
    });

    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hidden_areas: ['closet'] },
        permissions: { restrict_non_admin: true, restrict_settings: false },
      } as any,
    };

    const effective = getEffectiveStrategyConfig(config);
    expect(effective.hdp_config?.areas?.hidden_areas).toEqual(['closet']);
    expect(effective.hdp_config?.permissions?.restrict_non_admin).toBe(true);
  });

  it('keeps locally saved dashboard imagery after a successful sync', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => key === 'hdp_config'
        ? JSON.stringify({ dashboard: { avatar_url: '/local/me.png', background_image_url: '/local/home.jpg' } })
        : null,
    });
    const effective = getEffectiveStrategyConfig({
      type: 'custom:hass-dashboard-pro',
      hdp_config: { dashboard: { name: 'Home', avatar_url: '', background_image_url: '' } } as any,
    });

    expect(effective.hdp_config?.dashboard?.avatar_url).toBe('/local/me.png');
    expect(effective.hdp_config?.dashboard?.background_image_url).toBe('/local/home.jpg');
    expect(effective.hdp_config?.dashboard?.name).toBe('Home');
  });

  it('does not let a pending local config override server permissions', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => key === 'hdp_config_pending_sync'
        ? 'true'
        : key === 'hdp_config'
        ? JSON.stringify({ permissions: { restrict_non_admin: false, restrict_settings: false } })
        : null,
    });

    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        permissions: { restrict_non_admin: true, restrict_settings: true },
      } as any,
    };

    expect(getEffectiveStrategyConfig(config).hdp_config?.permissions).toEqual({
      restrict_non_admin: true,
      restrict_settings: true,
    });
  });
});
