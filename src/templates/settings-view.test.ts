import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { buildSettingsHTML } from './settings-view';

const hass: Hass = {
  states: {},
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen', picture: null },
  },
  devices: {},
  floors: {},
  entities: {},
};

describe('settings view', () => {
  it('scopes visual card wrappers and keeps visual card styles', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('#st-visual-body > div');
    expect(html).not.toContain('.st-section-body > div {');
    expect(html).toContain('.theme-grid');
    expect(html).toContain("hdpToggleArrayItem('areas.hidden_areas'");
    expect(html).toContain(', event)');
  });
});
