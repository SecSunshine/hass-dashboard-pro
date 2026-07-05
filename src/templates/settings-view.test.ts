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
    'number.speaker_volume': {
      entity_id: 'number.speaker_volume',
      state: '30',
      attributes: { friendly_name: 'Speaker Volume' },
      last_changed: '',
      last_updated: '',
    },
    'sensor.hidden_temperature': {
      entity_id: 'sensor.hidden_temperature',
      state: '21',
      attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
      last_changed: '',
      last_updated: '',
    },
    'select.disabled_mode': {
      entity_id: 'select.disabled_mode',
      state: 'auto',
      attributes: { friendly_name: 'Disabled Mode' },
      last_changed: '',
      last_updated: '',
    },
    'automation.hidden_system': {
      entity_id: 'automation.hidden_system',
      state: 'on',
      attributes: { friendly_name: 'Hidden System' },
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
  },
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen', picture: null },
  },
  devices: {},
  floors: {},
  entities: {
    'sensor.hidden_temperature': {
      entity_id: 'sensor.hidden_temperature',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: 'user',
    },
    'select.disabled_mode': {
      entity_id: 'select.disabled_mode',
      device_id: null,
      area_id: 'kitchen',
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
  },
};

describe('settings view', () => {
  it('scopes visual card wrappers and keeps visual card styles', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('#st-visual-body > div');
    expect(html).toContain('.hdp-view[data-view="settings"] .hdp-area-content');
    expect(html).toContain('width: min(100%, 1040px)');
    expect(html).not.toContain('.st-section-body > div {');
    expect(html).toContain('.theme-grid');
    expect(html).toContain('<style>\n');
    expect(html).toContain('.settings-header');
    expect(html).toContain('#st-visual-body .theme-grid');
    expect(html).toContain('#st-visual-body .settings-section');
    expect(html).toContain('repeat(auto-fit, minmax(136px, 1fr))');
    expect(html).toContain('#st-visual-body .color-row');
    expect(html).toContain('#st-visual-body .settings-studio-btn');
    expect(html).toContain('#st-visual-body .settings-studio-btn svg');
    expect(html).toContain('#st-visual-body .toggle-switch::after');
    expect(html).toContain('#st-visual-body .toggle-switch-knob');
    expect(html).toContain('#st-visual-body .lc-size-row');
    expect(html).toContain('#st-visual-body .am-toggle-row');
    expect(html).toContain('#st-visual-body input[type="color"]');
    expect(html).toContain('.st-row > div');
    expect(html).toContain('overflow-wrap: anywhere');
    expect(html).toContain('width: min(240px, 45vw)');
    expect(html).toContain("hdpToggleArrayItem('areas.hidden_areas'");
    expect(html).toContain("hdpToggleArrayItem('devices.hidden_device_types'");
    expect(html).toContain(', event)');
    expect(html).not.toMatch(/[^<]\/(div|span|button|option|a|textarea|label|select|input)>/);
    expect(html).not.toMatch(/(^|[{}])\s*\.settings-section\s*\{/);
    expect(html).not.toMatch(/(^|[{}])\s*\.theme-card\s*\{/);
    expect(html).not.toContain(':host, :root');
    expect(html.indexOf('Stable visual-settings layout')).toBeLessThan(html.indexOf('#st-visual-body .settings-header'));
  });

  it('adds detected HA domains to the hidden domain controls', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain("hdpToggleArrayItem('devices.hidden_domains', &quot;number&quot;, event)");
    expect(html).toContain('数字');
    expect(html).not.toContain("hdpToggleArrayItem('devices.hidden_domains', &quot;select&quot;, event)");
    expect(html).not.toContain("hdpToggleArrayItem('devices.hidden_domains', &quot;automation&quot;, event)");
  });

  it('marks legacy hidden area and domain settings as active', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hidden_areas: ['kitchen'],
      hidden_domains: ['number'],
      hdp_config: {
        areas: { hidden_areas: [] },
        devices: { hidden_domains: [], hidden_device_types: [] },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('st-chip st-chip--active" data-action="toggle-hidden-area" onclick="hdpToggleArrayItem(\'areas.hidden_areas\', &quot;kitchen&quot;, event)">Kitchen');
    expect(html).toContain('st-chip st-chip--active" data-action="toggle-hidden-domain" onclick="hdpToggleArrayItem(\'devices.hidden_domains\', &quot;number&quot;, event)');
  });

  it('ignores hidden or disabled registry entities in device type controls', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain("hdpToggleArrayItem('devices.hidden_device_types', &quot;binary_sensor.motion&quot;, event)");
    expect(html).not.toContain("hdpToggleArrayItem('devices.hidden_device_types', &quot;sensor.temperature&quot;, event)");
  });

  it('ignores registry-hidden people in settings controls', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain("hdpToggleArrayItem('people.hidden_persons', &quot;person.alice&quot;, event)");
    expect(html).not.toContain("hdpToggleArrayItem('people.hidden_persons', &quot;person.hidden&quot;, event)");
    expect(html).not.toContain('Hidden Person');
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
    expect(js).toContain('window.hdpResetConfig = function');
    expect(js).toContain('hdpSaveToLovelace(resetConfig)');
    expect(js).toContain("throw new Error('配置文件格式不正确')");
    expect(js).toContain('var normalized = hdpNormalizeHDPConfig(config);');
    expect(js).toContain('hdpClearConfig();');
    expect(js).toContain('hdpSaveConfig(normalized);');
    expect(js).not.toContain("localStorage.setItem('hdp_config', JSON.stringify(config));");
    expect(js).toContain('hdpSaveToLovelace(hdpLoadConfig()).then(reload)');
    expect(js).toContain('function isVisibleEntity(entityId)');
    expect(js).toContain('if (!isVisibleEntity(entityId)) return;');
    expect(js).toContain('function stripDomain(entityId)');
    expect(js).toContain('function hdpReplaceEntityId(value, from, to)');
    expect(js).toContain("Object.keys(mapping).sort(function(a, b) { return b.length - a.length; })");
    expect(js).toContain('function areaName(entityId)');
    expect(js).toContain('function deviceText(entityId)');
    expect(js).toContain("score(stripDomain(sourceId), stripDomain(entityId) + ' ' + friendly + ' ' + registryName + ' ' + deviceText(entityId) + ' ' + areaName(entityId))");
    expect(js).toContain('function hdpNormalizeHDPConfig(config)');
    expect(js).toContain('function hdpMergeStringArrays()');
    expect(js).toContain('var legacyHiddenAreas = hdpNormalizeStringArray(normalized.hidden_areas);');
    expect(js).toContain('hidden_areas: hdpMergeStringArrays(normalized.areas.hidden_areas, legacyHiddenAreas)');
    expect(js).toContain('delete normalized.hidden_device_types;');
    expect(js).toContain('function hdpNormalizeVisualConfig(config)');
    expect(js).toContain('function hdpNormalizeBlueprints(value)');
    expect(js).toContain('function hdpSanitizeLayoutDensity(value)');
    expect(js).toContain('function hdpNormalizeCardSizes(value)');
    expect(js).toContain('function hdpNormalizeSkinMap(value)');
    expect(js).toContain('function hdpNormalizeTimeMoods(value)');
    expect(js).toContain('var config = hdpNormalizeHDPConfig(hdpApplyEntityMapping(bundle.hdp_config || {}, mapping.mapping)) || {};');
    expect(js).toContain('var visual = hdpNormalizeVisualConfig(bundle.visual_config) || {};');
    expect(js).toContain('var blueprints = hdpNormalizeBlueprints(hdpApplyEntityMapping(bundle.blueprints || [], mapping.mapping));');
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

  it('does not offer visual skin overrides for hidden areas', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hidden_areas: ['kitchen'] },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).not.toContain('data-area-id="kitchen"');
  });

  it('offers the virtual unassigned area in visibility settings', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain("hdpToggleArrayItem('areas.hidden_areas', &quot;__unassigned&quot;, event)");
    expect(html).toContain('未分配区域');
  });

  it('offers visual skin overrides for the virtual unassigned area', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('data-area-id="__unassigned"');
    expect(html).toContain('未分配区域');
  });

  it('syncs visual setting changes into persisted dashboard config', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const js = generateSettingsJS(config, undefined, hass);

    expect(js).toContain('window.hdpSaveVisualConfig = function');
    expect(js).toContain('window.hdpSaveVisualConfigAndReload = function');
    expect(js).toContain('window.hdpClearVisualConfigAndReload = function');
    expect(js).toContain('window.hdpReplaceVisualConfig = function');
    expect(js).toContain('function hdpVisualQueryAll(selector)');
    expect(js).toContain("hdpVisualQueryAll('.theme-card')");
    expect(js).toContain("hdpVisualQueryAll('.lc-density-btn')");
    expect(js).not.toContain("document.querySelectorAll('.theme-card')");
    expect(js).not.toContain("document.querySelectorAll('.lc-density-btn')");
    expect(js).toContain('current.visual = cfg;');
    expect(js).toContain('cfg.theme = preset;');
    expect(js).toContain('hdpSaveVisualConfigAndReload(cfg);');
    expect(js).toContain('hdpReplaceVisualConfig({});');
  });
});
