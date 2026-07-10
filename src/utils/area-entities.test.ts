import { describe, expect, it } from 'vitest';
import type { Hass } from '../types';
import { buildAreaEntityMap, formatState } from './area-entities';

const hass: Hass = {
  states: {
    'light.registry_area': {
      entity_id: 'light.registry_area',
      state: 'on',
      attributes: { friendly_name: 'Registry Area Light' },
      last_changed: '',
      last_updated: '',
    },
    'switch.device_area': {
      entity_id: 'switch.device_area',
      state: 'off',
      attributes: { friendly_name: 'Device Area Switch' },
      last_changed: '',
      last_updated: '',
    },
    'sensor.attribute_area': {
      entity_id: 'sensor.attribute_area',
      state: '21',
      attributes: { area_id: 'bedroom', device_class: 'temperature' },
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
    'sensor.unavailable': {
      entity_id: 'sensor.unavailable',
      state: 'unavailable',
      attributes: { area_id: 'bedroom' },
      last_changed: '',
      last_updated: '',
    },
  },
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen', picture: null },
    bedroom: { area_id: 'bedroom', name: 'Bedroom', picture: null },
  },
  devices: {
    dev_switch: { id: 'dev_switch', area_id: 'bedroom', name: 'Switch Device' },
  },
  floors: {},
  entities: {
    'light.registry_area': {
      entity_id: 'light.registry_area',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'switch.device_area': {
      entity_id: 'switch.device_area',
      device_id: 'dev_switch',
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

function mapIds(map: Map<string, { entity_id: string }[]>): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [areaId, entities] of map.entries()) {
    result[areaId] = entities.map(entity => entity.entity_id);
  }
  return result;
}

describe('area entity map', () => {
  it('resolves areas consistently and skips registry hidden or disabled entities', () => {
    const ids = mapIds(buildAreaEntityMap(hass));

    expect(ids.kitchen).toEqual(['light.registry_area']);
    expect(ids.bedroom).toEqual(['switch.device_area', 'sensor.attribute_area', 'sensor.unavailable']);
  });

  it('applies legacy hidden filters', () => {
    const ids = mapIds(buildAreaEntityMap(hass, ['kitchen'], ['switch'], true, ['sensor.temperature']));

    expect(ids).toEqual({});
  });

  it('normalizes mislabeled Fahrenheit temperature state displays to Celsius', () => {
    expect(formatState({
      entity_id: 'sensor.bedroom_temperature',
      name: 'Bedroom Temperature',
      domain: 'sensor',
      icon: null,
      state: '72',
      unit: '°C',
      device_class: 'temperature',
      area_name: 'Bedroom',
    })).toBe('22.2°C');
  });
});
