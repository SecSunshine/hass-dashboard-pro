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
});
