import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { collectVisibleEntities, getDashboardFilters } from '../utils/dashboard-model';
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

const STRUCTURAL_TAGS = new Set(['a', 'button', 'div', 'label', 'option', 'section', 'select', 'span']);

function stripRawBlocks(html: string): string {
  return html
    .replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<script>[\s\S]*?<\/script>/g, '');
}

function expectBalancedStructuralTags(html: string): void {
  const stack: string[] = [];
  const tagPattern = /<\/?([a-zA-Z][\w-]*)\b[^>]*>/g;
  const cleaned = stripRawBlocks(html);
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(cleaned))) {
    const fullTag = match[0];
    const tag = match[1].toLowerCase();
    if (!STRUCTURAL_TAGS.has(tag)) continue;
    if (fullTag.startsWith('</')) {
      expect(stack.pop()).toBe(tag);
    } else if (!fullTag.endsWith('/>')) {
      stack.push(tag);
    }
  }

  expect(stack).toEqual([]);
}

describe('settings view', () => {
  it('scopes visual card wrappers and keeps visual card styles', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildSettingsHTML(config, undefined, hass);
    const js = generateSettingsJS(config, undefined, hass);

    expect(html).toContain('.st-visual-card');
    expect(html).toContain('class="st-visual-card" data-visual-card="settings-header"');
    expect(html).toContain('class="st-visual-card" data-visual-card="theme-presets"');
    expect(html).toContain('#st-visual-body .st-visual-card');
    expect(html).toContain('#st-visual-body .st-visual-card > .settings-section');
    expect(html.indexOf('</style>\n<style>\n  /* Visual settings card spacing & wrappers */')).toBeGreaterThan(
      html.indexOf('#st-visual-body .settings-studio-btn'),
    );
    expect(html).toContain('.hdp-view[data-view="settings"] .hdp-area-content');
    expect(html).toContain('width: min(100%, 1040px)');
    expect(html).not.toContain('.st-section-body > div {');
    expect(html).toContain('.theme-grid');
    expect(html).toContain('<style>\n');
    expect(html).toContain('.settings-header');
    expect(html).toContain('#st-visual-body .settings-header-title');
    expect(html).toContain('#st-visual-body .settings-header-sub');
    expect(html).toContain('letter-spacing: 0;');
    expect(html).toContain('#st-visual-body .theme-grid');
    expect(html).toContain('#st-visual-body .settings-section');
    expect(html).toContain('repeat(auto-fit, minmax(160px, 1fr))');
    expect(html).toContain('repeat(auto-fit, minmax(120px, 1fr))');
    expect(html).toContain('repeat(auto-fit, minmax(130px, 1fr))');
    expect(html).toContain('#st-visual-body .color-row');
    expect(html).toContain('#st-visual-body .settings-studio-btn');
    expect(html).toContain('#st-visual-body .settings-studio-btn svg');
    expect(html).toContain('#st-visual-body svg {\n    width: 18px;\n    height: 18px;');
    expect(html).toContain('display: grid !important;');
    expect(html).toContain('grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)) !important;');
    expect(html).toContain('display: flex !important;\n    flex-direction: column !important;');
    expect(html).toContain('min-height: 112px;');
    expect(html).toContain('flex: 1 1 auto;');
    expect(html).not.toContain('max-height: 132px;');
    expect(html).toContain('flex: 0 0 14px;');
    expect(html).toContain('#st-visual-body .mood-icon {\n    font-size: 20px;');
    expect(html).toContain('#st-visual-body button {\n    appearance: none;');
    expect(html).toContain('white-space: normal;\n    text-align: center;');
    expect(html).toContain('#st-visual-body .toggle-switch::after');
    expect(html).toContain('#st-visual-body .toggle-switch-knob');
    expect(html).toContain('background: var(--hdp-surface-card, white);');
    expect(html).toContain('background: var(--hdp-surface-card, #fff);');
    expect(html).toContain('box-shadow: var(--hdp-shadow-card, 0 1px 3px rgba(0,0,0,0.15));');
    expect(html).toContain('box-shadow: var(--hdp-shadow-card, 0 1px 3px rgba(0,0,0,0.18));');
    expect(html).toContain('box-shadow: var(--hdp-shadow-card, 0 1px 4px rgba(0,0,0,0.15));');
    expect(html).toContain('#st-visual-body .lc-size-row');
    expect(html).toContain('#st-visual-body .am-toggle-row');
    expect(html).toContain('#st-visual-body input[type="color"]');
    expect(html).toContain('#st-visual-body,\n  #st-visual-body *');
    expect(html).toContain('#st-visual-body .color-swatch-wrap');
    expect(html).toContain('#st-visual-body .am-mood-select');
    expect(html).toContain('width: min(180px, 42vw)');
    expect(html).toContain(`#st-visual-body .seed-hex,
  #st-visual-body .color-hex {
    min-width: 0;
    max-width: min(120px, 32vw);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;`);
    expect(html).toContain(`#st-visual-body .lc-size-select,
  #st-visual-body .lc-skin-select,
  #st-visual-body .am-mood-select {
    min-width: 0;
    max-width: 100%;`);
    expect(html).toContain(`#st-visual-body .st-visual-card[data-visual-card="settings-actions"] {
    display: flex;
    flex-wrap: wrap;`.replace(/\"/g, '"'));
    expect(html).toContain('#st-visual-body .st-visual-card[data-visual-card="settings-actions"] .action-btn'.replace(/\"/g, '"'));
    expect(html).toContain('#st-visual-body .action-section');
    expect(html).toMatch(/@media \(max-width: 480px\) \{[\s\S]*#st-visual-body \.theme-grid/);
    expect(html).toMatch(/@media \(max-width: 560px\) \{[\s\S]*#st-visual-body \.theme-grid/);
    expect(html).toMatch(/@media \(max-width: 420px\) \{[\s\S]*\.st-plan-grid \{ grid-template-columns: 1fr; \}/);
    expect(html).not.toContain('#st-visual-body @media');
    expect(html).toMatch(/settings-header-sub">[\s\S]*?<\/div>\s*<button class="settings-studio-btn"/);
    expect(html).not.toMatch(/\saria-label="[^"]*\s\/>/);
    expect(html).toContain('.st-row > div');
    expect(html).toContain('.st-row > :not(:first-child)');
    expect(html).toContain('.st-row > .st-input');
    expect(html).toContain('.st-row > .st-toggle');
    expect(html).toContain('.st-section,\n  .st-section *');
    expect(html).toContain('.st-section-body {\n    display: none;\n    padding: 0 18px 18px 18px;\n    width: 100%;\n    max-width: 100%;\n    min-width: 0;\n    overflow-x: hidden;');
    expect(html).toContain('.st-chip-list {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: flex-start;\n    gap: 6px;\n    margin-top: 8px;\n    width: 100%;\n    max-width: 100%;\n    min-width: 0;\n    overflow-x: hidden;\n    overflow-y: visible;');
    expect(html).toContain('.st-chip {\n    display: inline-flex;');
    expect(html).toContain('flex: 0 1 auto;\n    padding: 5px 12px;');
    expect(html).toContain('min-height: 32px;\n    min-width: 0;\n    max-width: min(220px, 100%);\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;');
    expect(html).toContain('.st-btn {\n    display: flex;');
    expect(html).toContain('min-height: 44px;\n    min-width: 0;\n    max-width: 100%;');
    expect(html).toContain('white-space: normal;\n    overflow-wrap: anywhere;\n    text-align: left;');
    expect(html).toContain('.st-section button');
    expect(html).toContain('.st-section input,\n  .st-section select,\n  .st-section textarea');
    expect(html).toContain('background: var(--hdp-surface-card, var(--hdp-card-bg));');
    expect(html).toContain('.st-input::placeholder');
    expect(html).toContain('color: var(--hdp-text-muted);\n    opacity: 0.82;');
    expect(html).toContain('.st-chip:focus-visible,\n  .st-btn:focus-visible,\n  .st-toggle:focus-visible,\n  .st-section-hdr:focus-visible,\n  .st-layout-choice:focus-visible,\n  .st-plan-choice:focus-visible');
    expect(html).toContain('background: var(--hdp-surface-raised, var(--hdp-card-bg));');
    expect(html).toContain('background: color-mix(in srgb, var(--hdp-card-bg) 88%, transparent);');
    expect(html).toContain('backdrop-filter: blur(14px) saturate(140%);');
    expect(html).toContain('color: var(--hdp-text-inverse, #fff);');
    expect(html).toContain('.st-section a.st-btn');
    expect(html).toContain('.st-section svg {\n    flex-shrink: 0;\n    width: 18px;\n    height: 18px;');
    expect(html).toContain('.st-row--spaced');
    expect(html).toContain('.st-action-row,\n  .st-link-row');
    expect(html).toContain('.st-action-row .st-btn,\n  .st-link-row .st-btn');
    expect(html).toContain('flex: 1 1 120px;\n    min-width: 0;');
    expect(html).toContain('grid-template-columns: minmax(0, 1fr) minmax(0, 220px);');
    expect(html).toContain('.st-plan-hero > div');
    expect(html).toContain('.st-plan-hero > .st-btn');
    expect(html).toContain('.st-about-val {\n    font-weight: 600;\n    color: var(--hdp-text);\n    text-align: right;\n    min-width: 0;\n    overflow-wrap: anywhere;');
    expect(html).toContain('.st-plan-choice {\n    appearance: none;');
    expect(html).toContain('<button type="button" class="st-plan-choice');
    expect(html).toContain('data-design-plan="{&quot;pack_id&quot;:');
    expect(html).not.toContain('onclick="hdpApplyDesignPlan');
    expect(html).toContain('overflow-wrap: anywhere');
    expect(html).toContain('width: min(240px, 45vw)');
    expect(html).toContain('data-setting="areas.hidden_areas" data-value="kitchen"');
    expect(html).toContain('data-setting="devices.hidden_device_types" data-value="binary_sensor.motion"');
    expect(html).not.toContain('onclick="hdpToggleArrayItem');
    expect(html).toContain('data-component="settings-save-bar" data-dirty="false"');
    expect(html).toContain('data-action="cancel-settings"');
    expect(html).toContain('data-action="save-settings"');
    expect(html).not.toContain('onclick="hdpCancelSettings()"');
    expect(html).not.toContain('onclick="hdpCommitSettings()"');
    expect(html).toContain('.st-settings-actions {\n    position: sticky;');
    expect(html).toContain('width: 100%;\n    max-width: 100%;\n    min-width: 0;\n    box-sizing: border-box;');
    expect(html).toContain(`.st-settings-actions,
  .st-settings-actions * {
    box-sizing: border-box;`);
    expect(html).toContain('.st-settings-actions-text {\n    flex: 1 1 auto;\n    min-width: 0;');
    expect(html).toContain('.st-settings-actions-buttons {\n    display: flex;\n    flex-wrap: wrap;');
    expect(html).toContain('flex: 0 1 auto;\n    min-width: 0;\n    max-width: 100%;');
    expect(html).toContain('.st-settings-actions-buttons .st-btn {\n    justify-content: center;\n    text-align: center;');
    expect(html).toContain('.st-settings-actions-buttons .st-btn:focus-visible');
    expect(html).toContain('data-setting="devices.hidden_keywords"');
    expect(html).toContain('data-setting="devices.visible_keywords"');
    expect(html).toContain('<textarea class="st-input st-textarea"');
    expect(html).toContain('.st-textarea {');
    expect(html).toContain('resize: vertical;');
    expect(html).toContain('.st-keyword-field .st-textarea');
    expect(html).toContain('data-action="toggle-section" data-section="st-dashboard" role="button" aria-expanded="false" tabindex="0"');
    expect(html).toContain('data-action="toggle-section" data-section="st-visual" role="button" aria-expanded="true" tabindex="0"');
    expect(js).toContain("hdr.setAttribute('aria-expanded'");
    expect(html).toContain('data-action="refresh-themes"');
    expect(html).toContain('<div class="st-action-row">');
    expect(html).toContain('<div class="st-link-row">');
    expect(html).toContain('type="button" class="st-btn" data-action="refresh-themes"');
    expect(html).toContain('type="button" class="st-btn" data-action="export-config"');
    expect(html).toContain('type="button" class="st-btn" data-action="import-config"');
    expect(html).toContain('type="button" class="st-btn st-btn--danger" data-action="reset-config"');
    expect(html).not.toContain('onclick="hdpRefreshThemes()"');
    expect(html).not.toContain('onclick="hdpExportConfig()"');
    expect(html).not.toContain('onclick="hdpImportConfig()"');
    expect(html).not.toContain('onclick="hdpResetConfig()"');
    expect(html).not.toContain('style="margin-top: 12px;"');
    expect(html).not.toContain('style="margin-top: 12px; display: flex; gap: 8px;"');
    expect(html).toContain('data-action="open-theme-studio"');
    expect(html).toContain('data-action="select-theme-preset" data-preset="light" data-component="theme-card" aria-pressed="true"');
    expect(html).toContain('data-action="select-mood-preset"');
    expect(html).toContain('data-action="toggle-auto-dark" data-component="auto-dark-toggle" role="switch" aria-checked="true" tabindex="0"');
    expect(html).toContain('data-action="toggle-auto-mood" data-component="auto-mood-toggle" role="switch" aria-checked="false" tabindex="0"');
    expect(html).toContain('data-action="select-card-style" data-style="classic" data-component="style-card" aria-pressed="true"');
    expect(html).toContain('style-preview-line style-preview-line--primary');
    expect(html).toContain('style-preview-line style-preview-line--secondary');
    expect(html).toContain('.style-preview-line {');
    expect(html).not.toContain('style="width: 60%; height: 4px;');
    expect(html).not.toContain('style="width: 40%; height: 4px;');
    expect(html).toContain('data-action="select-layout-density" data-density="standard" aria-pressed="true"');
    expect(html).toContain('data-action="toggle-card-shadow" data-component="shadow-toggle" role="switch" aria-checked="true" tabindex="0"');
    expect(html).toContain('data-action="select-font-family"');
    expect(html).toContain('data-action="reset-visual-config"');
    expect(html).toContain('data-action="save-settings"');
    expect(html).toContain('修改会先暂存，点击保存后生效');
    expect(js).toContain("if (action === 'save-settings') window.hdpCommitSettings();");
    expect(js).toContain('window.hdpSettingsCommandHandlerReady');
    expect(js).toContain("control.setAttribute('aria-checked', !isOn ? 'true' : 'false');");
    expect(js).toContain("this.setAttribute('aria-checked', shadowOn ? 'true' : 'false');");
    expect(js).toContain("b.setAttribute('aria-pressed'");
    expect(html).not.toMatch(/[^<]\/(div|span|button|option|a|textarea|label|select|input)>/);
    expect(html).not.toMatch(/(^|[{}])\s*\.settings-section\s*\{/);
    expect(html).not.toMatch(/(^|[{}])\s*\.theme-card\s*\{/);
    expect(html).not.toMatch(/(^|[{}])\s*\.theme-card\s*,\s*\.mood-card/);
    expect(html).not.toMatch(/(^|[{}])\s*\.toggle-switch\s*\{/);
    expect(html).not.toMatch(/(^|[{}])\s*\.toggle-switch--on/);
    expect(html).not.toContain(':host, :root');
    expect(html.indexOf('Stable visual-settings layout')).toBeGreaterThan(html.indexOf('#st-visual-body .settings-header'));
    expect(html).not.toContain('grid-template-columns: repeat(4, 1fr)');
    expect(html).not.toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(html).not.toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(() => new Function(js)).not.toThrow();
  });

  it('keeps generated settings markup structurally balanced', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildSettingsHTML(config, undefined, hass);

    expectBalancedStructuralTags(html);
    const visualBodyIndex = html.indexOf('<div class="st-section-body" id="st-visual-body">');
    const visualActionsIndex = html.indexOf('<div class="st-visual-card" data-visual-card="settings-actions"');
    const themesIndex = html.indexOf('<div class="st-section" id="st-themes"');
    expect(visualBodyIndex).toBeLessThan(visualActionsIndex);
    expect(visualActionsIndex).toBeLessThan(themesIndex);
  });

  it('adds detected HA domains to the hidden domain controls', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('data-setting="devices.hidden_domains" data-value="number"');
    expect(html).toContain('数字');
    expect(html).not.toContain('data-setting="devices.hidden_domains" data-value="select"');
    expect(html).not.toContain('data-setting="devices.hidden_domains" data-value="automation"');
  });

  it('marks legacy hidden area, domain, and person settings as active', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hidden_areas: ['kitchen'],
      hidden_domains: ['number'],
      hidden_persons: ['person.alice'],
    };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('data-action="toggle-hidden-area" data-setting="areas.hidden_areas" data-value="kitchen" aria-pressed="true" title="Kitchen"');
    expect(html).toContain('data-action="toggle-hidden-domain" data-setting="devices.hidden_domains" data-value="number" aria-pressed="true" title="数字"');
    expect(html).toContain('data-action="toggle-hidden-person" data-setting="people.hidden_persons" data-value="person.alice" aria-pressed="true" title="Alice"');
  });

  it('offers home summary info card visibility controls', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        home: { hidden_info_cards: ['entities'] },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('首页版式');
    expect(html).toContain('行列式布局');
    expect(html).toContain('L 型布局');
    expect(html).toContain('镜像 L 型');
    expect(html).toContain('U 型布局');
    expect(html).toContain('data-action="select-home-layout" data-layout-preset="l_shape"');
    expect(html).toContain('系统概览项目');
    expect(html).toContain('data-action="toggle-home-info-card" data-setting="home.hidden_info_cards" data-value="entities" aria-pressed="true"');
    expect(html).toContain('data-setting="home.hidden_info_cards" data-value="areas"');
    expect(html).toContain('data-setting="home.hidden_info_cards" data-value="active"');
    expect(html).toContain('data-setting="home.hidden_info_cards" data-value="automations"');
  });

  it('offers common device subtype controls without relying on currently visible entities', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('data-setting="devices.hidden_device_types" data-value="binary_sensor.motion"');
    expect(html).toContain('data-setting="devices.hidden_device_types" data-value="sensor.temperature"');
    expect(html).toContain('温度传感器');
  });

  it('keeps common device subtype controls visible when their domain is hidden', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        devices: { hidden_domains: ['sensor'] },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('data-action="toggle-hidden-domain" data-setting="devices.hidden_domains" data-value="sensor" aria-pressed="true"');
    expect(html).toContain('data-setting="devices.hidden_device_types" data-value="sensor.temperature"');
  });

  it('keeps hidden device type chips visible even when no matching entity is visible', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        devices: { hidden_device_types: ['sensor.temperature'] },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('data-action="toggle-hidden-device-type" data-setting="devices.hidden_device_types" data-value="sensor.temperature" aria-pressed="true"');
    expect(html).not.toContain('onclick="hdpToggleArrayItem');
  });

  it('uses the same device type keys for settings chips and dashboard filtering', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        devices: { hidden_device_types: ['binary_sensor.motion'] },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);
    const visibleIds = collectVisibleEntities(hass, getDashboardFilters(config)).map(entity => entity.entity_id);

    expect(html).toContain('data-action="toggle-hidden-device-type" data-setting="devices.hidden_device_types" data-value="binary_sensor.motion" aria-pressed="true"');
    expect(visibleIds).not.toContain('binary_sensor.kitchen_motion');
  });

  it('ignores registry-hidden people in settings controls', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('data-setting="people.hidden_persons" data-value="person.alice"');
    expect(html).not.toContain('data-setting="people.hidden_persons" data-value="person.hidden"');
    expect(html).not.toContain('Hidden Person');
  });

  it('keeps hidden person chips visible so they can be restored', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        people: { hidden_persons: ['person.hidden', 'person.missing'] },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('data-action="toggle-hidden-person" data-setting="people.hidden_persons" data-value="person.hidden" aria-pressed="true"');
    expect(html).toContain('Hidden Person');
    expect(html).toContain('data-action="toggle-hidden-person" data-setting="people.hidden_persons" data-value="person.missing" aria-pressed="true"');
  });

  it('escapes dashboard setting input values', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        dashboard: {
          name: '"><script>alert(1)</script>',
          icon: 'mdi:home',
          avatar_url: '"><img src=x onerror=alert(1)>',
          background_image_url: '/local/bg.jpg',
        },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);
    expect(html).toContain('value="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
    expect(html).toContain('value="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"');
    expect(html).toContain('value="/local/bg.jpg"');
    expect(html).toContain('data-setting="dashboard.avatar_url" type="url"');
    expect(html).toContain('data-setting="dashboard.background_image_url" type="url"');
    expect(html).not.toContain('onchange="hdpSaveSetting');
    expect(html).not.toContain('value=""><script>');
    expect(html).not.toContain('value=""><img');
  });


  it('escapes seeded dashboard config for inline scripts', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        dashboard: { name: '</script><img src=x onerror=alert(1)>', icon: 'mdi:home' },
      } as any,
    };
    const js = generateSettingsJS(config, undefined, hass);

    expect(js).not.toContain('</script>');
    expect(js).not.toContain('<img');
    expect(js).toContain('\\u003C/script\\u003E');
  });

  it('initializes settings drafts from seeded config without persisting it', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        dashboard: { name: 'Seeded Home', icon: 'mdi:home' },
      } as any,
    };
    const js = generateSettingsJS(config, undefined, hass);

    expect(js).toContain('window.hdpInitialSettingsConfig = merged;');
    expect(js).toContain('hdpCloneConfig(window.hdpInitialSettingsConfig || {})');
    expect(js).not.toContain("localStorage.setItem('hdp_config', JSON.stringify(merged));");
  });

  it('persists staged setting changes only when saving', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const js = generateSettingsJS(config, undefined, hass);
    const html = buildSettingsHTML(config, undefined, hass);

    expect(js).toContain('window.hdpPersistSettingsAndReload = function');
    expect(js).toContain('window.hdpSettingsDraft = hdpCloneConfig');
    expect(js).toContain('window.hdpGetSettingsDraft = function');
    expect(js).toContain('function hdpSetDraftPath(path, value)');
    expect(js).toContain('function hdpSyncSettingsControlsFromDraft()');
    expect(js).toContain("document.querySelectorAll('[data-setting]')");
    expect(js).toContain("document.querySelectorAll('[data-layout-preset]')");
    expect(js).toContain('hdpSyncSettingsControlsFromDraft();');
    expect(js).toContain('hdpSetDraftPath(path, value);');
    expect(js).toContain('window.hdpCommitSettings = function');
    expect(js).toContain('window.hdpCancelSettings = function');
    const cancelBlock = js.slice(js.indexOf('window.hdpCancelSettings = function'), js.indexOf('window.hdpResetConfig = function'));
    expect(cancelBlock).not.toContain('location.reload()');
    expect(cancelBlock).not.toContain('setTimeout(function() { location.reload(); }, 120);');
    expect(js).toContain('var savedConfig = hdpCloneConfig(config);');
    expect(js).toContain("localStorage.setItem('hdp_config', JSON.stringify(savedConfig));");
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
    expect(js).toContain('var legacyHiddenKeywords = hdpNormalizeStringArray(normalized.hidden_keywords || normalized.hidden_device_keywords);');
    expect(js).toContain('var legacyHiddenPersons = hdpNormalizeStringArray(normalized.hidden_persons);');
    expect(js).toContain('hidden_areas: hdpMergeStringArrays(normalized.areas.hidden_areas, legacyHiddenAreas)');
    expect(js).toContain('hidden_keywords: hdpMergeStringArrays(normalized.devices.hidden_keywords, legacyHiddenKeywords)');
    expect(js).toContain('hidden_persons: hdpMergeStringArrays(normalized.people.hidden_persons, legacyHiddenPersons)');
    expect(js).toContain('delete normalized.hidden_device_types;');
    expect(js).toContain('delete normalized.hidden_device_keywords;');
    expect(js).toContain('delete normalized.hidden_persons;');
    expect(js).toContain('function hdpNormalizeVisualConfig(config)');
    expect(js).toContain('function hdpNormalizeBlueprints(value)');
    expect(js).toContain('function hdpSanitizeLayoutDensity(value)');
    expect(js).toContain('function hdpNormalizeCardSizes(value)');
    expect(js).toContain('function hdpNormalizeSkinMap(value)');
    expect(js).toContain('function hdpNormalizeTimeMoods(value)');
    expect(js).toContain('var config = hdpNormalizeHDPConfig(hdpApplyEntityMapping(bundle.hdp_config || {}, mapping.mapping)) || {};');
    expect(js).toContain('var visual = hdpNormalizeVisualConfig(bundle.visual_config) || {};');
    expect(js).toContain('var blueprints = hdpNormalizeBlueprints(hdpApplyEntityMapping(bundle.blueprints || [], mapping.mapping));');
    expect(js.indexOf('hdpClearConfig();', js.indexOf('window.hdpImportShareCode = function'))).toBeLessThan(
      js.indexOf('hdpSaveConfig(config);', js.indexOf('window.hdpImportShareCode = function')),
    );
    expect(js).toContain("var isOn = control.classList.contains('st-toggle--on');");
    expect(js).toContain('window.hdpSaveSetting(path, !isOn);');
    expect(html).toContain('data-setting="dashboard.name"');
    expect(html).toContain('data-setting="dashboard.avatar_url"');
    expect(html).toContain('data-setting="dashboard.background_image_url"');
    expect(html).toContain('data-setting="header.weather_entity"');
    expect(html).toContain('data-setting="header.alarm_entity"');
    expect(html).toContain('data-action="toggle-setting" data-setting="areas.hide_unavailable" role="switch" aria-checked="false" tabindex="0"');
    expect(js).toContain("control.setAttribute('aria-checked', !isOn ? 'true' : 'false');");
    expect(js).toContain("chip.setAttribute('aria-pressed'");
    expect(html).toContain("event.key === 'Enter' || event.key === ' '");
  });

  it('marks persisted theme presets as active', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        visual: { theme_id: 'dark' },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('theme-card theme-card--active" data-action="select-theme-preset" data-preset="dark" data-component="theme-card" aria-pressed="true"');
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

    expect(html).toContain('data-setting="areas.hidden_areas" data-value="__unassigned"');
    expect(html).toContain('未分配区域');
  });

  it('keeps stale hidden area chips visible so they can be restored', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hidden_areas: ['garage'] },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html).toContain('data-action="toggle-hidden-area" data-setting="areas.hidden_areas" data-value="garage" aria-pressed="true"');
    expect(html).toContain('data-setting="areas.hidden_areas" data-value="garage"');
  });

  it('orders area visibility controls from configured area order', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { area_order: ['__unassigned', 'kitchen'] },
      } as any,
    };
    const html = buildSettingsHTML(config, undefined, hass);

    expect(html.indexOf('data-value="__unassigned"')).toBeLessThan(html.indexOf('data-value="kitchen"'));
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
    expect(js).toContain('function hdpVisualGetElementById(id)');
    expect(js).toContain("hdpVisualQueryAll('.theme-card')");
    expect(js).toContain("hdpVisualQueryAll('.lc-density-btn')");
    expect(js).toContain("var autoDark = hdpVisualGetElementById('auto-dark-toggle');");
    expect(js).toContain("var seedInput = hdpVisualGetElementById('seed-color-input');");
    expect(js).toContain("var shadowToggle = hdpVisualGetElementById('shadow-toggle');");
    expect(js).toContain('if (shadowToggle) {');
    expect(js).toContain('shadowToggle.addEventListener');
    expect(js).not.toContain("document.querySelectorAll('.theme-card')");
    expect(js).not.toContain("document.querySelectorAll('.lc-density-btn')");
    expect(js).not.toContain("document.getElementById('auto-dark-toggle')");
    expect(js).not.toContain("document.getElementById('seed-color-input')");
    expect(js).not.toContain("document.getElementById('shadow-toggle').addEventListener");
    expect(js).toContain('current.visual = cfg;');
    expect(js).toContain('cfg.theme = preset;');
    expect(js).toContain('var cfg = window.hdpLoadDraftVisualConfig();');
    expect(js).toContain('window.hdpSaveVisualConfigAndReload(cfg);');
    expect(js).toContain('卡片尺寸已暂存，保存后生效');
    expect(js).toContain('区域皮肤已暂存，保存后生效');
    expect(js).not.toContain('卡片尺寸已保存');
    expect(js).not.toContain('区域皮肤已保存');
    expect(js).toContain('window.hdpReplaceVisualConfig({});');
    const visualHandlers = js.slice(js.indexOf('function hdpVisualQueryAll(selector)'));
    expect(visualHandlers).not.toContain("var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');");
  });
});
