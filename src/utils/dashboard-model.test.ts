import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import {
  buildAreaSummaries,
  buildHomeProfile,
  collectVisibleEntities,
  getConfiguredAreaOrder,
  getConfiguredHiddenAreas,
  getConfiguredHiddenDeviceTypes,
  getConfiguredHiddenDomains,
  getConfiguredHiddenKeywords,
  getConfiguredHiddenPersons,
  getConfiguredVisibleKeywords,
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

  it('normalizes area summary temperatures to Celsius', () => {
    const tempHass: Hass = {
      ...hass,
      states: {
        ...hass.states,
        'sensor.kitchen_temperature': {
          entity_id: 'sensor.kitchen_temperature',
          state: '72',
          attributes: { device_class: 'temperature', unit_of_measurement: '°F' },
          last_changed: '',
          last_updated: '',
        },
        'sensor.closet_temperature': {
          entity_id: 'sensor.closet_temperature',
          state: '86',
          attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
          last_changed: '',
          last_updated: '',
        },
      },
    };
    const areaMap = new Map([
      ['kitchen', [{
        entity_id: 'sensor.kitchen_temperature',
        name: 'Kitchen Temperature',
        domain: 'sensor',
        icon: null,
        state: '72',
        unit: '°F',
        area_name: 'Kitchen',
      }]],
      ['closet', [{
        entity_id: 'sensor.closet_temperature',
        name: 'Closet Temperature',
        domain: 'sensor',
        icon: null,
        state: '86',
        unit: '°C',
        area_name: 'Closet',
      }]],
    ]);

    const summaries = buildAreaSummaries(tempHass, areaMap, []);

    expect(summaries.find(area => area.area_id === 'kitchen')?.temp).toBe('22.2°C');
    expect(summaries.find(area => area.area_id === 'closet')?.temp).toBe('30°C');
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
        hidden_keywords: ['legacy-old'],
        visible_keywords: ['legacy-visible'],
        devices: { hidden_domains: ['switch'], hidden_device_types: [], hidden_keywords: [], visible_keywords: [] },
        people: { hidden_persons: [] },
      } as any,
    };

    expect(getConfiguredHiddenAreas(config)).toEqual([]);
    expect(getConfiguredHiddenDomains(config)).toEqual(['switch']);
    expect(getConfiguredHiddenDeviceTypes(config)).toEqual([]);
    expect(getConfiguredHiddenKeywords(config)).toEqual([]);
    expect(getConfiguredVisibleKeywords(config)).toEqual([]);
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

  it('accepts legacy keyword filters stored inside hdp_config root', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        hidden_keywords: ['Kitchen'],
        visible_keywords: ['Light'],
      } as any,
    };

    expect(getConfiguredHiddenKeywords(config)).toEqual(['kitchen']);
    expect(getConfiguredVisibleKeywords(config)).toEqual(['light']);
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

  it('applies hidden and visible device keywords consistently', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        devices: {
          visible_keywords: ['kitchen'],
          hidden_keywords: ['power'],
        },
      } as any,
    };
    const entities = collectVisibleEntities(hass, getDashboardFilters(config));
    const ids = entities.map(entity => entity.entity_id);

    expect(ids).toContain('light.kitchen');
    expect(ids).not.toContain('sensor.kitchen_power');
    expect(ids).not.toContain('sensor.no_area');
  });

  it('matches keyword filters against user-renamed entity registry names', () => {
    const renamedHass: Hass = {
      ...hass,
      states: {
        ...hass.states,
        'light.bedside': {
          entity_id: 'light.bedside',
          state: 'on',
          attributes: { friendly_name: 'Lamp' },
          last_changed: '',
          last_updated: '',
        },
      },
      entities: {
        ...hass.entities,
        'light.bedside': {
          entity_id: 'light.bedside',
          device_id: null,
          area_id: 'kitchen',
          platform: 'demo',
          disabled_by: null,
          hidden_by: null,
          name_by_user: 'Reading Corner',
          original_name: 'Bedside Light',
        },
      },
    };

    const visibleConfig: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        devices: { visible_keywords: ['reading corner'] },
      } as any,
    };
    const originalNameConfig: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        devices: { visible_keywords: ['bedside light'] },
      } as any,
    };
    const hiddenConfig: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        devices: { hidden_keywords: ['reading corner'] },
      } as any,
    };

    expect(collectVisibleEntities(renamedHass, getDashboardFilters(visibleConfig)).map(entity => entity.entity_id))
      .toEqual(['light.bedside']);
    expect(collectVisibleEntities(renamedHass, getDashboardFilters(originalNameConfig)).map(entity => entity.entity_id))
      .toEqual(['light.bedside']);
    expect(collectVisibleEntities(renamedHass, getDashboardFilters(hiddenConfig)).map(entity => entity.entity_id))
      .not.toContain('light.bedside');
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
