import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import {
  buildHomeProfile,
  collectVisibleEntities,
  getDashboardFilters,
  resolveEntityAreaId,
} from './dashboard-model';

const hass: Hass = {
  states: {
    'light.kitchen': {
      entity_id: 'light.kitchen',
      state: 'on',
      attributes: { friendly_name: '<Kitchen Light>' },
      last_changed: '',
      last_updated: '',
    },
    'sensor.kitchen_power': {
      entity_id: 'sensor.kitchen_power',
      state: '42',
      attributes: { device_class: 'power', unit_of_measurement: 'W' },
      last_changed: '',
      last_updated: '',
    },
    'switch.hidden': {
      entity_id: 'switch.hidden',
      state: 'off',
      attributes: {},
      last_changed: '',
      last_updated: '',
    },
    'sensor.no_area': {
      entity_id: 'sensor.no_area',
      state: '1',
      attributes: {},
      last_changed: '',
      last_updated: '',
    },
  },
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen', picture: null },
    closet: { area_id: 'closet', name: 'Closet', picture: null },
  },
  devices: {
    dev_light: { id: 'dev_light', area_id: 'kitchen', name: 'Device' },
    dev_hidden: { id: 'dev_hidden', area_id: 'closet', name: 'Hidden' },
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
    'sensor.kitchen_power': {
      entity_id: 'sensor.kitchen_power',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'switch.hidden': {
      entity_id: 'switch.hidden',
      device_id: 'dev_hidden',
      area_id: null,
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
  },
};

describe('dashboard model', () => {
  it('resolves area through entity registry and device fallback', () => {
    expect(resolveEntityAreaId(hass, 'sensor.kitchen_power')).toBe('kitchen');
    expect(resolveEntityAreaId(hass, 'light.kitchen')).toBe('kitchen');
  });

  it('applies hidden areas and hidden domains consistently', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hidden_areas: ['closet'],
      hidden_domains: ['sensor'],
    };
    const entities = collectVisibleEntities(hass, getDashboardFilters(config));
    expect(entities.map(entity => entity.entity_id)).toEqual(['light.kitchen']);
  });

  it('applies hide unavailable consistently', () => {
    const hassWithUnavailable: Hass = {
      ...hass,
      states: {
        ...hass.states,
        'light.offline': {
          entity_id: 'light.offline',
          state: 'unavailable',
          attributes: {},
          last_changed: '',
          last_updated: '',
        },
      },
      entities: {
        ...hass.entities,
        'light.offline': {
          entity_id: 'light.offline',
          device_id: null,
          area_id: 'kitchen',
          platform: 'demo',
          disabled_by: null,
          hidden_by: null,
        },
      },
    };
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hide_unavailable: true },
      } as any,
    };
    const entities = collectVisibleEntities(hassWithUnavailable, getDashboardFilters(config));
    expect(entities.map(entity => entity.entity_id)).not.toContain('light.offline');
  });

  it('applies hidden device types consistently', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        devices: { hidden_device_types: ['sensor.power'] },
      } as any,
    };
    const entities = collectVisibleEntities(hass, getDashboardFilters(config));
    expect(entities.map(entity => entity.entity_id)).not.toContain('sensor.kitchen_power');
    expect(entities.map(entity => entity.entity_id)).toContain('light.kitchen');
  });

  it('builds a home profile from visible entities', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const profile = buildHomeProfile(hass, config);
    expect(profile.area_count).toBe(2);
    expect(profile.entity_count).toBe(3);
    expect(profile.dominant_semantics).toContain('lighting');
  });
});
