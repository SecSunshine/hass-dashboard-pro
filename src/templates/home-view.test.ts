import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { buildHomeHTML } from './home-view';

const hass: Hass = {
  states: {
    'person.alice': {
      entity_id: 'person.alice',
      state: 'home',
      attributes: { friendly_name: 'Alice' },
      last_changed: '',
      last_updated: '',
    },
    'person.bob': {
      entity_id: 'person.bob',
      state: 'not_home',
      attributes: { friendly_name: 'Bob' },
      last_changed: '',
      last_updated: '',
    },
    'light.kitchen': {
      entity_id: 'light.kitchen',
      state: 'on',
      attributes: { friendly_name: 'Kitchen Light' },
      last_changed: '',
      last_updated: '',
    },
    'weather.home': {
      entity_id: 'weather.home',
      state: 'sunny',
      attributes: { temperature: 24 },
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
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen', picture: null },
  },
  devices: {},
  floors: {},
  entities: {
    'light.kitchen': {
      entity_id: 'light.kitchen',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
  },
  user: { name: 'Demo' },
};

describe('home view settings', () => {
  it('honors hdp_config hidden home sections', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        home: { hidden_sections: ['status_badges', 'people', 'summary'] },
      } as any,
    };

    const html = buildHomeHTML(hass, config);
    expect(html).not.toContain('<div class="sd-wrap">');
    expect(html).not.toContain('<div class="pp-grid">');
    expect(html).not.toContain('<div class="sum-grid">');
  });

  it('honors hdp_config hidden persons', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        people: { hidden_persons: ['person.bob'] },
      } as any,
    };

    const html = buildHomeHTML(hass, config);
    expect(html).toContain('Alice');
    expect(html).not.toContain('Bob');
  });

  it('honors header visibility toggles', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        header: {
          show_time: false,
          show_weather: false,
          show_notifications: false,
          weather_entity: 'weather.home',
          alarm_entity: 'alarm_control_panel.home',
        },
      } as any,
    };

    const html = buildHomeHTML(hass, config);
    expect(html).not.toContain('<span class="hw-date">');
    expect(html).not.toContain('<div class="hw-weather">');
    expect(html).not.toContain('<div class="hw-alarm');
  });
});
