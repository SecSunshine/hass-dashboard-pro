import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { UNASSIGNED_AREA_NAME } from './dashboard-model';
import { buildHousePowerUsage, getQuickPower } from './power-usage';

const hass: Hass = {
  states: {
    'sensor.kitchen_power': {
      entity_id: 'sensor.kitchen_power',
      state: '100',
      attributes: { device_class: 'power', unit_of_measurement: 'W' },
      last_changed: '',
      last_updated: '',
    },
    'sensor.closet_power': {
      entity_id: 'sensor.closet_power',
      state: '50',
      attributes: { device_class: 'power', unit_of_measurement: 'W' },
      last_changed: '',
      last_updated: '',
    },
    'sensor.unassigned_power': {
      entity_id: 'sensor.unassigned_power',
      state: '0.2',
      attributes: { device_class: 'power', unit_of_measurement: 'kW' },
      last_changed: '',
      last_updated: '',
    },
    'sensor.hidden_power': {
      entity_id: 'sensor.hidden_power',
      state: '999',
      attributes: { device_class: 'power', unit_of_measurement: 'W' },
      last_changed: '',
      last_updated: '',
    },
  },
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen', picture: null },
    closet: { area_id: 'closet', name: 'Closet', picture: null },
  },
  devices: {},
  floors: {},
  entities: {
    'sensor.kitchen_power': {
      entity_id: 'sensor.kitchen_power',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'sensor.closet_power': {
      entity_id: 'sensor.closet_power',
      device_id: null,
      area_id: 'closet',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'sensor.hidden_power': {
      entity_id: 'sensor.hidden_power',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: 'user',
    },
  },
};

describe('power usage', () => {
  it('uses shared visibility filters and keeps unassigned power sensors', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hidden_areas: ['closet'] },
      } as any,
    };

    const power = buildHousePowerUsage(hass, config);

    expect(power.total_watts).toBe(300);
    expect(power.rooms.map(room => room.area_name)).toEqual([UNASSIGNED_AREA_NAME, 'Kitchen']);
    expect(power.rooms.map(room => room.area_name)).not.toContain('Closet');
  });

  it('applies visibility filters to quick power totals', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hidden_areas: ['closet'] },
      } as any,
    };

    expect(getQuickPower(hass, config)?.display).toBe('300 W');
  });
});
