import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import {
  buildHomeProfile,
  collectVisibleEntities,
  getConfiguredAreaOrder,
  getConfiguredHiddenAreas,
  getConfiguredHiddenDeviceTypes,
  getConfiguredHiddenDomains,
  getConfiguredHiddenPersons,
  getDashboardFilters,
  resolveEntityAreaId,
  UNASSIGNED_AREA_ID,
  UNASSIGNED_AREA_NAME,
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
    'light.registry_hidden': {
      entity_id: 'light.registry_hidden',
      state: 'on',
      attributes: {},
      last_changed: '',
      last_updated: '',
    },
    'switch.registry_disabled': {
      entity_id: 'switch.registry_disabled',
      state: 'on',
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
    'light.registry_hidden': {
      entity_id: 'light.registry_hidden',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: 'user',
    },
    'switch.registry_disabled': {
      entity_id: 'switch.registry_disabled',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: 'user',
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

  it('lets nested HDP hidden settings override legacy top-level filters', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hidden_areas: ['closet'],
      hidden_domains: ['sensor'],
      hidden_device_types: ['binary_sensor.motion'],
      hidden_persons: ['person.alice'],
      hdp_config: {
        areas: { hidden_areas: [] },
        devices: { hidden_domains: ['switch'], hidden_device_types: [] },
        people: { hidden_persons: [] },
      } as any,
    };

    expect(getConfiguredHiddenAreas(config)).toEqual([]);
    expect(getConfiguredHiddenDomains(config)).toEqual(['switch']);
    expect(getConfiguredHiddenDeviceTypes(config)).toEqual([]);
    expect(getConfiguredHiddenPersons(config)).toEqual([]);
  });
  it('reads configured area order from persisted HDP config', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { area_order: ['bedroom', 'kitchen', 'bedroom', ''] },
      } as any,
    };

    expect(getConfiguredAreaOrder(config)).toEqual(['bedroom', 'kitchen']);
  });

  it('accepts legacy hidden filters stored inside hdp_config root', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        hidden_areas: ['closet'],
        hidden_domains: ['sensor'],
        hidden_device_types: ['switch'],
        hidden_persons: ['person.alice'],
      } as any,
    };

    expect(getConfiguredHiddenAreas(config)).toEqual(['closet']);
    expect(getConfiguredHiddenDomains(config)).toEqual(['sensor']);
    expect(getConfiguredHiddenDeviceTypes(config)).toEqual(['switch']);
    expect(getConfiguredHiddenPersons(config)).toEqual(['person.alice']);

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

  it('keeps entities without an area in a virtual unassigned area', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const entities = collectVisibleEntities(hass, getDashboardFilters(config));
    const entity = entities.find(item => item.entity_id === 'sensor.no_area');

    expect(entity?.area_id).toBe(UNASSIGNED_AREA_ID);
    expect(entity?.area_name).toBe(UNASSIGNED_AREA_NAME);
  });

  it('skips entities hidden or disabled in the HA registry', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const entities = collectVisibleEntities(hass, getDashboardFilters(config));
    const ids = entities.map(entity => entity.entity_id);

    expect(ids).not.toContain('light.registry_hidden');
    expect(ids).not.toContain('switch.registry_disabled');
  });

  it('builds a home profile from visible entities', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const profile = buildHomeProfile(hass, config);
    expect(profile.area_count).toBe(3);
    expect(profile.entity_count).toBe(4);
    expect(profile.device_count).toBe(2);
    expect(profile.dominant_semantics).toContain('lighting');
  });

  it('counts only devices with visible entities in the home profile', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hidden_areas: ['closet'] },
      } as any,
    };

    expect(buildHomeProfile(hass, config).device_count).toBe(1);
  });
});
