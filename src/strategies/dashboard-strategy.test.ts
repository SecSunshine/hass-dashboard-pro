import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { HassDashboardProStrategy } from './dashboard-strategy';
import { HassDashboardProViewStrategy } from './view-strategy';

const hass: Hass = {
  states: {
    'light.kitchen': {
      entity_id: 'light.kitchen',
      state: 'on',
      attributes: { friendly_name: 'Kitchen Light' },
      last_changed: '',
      last_updated: '',
    },
    'light.bedroom': {
      entity_id: 'light.bedroom',
      state: 'off',
      attributes: { friendly_name: 'Bedroom Light' },
      last_changed: '',
      last_updated: '',
    },
  },
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen', picture: null },
    bedroom: { area_id: 'bedroom', name: 'Bedroom', picture: null },
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
    'light.bedroom': {
      entity_id: 'light.bedroom',
      device_id: null,
      area_id: 'bedroom',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
  },
};

describe('dashboard strategy hidden filters', () => {
  it('removes hidden areas from summaries, sidebar, and rendered area sections', async () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hidden_areas: ['kitchen'], area_order: [], hide_unavailable: false },
      },
    };

    const dashboard = await HassDashboardProStrategy.generate(config, hass);
    const homeStrategy = dashboard.views.find(view => view.path === 'home')?.strategy;

    expect(homeStrategy?.area_summaries?.map(area => area.area_id)).toEqual(['bedroom']);

    const home = await HassDashboardProViewStrategy.generate(homeStrategy!, hass);
    const content = String(home.cards[0].content || '');

    expect(content).toContain('data-area="bedroom"');
    expect(content).toContain('data-view="bedroom"');
    expect(content).toContain('Bedroom Light');
    expect(content).not.toContain('data-area="kitchen"');
    expect(content).not.toContain('data-view="kitchen"');
    expect(content).not.toContain('Kitchen Light');
  });

  it('honors configured area order in summaries, sidebar, and rendered area sections', async () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hidden_areas: [], area_order: ['bedroom', 'kitchen'], hide_unavailable: false },
      },
    };

    const dashboard = await HassDashboardProStrategy.generate(config, hass);
    const homeStrategy = dashboard.views.find(view => view.path === 'home')?.strategy;

    expect(homeStrategy?.area_summaries?.map(area => area.area_id)).toEqual(['bedroom', 'kitchen']);

    const home = await HassDashboardProViewStrategy.generate(homeStrategy!, hass);
    const content = String(home.cards[0].content || '');

    expect(content.indexOf('data-area="bedroom"')).toBeLessThan(content.indexOf('data-area="kitchen"'));
    expect(content.indexOf('<div class="hdp-view" data-view="bedroom"')).toBeLessThan(content.indexOf('<div class="hdp-view" data-view="kitchen"'));
  });

  it('removes areas left empty by hidden device type filters', async () => {
    const motionHass: Hass = {
      ...hass,
      states: {
        ...hass.states,
        'binary_sensor.bedroom_motion': {
          entity_id: 'binary_sensor.bedroom_motion',
          state: 'off',
          attributes: { friendly_name: 'Bedroom Motion', device_class: 'motion' },
          last_changed: '',
          last_updated: '',
        },
      },
      entities: {
        ...hass.entities,
        'light.bedroom': {
          ...hass.entities['light.bedroom'],
          disabled_by: 'user',
        },
        'binary_sensor.bedroom_motion': {
          entity_id: 'binary_sensor.bedroom_motion',
          device_id: null,
          area_id: 'bedroom',
          platform: 'demo',
          disabled_by: null,
          hidden_by: null,
        },
      },
    };
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        devices: { hidden_device_types: ['binary_sensor.motion'] },
      } as any,
    };

    const dashboard = await HassDashboardProStrategy.generate(config, motionHass);
    const homeStrategy = dashboard.views.find(view => view.path === 'home')?.strategy;

    expect(homeStrategy?.area_summaries?.map(area => area.area_id)).toEqual(['kitchen']);

    const home = await HassDashboardProViewStrategy.generate(homeStrategy!, motionHass);
    const content = String(home.cards[0].content || '');

    expect(content).toContain('data-area="kitchen"');
    expect(content).not.toContain('data-area="bedroom"');
    expect(content).not.toContain('data-view="bedroom"');
    expect(content).not.toContain('Bedroom Motion');
  });

  it('rebuilds stale view area summaries with current hidden areas', async () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro-view',
      view_path: 'home',
      area_summaries: [
        { area_id: 'kitchen', area_name: 'Kitchen', icon: 'mdi:chef-hat', entity_count: 1, active_count: 1, temp: null, humidity: null, domain_counts: { light: 1 } },
        { area_id: 'bedroom', area_name: 'Bedroom', icon: 'mdi:bed', entity_count: 1, active_count: 0, temp: null, humidity: null, domain_counts: { light: 1 } },
      ],
      hdp_config: {
        areas: { hidden_areas: ['kitchen'] },
      } as any,
    };

    const home = await HassDashboardProViewStrategy.generate(config, hass);
    const content = String(home.cards[0].content || '');

    expect(content).toContain('data-area="bedroom"');
    expect(content).not.toContain('data-area="kitchen"');
    expect(content).not.toContain('<div class="hdp-view" data-view="kitchen"');
    expect(content).not.toContain('Kitchen Light');
  });

  it('drops stale area summaries when current hidden device types empty an area', async () => {
    const motionHass: Hass = {
      ...hass,
      states: {
        'binary_sensor.bedroom_motion': {
          entity_id: 'binary_sensor.bedroom_motion',
          state: 'off',
          attributes: { friendly_name: 'Bedroom Motion', device_class: 'motion' },
          last_changed: '',
          last_updated: '',
        },
      },
      entities: {
        'binary_sensor.bedroom_motion': {
          entity_id: 'binary_sensor.bedroom_motion',
          device_id: null,
          area_id: 'bedroom',
          platform: 'demo',
          disabled_by: null,
          hidden_by: null,
        },
      },
    };
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro-view',
      view_path: 'home',
      area_summaries: [
        { area_id: 'bedroom', area_name: 'Bedroom', icon: 'mdi:bed', entity_count: 1, active_count: 0, temp: null, humidity: null, domain_counts: { binary_sensor: 1 } },
      ],
      hdp_config: {
        devices: { hidden_device_types: ['binary_sensor.motion'] },
      } as any,
    };

    const home = await HassDashboardProViewStrategy.generate(config, motionHass);
    const content = String(home.cards[0].content || '');

    expect(content).not.toContain('data-area="bedroom"');
    expect(content).not.toContain('<div class="hdp-view" data-view="bedroom"');
    expect(content).not.toContain('Bedroom Motion');
  });
  it('drops stale area summaries when current hidden domains empty an area', async () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro-view',
      view_path: 'home',
      area_summaries: [
        { area_id: 'kitchen', area_name: 'Kitchen', icon: 'mdi:chef-hat', entity_count: 1, active_count: 1, temp: null, humidity: null, domain_counts: { light: 1 } },
        { area_id: 'bedroom', area_name: 'Bedroom', icon: 'mdi:bed', entity_count: 1, active_count: 0, temp: null, humidity: null, domain_counts: { light: 1 } },
      ],
      hdp_config: {
        devices: { hidden_domains: ['light'] },
      } as any,
    };

    const home = await HassDashboardProViewStrategy.generate(config, hass);
    const content = String(home.cards[0].content || '');

    expect(content).not.toContain('data-area="kitchen"');
    expect(content).not.toContain('data-area="bedroom"');
    expect(content).not.toContain('Kitchen Light');
    expect(content).not.toContain('Bedroom Light');
  });
  it('omits the top-level settings view when settings are restricted', async () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        permissions: { restrict_settings: true },
      } as any,
    };

    const dashboard = await HassDashboardProStrategy.generate(config, hass);
    const paths = dashboard.views.map(view => view.path);

    expect(paths).toContain('home');
    expect(paths).toContain('devices');
    expect(paths).not.toContain('hdp-settings');
  });

  it('omits the top-level settings view for restricted non-admin users', async () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        permissions: { restrict_non_admin: true },
      } as any,
    };
    const nonAdminHass: Hass = {
      ...hass,
      user: { is_admin: false } as any,
    };

    const dashboard = await HassDashboardProStrategy.generate(config, nonAdminHass);
    const paths = dashboard.views.map(view => view.path);

    expect(paths).toContain('home');
    expect(paths).not.toContain('hdp-settings');
  });

  it('renders the top-level devices view with the devices panel open', async () => {
    const view = await HassDashboardProViewStrategy.generate({
      type: 'custom:hass-dashboard-pro-view',
      view_path: 'devices',
    }, hass);
    const content = String(view.cards[0].content || '');

    expect(view.cards).toHaveLength(1);
    expect(content).toContain('var initialView = params.get(\'hdp_area\') || "devices";');
    expect(content).toContain('<div class="hdp-view" data-view="devices" style="display:none">');
    expect(content).toContain('data-view="settings"');
  });

  it('renders the top-level settings view with the settings panel open', async () => {
    const view = await HassDashboardProViewStrategy.generate({
      type: 'custom:hass-dashboard-pro-view',
      view_path: 'hdp-settings',
    }, hass);
    const content = String(view.cards[0].content || '');

    expect(view.cards).toHaveLength(1);
    expect(content).toContain('var initialView = params.get(\'hdp_area\') || "settings";');
    expect(content).toContain('<div class="hdp-view" data-view="settings" style="display:none">');
    expect(content).toContain('data-view="devices"');
  });
});
