import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { countActiveAutomations, getAlarmStatus, getFavorites, getHomeSummaries, getPersons, getWeather } from './home-data';

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
    'automation.visible': {
      entity_id: 'automation.visible',
      state: 'on',
      attributes: { friendly_name: 'Visible Automation' },
      last_changed: '',
      last_updated: '',
    },
    'automation.hidden': {
      entity_id: 'automation.hidden',
      state: 'on',
      attributes: { friendly_name: 'Hidden Automation' },
      last_changed: '',
      last_updated: '',
    },
    'update.hidden': {
      entity_id: 'update.hidden',
      state: 'on',
      attributes: { friendly_name: 'Hidden Update' },
      last_changed: '',
      last_updated: '',
    },
    'person.alice': {
      entity_id: 'person.alice',
      state: 'home',
      attributes: { friendly_name: 'Alice' },
      last_changed: '',
      last_updated: '',
    },
    'person.hidden': {
      entity_id: 'person.hidden',
      state: 'home',
      attributes: { friendly_name: 'Hidden Person' },
      last_changed: '',
      last_updated: '',
    },
    'weather.hidden': {
      entity_id: 'weather.hidden',
      state: 'sunny',
      attributes: { temperature: 26 },
      last_changed: '',
      last_updated: '',
    },
    'weather.home': {
      entity_id: 'weather.home',
      state: 'cloudy',
      attributes: { temperature: 22 },
      last_changed: '',
      last_updated: '',
    },
    'sensor.repairs': {
      entity_id: 'sensor.repairs',
      state: '9',
      attributes: {},
      last_changed: '',
      last_updated: '',
    },
    'binary_sensor.repairs': {
      entity_id: 'binary_sensor.repairs',
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
    'automation.visible': {
      entity_id: 'automation.visible',
      device_id: null,
      area_id: null,
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'automation.hidden': {
      entity_id: 'automation.hidden',
      device_id: null,
      area_id: null,
      platform: 'demo',
      disabled_by: null,
      hidden_by: 'user',
    },
    'update.hidden': {
      entity_id: 'update.hidden',
      device_id: null,
      area_id: null,
      platform: 'demo',
      disabled_by: 'user',
      hidden_by: null,
    },
    'person.alice': {
      entity_id: 'person.alice',
      device_id: null,
      area_id: null,
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'person.hidden': {
      entity_id: 'person.hidden',
      device_id: null,
      area_id: null,
      platform: 'demo',
      disabled_by: null,
      hidden_by: 'user',
    },
    'weather.hidden': {
      entity_id: 'weather.hidden',
      device_id: null,
      area_id: null,
      platform: 'demo',
      disabled_by: null,
      hidden_by: 'user',
    },
    'weather.home': {
      entity_id: 'weather.home',
      device_id: null,
      area_id: null,
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'sensor.repairs': {
      entity_id: 'sensor.repairs',
      device_id: null,
      area_id: null,
      platform: 'demo',
      disabled_by: null,
      hidden_by: 'user',
    },
    'binary_sensor.repairs': {
      entity_id: 'binary_sensor.repairs',
      device_id: null,
      area_id: null,
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

  it('ignores registry-hidden automations and updates in summaries', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const summary = getHomeSummaries(hass, config);

    expect(countActiveAutomations(hass)).toBe(1);
    expect(summary.automations_count).toBe(1);
    expect(summary.updates_count).toBe(0);
  });

  it('ignores registry-hidden people in the home people card data', () => {
    const persons = getPersons(hass);

    expect(persons.map(person => person.entity_id)).toEqual(['person.alice']);
  });

  it('ignores registry-hidden weather entities for header weather', () => {
    expect(getWeather(hass).temp).toBe('22°');
    expect(getWeather(hass, 'weather.hidden').has_data).toBe(false);
  });

  it('ignores registry-hidden repair summary entities', () => {
    const summary = getHomeSummaries(hass, { type: 'custom:hass-dashboard-pro' });

    expect(summary.repairs_count).toBe(1);
  });

  it('ignores registry-hidden alarm entities when no visibility config is supplied', () => {
    const alarmHass: Hass = {
      ...hass,
      states: {
        ...hass.states,
        'alarm_control_panel.hidden': {
          entity_id: 'alarm_control_panel.hidden',
          state: 'triggered',
          attributes: {},
          last_changed: '',
          last_updated: '',
        },
        'alarm_control_panel.home': {
          entity_id: 'alarm_control_panel.home',
          state: 'armed_home',
          attributes: {},
          last_changed: '',
          last_updated: '',
        },
      },
      entities: {
        ...hass.entities,
        'alarm_control_panel.hidden': {
          entity_id: 'alarm_control_panel.hidden',
          device_id: null,
          area_id: null,
          platform: 'demo',
          disabled_by: null,
          hidden_by: 'user',
        },
        'alarm_control_panel.home': {
          entity_id: 'alarm_control_panel.home',
          device_id: null,
          area_id: null,
          platform: 'demo',
          disabled_by: null,
          hidden_by: null,
        },
      },
    };

    expect(getAlarmStatus(alarmHass).state).toBe('armed_home');
  });
});
