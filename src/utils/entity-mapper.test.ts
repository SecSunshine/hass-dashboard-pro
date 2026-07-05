import { describe, expect, it } from 'vitest';
import type { Hass } from '../types';
import { applyEntityMapping, buildEntityMapping, extractEntityIds } from './entity-mapper';

const hass: Hass = {
  states: {
    'light.kitchen_ceiling': {
      entity_id: 'light.kitchen_ceiling',
      state: 'off',
      attributes: { friendly_name: 'Kitchen Ceiling' },
      last_changed: '',
      last_updated: '',
    },
    'sensor.living_temperature': {
      entity_id: 'sensor.living_temperature',
      state: '22',
      attributes: { friendly_name: 'Living Temperature' },
      last_changed: '',
      last_updated: '',
    },
    'light.hidden_kitchen_ceiling': {
      entity_id: 'light.hidden_kitchen_ceiling',
      state: 'off',
      attributes: { friendly_name: 'Old Kitchen Ceiling' },
      last_changed: '',
      last_updated: '',
    },
    'sensor.hidden_exact': {
      entity_id: 'sensor.hidden_exact',
      state: '1',
      attributes: { friendly_name: 'Hidden Exact' },
      last_changed: '',
      last_updated: '',
    },
  },
  areas: {},
  devices: {},
  floors: {},
  entities: {
    'light.kitchen_ceiling': {
      entity_id: 'light.kitchen_ceiling',
      device_id: null,
      area_id: null,
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'sensor.living_temperature': {
      entity_id: 'sensor.living_temperature',
      device_id: null,
      area_id: null,
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'light.hidden_kitchen_ceiling': {
      entity_id: 'light.hidden_kitchen_ceiling',
      device_id: null,
      area_id: null,
      platform: 'demo',
      disabled_by: null,
      hidden_by: 'user',
    },
    'sensor.hidden_exact': {
      entity_id: 'sensor.hidden_exact',
      device_id: null,
      area_id: null,
      platform: 'demo',
      disabled_by: 'user',
      hidden_by: null,
    },
  },
};

describe('entity mapper', () => {
  it('extracts entity ids from nested cards and html strings', () => {
    expect(extractEntityIds({
      entity: 'light.old_kitchen',
      content: '<div data-entity="sensor.old_temp"></div>',
    })).toEqual(['light.old_kitchen', 'sensor.old_temp']);
  });

  it('maps imported entities by domain and token similarity', () => {
    const result = buildEntityMapping(['light.old_kitchen_ceiling', 'sensor.living_temp'], hass);
    expect(result.mapping['light.old_kitchen_ceiling']).toBe('light.kitchen_ceiling');
    expect(result.mapping['sensor.living_temp']).toBe('sensor.living_temperature');
    expect(result.matches).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'light.old_kitchen_ceiling', target: 'light.kitchen_ceiling' }),
      expect.objectContaining({ source: 'sensor.living_temp', target: 'sensor.living_temperature' }),
    ]));
  });

  it('does not map imported entities to registry-hidden or disabled entities', () => {
    const result = buildEntityMapping(['light.old_kitchen_ceiling', 'sensor.hidden_exact'], hass);

    expect(result.mapping['light.old_kitchen_ceiling']).toBe('light.kitchen_ceiling');
    expect(result.mapping).not.toHaveProperty('sensor.hidden_exact');
    expect(result.unmapped).toContain('sensor.hidden_exact');
    expect(result.matches).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'light.hidden_kitchen_ceiling' }),
      expect.objectContaining({ target: 'sensor.hidden_exact' }),
    ]));
  });

  it('applies mappings deeply', () => {
    const mapped = applyEntityMapping(
      { entity: 'light.old_kitchen_ceiling', content: 'sensor.living_temp' },
      { 'light.old_kitchen_ceiling': 'light.kitchen_ceiling', 'sensor.living_temp': 'sensor.living_temperature' },
    );
    expect(mapped).toEqual({ entity: 'light.kitchen_ceiling', content: 'sensor.living_temperature' });
  });
});
