import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { getAlarmStatus, getFavorites, getHomeSummaries } from './home-data';

const hass: Hass = {
  states: {
    'light.kitchen': {
      entity_id: 'light.kitchen',
      state: 'on',
      attributes: { friendly_name: 'Kitchen Light' },
      last_changed: '',
      last_updated: '',
    },
    'sensor.kitchen_power': {
      entity_id: 'sensor.kitchen_power',
      state: '42',
      attributes: { friendly_name: 'Kitchen Power', device_class: 'power', unit_of_measurement: 'W' },
      last_changed: '',
      last_updated: '',
    },
    'switch.closet': {
      entity_id: 'switch.closet',
      state: 'off',
      attributes: { friendly_name: 'Closet Switch' },
      last_changed: '',
      last_updated: '',
    },
    'light.offline': {
      entity_id: 'light.offline',
      state: 'unavailable',
      attributes: { friendly_name: 'Offline Light' },
      last_changed: '',
      last_updated: '',
    },
    'lock.front_door': {
      entity_id: 'lock.front_door',
      state: 'locked',
      attributes: { friendly_name: 'Front Door' },
      last_changed: '',
      last_updated: '',
    },
    'lock.closet': {
      entity_id: 'lock.closet',
      state: 'unlocked',
      attributes: { friendly_name: 'Closet Lock' },
      last_changed: '',
      last_updated: '',
    },
  },
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen', picture: null },
    closet: { area_id: 'closet', name: 'Closet', picture: null },
  },
  devices: {
    dev_kitchen: { id: 'dev_kitchen', area_id: 'kitchen', name: 'Kitchen Device' },
    dev_closet: { id: 'dev_closet', area_id: 'closet', name: 'Closet Device' },
  },
  floors: {},
  entities: {
    'light.kitchen': {
      entity_id: 'light.kitchen',
      device_id: 'dev_kitchen',
      area_id: 'kitchen',
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
    'switch.closet': {
      entity_id: 'switch.closet',
      device_id: 'dev_closet',
      area_id: 'closet',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'light.offline': {
      entity_id: 'light.offline',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'lock.front_door': {
      entity_id: 'lock.front_door',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'lock.closet': {
      entity_id: 'lock.closet',
      device_id: null,
      area_id: 'closet',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
  },
};

describe('home data', () => {
  it('filters favorites through the shared dashboard visibility model', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      favorite_entities: ['light.kitchen', 'sensor.kitchen_power', 'switch.closet', 'light.offline'],
      hdp_config: {
        areas: { hidden_areas: ['closet'], hide_unavailable: true },
        devices: { hidden_device_types: ['sensor.power'] },
      } as any,
    };

    const favorites = getFavorites(hass, config);

    expect(favorites.map(entity => entity.entity_id)).toEqual(['light.kitchen']);
  });

  it('counts only devices represented by visible entities in summaries', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hidden_areas: ['closet'], hide_unavailable: true },
        devices: { hidden_device_types: ['sensor.power'] },
      } as any,
    };

    expect(getHomeSummaries(hass, config).total_devices).toBe(1);
  });

  it('filters hidden area locks from alarm summaries', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hidden_areas: ['closet'] },
      } as any,
    };

    expect(getAlarmStatus(hass, undefined, config).display).toBe('1/1 已锁');
    expect(getAlarmStatus(hass, 'lock.closet', config).display).toBe('1/1 已锁');
  });
});
