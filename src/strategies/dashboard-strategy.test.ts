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
});
