import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { buildSettingsHTML, generateSettingsJS } from './settings-view';

const hass: Hass = {
  states: {
    'binary_sensor.kitchen_motion': {
      entity_id: 'binary_sensor.kitchen_motion',
      state: 'off',
      attributes: { device_class: 'motion' },
      last_changed: '',
      last_updated: '',
    },
  },
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
    expect(html).toContain('<style>\n');
    expect(html).toContain('.settings-header');
    expect(html).toContain('#st-visual-body .theme-grid');
    expect(html).toContain('repeat(auto-fit, minmax(136px, 1fr))');
    expect(html).toContain('#st-visual-body .color-row');
    expect(html).toContain("hdpToggleArrayItem('areas.hidden_areas'");
    expect(html).toContain("hdpToggleArrayItem('devices.hidden_device_types'");
    expect(html).toContain(', event)');
  });

  it('escapes dashboard setting input values', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        dashboard: { name: '"><script>alert(1)</script>', icon: 'mdi:home' },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);
    expect(html).toContain('value="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
    expect(html).not.toContain('value=""><script>');
  });

  it('persists scalar setting changes with a reload', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const js = generateSettingsJS(config, undefined, hass);
    const html = buildSettingsHTML(config, undefined, hass);

    expect(js).toContain('window.hdpPersistSettingsAndReload = function');
    expect(js).toContain('hdpSaveConfig(obj);');
    expect(js).toContain('hdpPersistSettingsAndReload();');
    expect(html).toContain("hdpSaveSetting('areas.hide_unavailable'");
  });

  it('marks persisted theme presets as active', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        visual: { theme_id: 'dark' },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('theme-card theme-card--active" data-preset="dark"');
  });

  it('syncs visual setting changes into persisted dashboard config', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const js = generateSettingsJS(config, undefined, hass);

    expect(js).toContain('window.hdpSaveVisualConfig = function');
    expect(js).toContain('window.hdpSaveVisualConfigAndReload = function');
    expect(js).toContain('window.hdpClearVisualConfigAndReload = function');
    expect(js).toContain('window.hdpReplaceVisualConfig = function');
    expect(js).toContain('current.visual = cfg;');
    expect(js).toContain('cfg.theme = preset;');
    expect(js).toContain('hdpSaveVisualConfigAndReload(cfg);');
    expect(js).toContain('hdpReplaceVisualConfig({});');
  });
});
