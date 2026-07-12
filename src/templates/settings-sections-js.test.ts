import { describe, expect, it } from 'vitest';
import { generateStorageJS } from '../services/storage';
import { generateSettingsSectionsJS } from './settings-sections';

type MockChip = {
  active: boolean;
  pressed: string;
  disabled: boolean;
  attrs: Record<string, string>;
  classList: {
    toggle: (className: string, force?: boolean) => void;
    contains: (className: string) => boolean;
  };
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | undefined;
};

function createMockSettingElement(attrs: Record<string, string>, value = '') {
  const element = {
    value,
    active: false,
    attrs: { ...attrs },
    classList: {
      toggle: (className: string, force?: boolean) => {
        if (className === 'st-chip--active' || className === 'st-toggle--on' || className === 'st-layout-choice--active') {
          element.active = force == null ? !element.active : force;
        }
        if (className === 'st-toggle--off') {
          element.active = force == null ? !element.active : !force;
        }
      },
      contains: (className: string) => {
        if (className === 'st-chip--active' || className === 'st-toggle--on' || className === 'st-layout-choice--active') return element.active;
        if (className === 'st-toggle--off') return !element.active;
        return false;
      },
    },
    setAttribute: (name: string, attrValue: string) => { element.attrs[name] = attrValue; },
    getAttribute: (name: string) => element.attrs[name],
  };
  return element;
}

function createRuntime(
  initialSettingsConfig?: Record<string, unknown>,
  initialLocalConfig?: Record<string, unknown>,
  pendingSync = false,
) {
  const store = new Map<string, string>();
  if (initialLocalConfig) store.set('hdp_config', JSON.stringify(initialLocalConfig));
  if (pendingSync) store.set('hdp_config_pending_sync', 'true');
  const chips: MockChip[] = [];
  const settingControls: Array<ReturnType<typeof createMockSettingElement>> = [];
  const layoutChoices: Array<ReturnType<typeof createMockSettingElement>> = [];
  const timers: Array<{ delay: number; fn: () => void }> = [];
  const listeners: Record<string, Array<(event: any) => void>> = {};
  let reloadCount = 0;
  const window = initialSettingsConfig ? { hdpInitialSettingsConfig: initialSettingsConfig } as any : {} as any;
  const saveBar = {
    attrs: {} as Record<string, string>,
    setAttribute: (name: string, value: string) => { saveBar.attrs[name] = value; },
  };
  const saveText = { textContent: '修改设置后点击保存生效' };
  const document = {
    addEventListener: (type: string, listener: (event: any) => void) => {
      (listeners[type] ||= []).push(listener);
    },
    querySelector: (selector: string) => {
      if (selector === '.st-settings-actions') return saveBar;
      if (selector === '.st-settings-actions-text') return saveText;
      return null;
    },
    querySelectorAll: (selector: string) => {
      if (selector === '[data-setting]') return settingControls;
      if (selector === '[data-layout-preset]') return layoutChoices;
      return [];
    },
  };
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
  const location = { reload: () => { reloadCount += 1; } };
  const setTimeout = (fn: () => void, delay: number) => {
    timers.push({ fn, delay });
    return timers.length;
  };

  const code = `${generateStorageJS()}\n${generateSettingsSectionsJS()}\nreturn window;`;
  const runtime = new Function('window', 'localStorage', 'location', 'setTimeout', 'document', code)(
    window,
    localStorage,
    location,
    setTimeout,
    document,
  );

  const eventForChip = () => {
    const chip: MockChip = {
      active: false,
      pressed: 'false',
      disabled: false,
      attrs: {} as Record<string, string>,
      classList: {
        toggle: (className: string) => {
          if (className === 'st-chip--active') chip.active = !chip.active;
        },
        contains: (className: string) => className === 'st-chip--active' && chip.active,
      },
      setAttribute: (name: string, value: string) => {
        chip.attrs[name] = value;
        if (name === 'aria-pressed') chip.pressed = value;
        if (name === 'disabled') chip.disabled = true;
      },
      getAttribute: (name: string) => chip.attrs[name],
    };
    chips.push(chip);
    return { target: { closest: () => chip } };
  };

  return { runtime, store, eventForChip, chips, settingControls, layoutChoices, saveBar, saveText, timers, listeners, getReloadCount: () => reloadCount };
}

function encodeShareCode(bundle: unknown): string {
  return `HDP1.${btoa(unescape(encodeURIComponent(JSON.stringify(bundle))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')}`;
}

describe('settings sections client script', () => {
  it('delegates save and cancel commands exactly once', () => {
    const { runtime, listeners } = createRuntime();
    const calls: string[] = [];
    runtime.hdpCommitSettings = () => calls.push('save');
    runtime.hdpCancelSettings = () => calls.push('cancel');
    const click = (action: string) => {
      const control = { getAttribute: (name: string) => name === 'data-action' ? action : null };
      listeners.click[0]({
        target: { closest: () => control },
        preventDefault: () => {},
        stopPropagation: () => {},
      });
    };

    click('save-settings');
    click('cancel-settings');

    expect(calls).toEqual(['save', 'cancel']);
    expect(listeners.click).toHaveLength(1);
  });

  it('delegates visual switch keyboard activation', () => {
    const { listeners } = createRuntime();
    let clickCount = 0;
    let preventDefaultCount = 0;
    const control = {
      getAttribute: (name: string) => name === 'data-action' ? 'toggle-auto-dark' : null,
      click: () => { clickCount += 1; },
    };
    const keydown = (key: string) => listeners.keydown[0]({
      key,
      target: { closest: () => control },
      preventDefault: () => { preventDefaultCount += 1; },
    });

    keydown('Enter');
    keydown(' ');
    keydown('Escape');

    expect(clickCount).toBe(2);
    expect(preventDefaultCount).toBe(2);
  });

  it('stages delegated settings controls without saving or reloading', () => {
    const { runtime, listeners, store, timers } = createRuntime();
    const sectionCalls: string[] = [];
    runtime.hdpToggleSection = (id: string) => sectionCalls.push(id);
    const createControl = (attrs: Record<string, string>, classNames: string[] = [], value = '', type = '') => {
      const classes = new Set(classNames);
      const control: any = {
        value,
        type,
        getAttribute: (name: string) => attrs[name] ?? null,
        setAttribute: (name: string, attrValue: string) => { attrs[name] = attrValue; },
        classList: {
          contains: (name: string) => classes.has(name),
          toggle: (name: string, force?: boolean) => {
            const enabled = force == null ? !classes.has(name) : force;
            if (enabled) classes.add(name); else classes.delete(name);
          },
        },
        closest: () => null,
      };
      return control;
    };
    const click = (control: any) => listeners.click[0]({
      target: { closest: () => control },
      preventDefault: () => {},
      stopPropagation: () => {},
    });

    click(createControl({ 'data-action': 'toggle-section', 'data-section': 'st-devices' }));
    click(createControl({ 'data-action': 'toggle-setting', 'data-setting': 'areas.hide_unavailable' }, ['st-toggle', 'st-toggle--off']));
    click(createControl({
      'data-action': 'toggle-hidden-area',
      'data-setting': 'areas.hidden_areas',
      'data-value': 'kitchen',
    }, ['st-chip']));
    click(createControl({ 'data-action': 'select-home-layout', 'data-layout-preset': 'l_shape' }, ['st-layout-choice']));

    const urlInput = createControl({ 'data-setting': 'dashboard.avatar_url' }, [], '  /local/avatar.png  ', 'url');
    listeners.change[0]({ target: { closest: () => urlInput } });
    const keywordInput = createControl({
      'data-setting': 'devices.hidden_keywords',
      'data-value-type': 'keyword-list',
    }, [], 'Test, 客厅, test');
    listeners.input[0]({ target: { closest: () => keywordInput } });

    expect(sectionCalls).toEqual(['st-devices']);
    expect(runtime.hdpSettingsDraft.areas).toEqual({ hide_unavailable: true, hidden_areas: ['kitchen'] });
    expect(runtime.hdpSettingsDraft.home.layout_preset).toBe('l_shape');
    expect(runtime.hdpSettingsDraft.dashboard.avatar_url).toBe('/local/avatar.png');
    expect(runtime.hdpSettingsDraft.devices.hidden_keywords).toEqual(['test', '客厅']);
    expect(store.get('hdp_config')).toBeUndefined();
    expect(timers).toHaveLength(0);
  });

  it('rejects unsafe dashboard image URLs without changing the draft', () => {
    const { runtime, listeners, store, timers } = createRuntime();
    runtime.hdpSaveSetting('dashboard.background_image_url', '/local/original.jpg');
    let validityMessage = '';
    let reportCount = 0;
    const createUrlInput = (value: string) => ({
      value,
      type: 'url',
      getAttribute: (name: string) => name === 'data-setting' ? 'dashboard.background_image_url' : null,
      setCustomValidity: (message: string) => { validityMessage = message; },
      reportValidity: () => { reportCount += 1; },
    });
    const unsafe = createUrlInput('java\nscript:alert(1)');

    listeners.change[0]({ target: { closest: () => unsafe } });

    expect(runtime.hdpSettingsDraft.dashboard.background_image_url).toBe('/local/original.jpg');
    expect(unsafe.value).toBe('/local/original.jpg');
    expect(reportCount).toBe(1);
    expect(validityMessage).toBe('');
    expect(store.get('hdp_config')).toBeUndefined();
    expect(timers).toHaveLength(0);

    const relative = createUrlInput('images/dashboard.jpg');
    listeners.change[0]({ target: { closest: () => relative } });
    expect(runtime.hdpSettingsDraft.dashboard.background_image_url).toBe('images/dashboard.jpg');
  });

  it('delegates design and maintenance commands from safe data attributes', () => {
    const { runtime, listeners } = createRuntime();
    const calls: Array<string | Record<string, unknown>> = [];
    runtime.hdpApplyDesignPlan = (plan: Record<string, unknown>) => calls.push(plan);
    runtime.hdpRefreshThemes = () => calls.push('refresh');
    runtime.hdpExportConfig = () => calls.push('export');
    runtime.hdpImportConfig = () => calls.push('import');
    runtime.hdpResetConfig = () => calls.push('reset');
    const click = (attrs: Record<string, string>) => {
      const control = { getAttribute: (name: string) => attrs[name] ?? null, classList: { contains: () => false } };
      listeners.click[0]({
        target: { closest: () => control },
        preventDefault: () => {},
        stopPropagation: () => {},
      });
    };

    click({ 'data-action': 'apply-design-plan', 'data-design-plan': JSON.stringify({ pack_id: 'warm-home' }) });
    click({ 'data-action': 'refresh-themes' });
    click({ 'data-action': 'export-config' });
    click({ 'data-action': 'import-config' });
    click({ 'data-action': 'reset-config' });

    expect(calls).toEqual([{ pack_id: 'warm-home' }, 'refresh', 'export', 'import', 'reset']);
  });

  it('loads initial settings config into the draft without saving it', () => {
    const { runtime, store } = createRuntime({
      dashboard: { name: 'Seeded Home' },
      devices: { hidden_domains: ['sensor'] },
    });

    expect(runtime.hdpSettingsDraft.dashboard.name).toBe('Seeded Home');
    expect(runtime.hdpSettingsDraft.devices.hidden_domains).toEqual(['sensor']);
    expect(store.get('hdp_config')).toBeUndefined();

    runtime.hdpSaveSetting('dashboard.name', 'Draft Home');
    runtime.hdpSaveSetting('dashboard.avatar_url', '/local/draft-avatar.png');
    expect(runtime.hdpSettingsDraft.dashboard.name).toBe('Draft Home');
    expect(runtime.hdpSettingsDraft.dashboard.avatar_url).toBe('/local/draft-avatar.png');
    expect(store.get('hdp_config')).toBeUndefined();
    runtime.hdpCancelSettings();
    expect(runtime.hdpSettingsDraft.dashboard.name).toBe('Seeded Home');
    expect(runtime.hdpSettingsDraft.dashboard.avatar_url).toBeUndefined();
    expect(store.get('hdp_config')).toBeUndefined();
  });

  it('keeps server settings authoritative over a normal local cache', () => {
    const { runtime } = createRuntime(
      { dashboard: { name: 'Server Home' }, areas: { hidden_areas: ['server-area'] } },
      { dashboard: { name: 'Old Local Home' }, areas: { hidden_areas: ['local-area'] } },
    );

    expect(runtime.hdpSettingsDraft.dashboard.name).toBe('Server Home');
    expect(runtime.hdpSettingsDraft.areas.hidden_areas).toEqual(['server-area']);
  });

  it('restores pending local changes without overriding server permissions', () => {
    const { runtime } = createRuntime(
      {
        dashboard: { name: 'Server Home' },
        permissions: { restrict_non_admin: true, restrict_settings: true },
      },
      {
        dashboard: { name: 'Pending Local Home' },
        permissions: { restrict_non_admin: false, restrict_settings: false },
      },
      true,
    );

    expect(runtime.hdpSettingsDraft.dashboard.name).toBe('Pending Local Home');
    expect(runtime.hdpSettingsDraft.permissions).toEqual({
      restrict_non_admin: true,
      restrict_settings: true,
    });
  });

  it('keeps hidden area, domain, and device type chip toggles in a draft until commit', () => {
    const { runtime, store, eventForChip, chips } = createRuntime();

    runtime.hdpToggleArrayItem('areas.hidden_areas', 'kitchen', eventForChip());
    runtime.hdpToggleArrayItem('devices.hidden_domains', 'sensor', eventForChip());
    runtime.hdpToggleArrayItem('devices.hidden_device_types', 'binary_sensor.motion', eventForChip());

    expect(store.get('hdp_config')).toBeUndefined();
    expect(runtime.hdpSettingsDraft.areas.hidden_areas).toEqual(['kitchen']);
    expect(runtime.hdpSettingsDraft.devices.hidden_domains).toEqual(['sensor']);
    expect(runtime.hdpSettingsDraft.devices.hidden_device_types).toEqual(['binary_sensor.motion']);
    expect(runtime.hdpSettingsDirty).toBe(true);
    expect(chips.map(chip => chip.pressed)).toEqual(['true', 'true', 'true']);
    expect(chips.every(chip => chip.disabled)).toBe(false);

    runtime.hdpCommitSettings();

    const saved = JSON.parse(store.get('hdp_config') || '{}');
    expect(saved.areas.hidden_areas).toEqual(['kitchen']);
    expect(saved.devices.hidden_domains).toEqual(['sensor']);
    expect(saved.devices.hidden_device_types).toEqual(['binary_sensor.motion']);
  });

  it('allows repeated chip clicks without saving until commit', () => {
    const { runtime, store, eventForChip } = createRuntime();
    const event = eventForChip();

    runtime.hdpToggleArrayItem('areas.hidden_areas', 'kitchen', event);
    runtime.hdpToggleArrayItem('areas.hidden_areas', 'kitchen', event);

    expect(runtime.hdpSettingsDraft.areas.hidden_areas).toEqual([]);
    expect(store.get('hdp_config')).toBeUndefined();

    runtime.hdpCommitSettings();

    const saved = JSON.parse(store.get('hdp_config') || '{}');
    expect(saved.areas.hidden_areas).toEqual([]);
  });

  it('normalizes keyword lists in the draft config', () => {
    const { runtime, store } = createRuntime();

    runtime.hdpSaveKeywordList('devices.hidden_keywords', ` Test, 客厅，test
Old `);
    runtime.hdpSaveKeywordList('devices.visible_keywords', 'light, Living');

    expect(runtime.hdpSettingsDraft.devices.hidden_keywords).toEqual(['test', '客厅', 'old']);
    expect(runtime.hdpSettingsDraft.devices.visible_keywords).toEqual(['light', 'living']);
    expect(store.get('hdp_config')).toBeUndefined();

    runtime.hdpCommitSettings();

    const saved = JSON.parse(store.get('hdp_config') || '{}');
    expect(saved.devices.hidden_keywords).toEqual(['test', '客厅', 'old']);
    expect(saved.devices.visible_keywords).toEqual(['light', 'living']);
  });

  it('updates scalar draft settings repeatedly before commit', () => {
    const { runtime, store } = createRuntime();

    runtime.hdpSaveSetting('areas.hide_unavailable', true);
    runtime.hdpSaveSetting('areas.hide_unavailable', false);

    expect(runtime.hdpSettingsDraft.areas.hide_unavailable).toBe(false);
    expect(store.get('hdp_config')).toBeUndefined();

    runtime.hdpCommitSettings();

    const saved = JSON.parse(store.get('hdp_config') || '{}');
    expect(saved.areas.hide_unavailable).toBe(false);
    expect(store.get('hdp_config_pending_sync')).toBe('true');
  });

  it('stages home layout preset changes until commit', () => {
    const { runtime, store } = createRuntime();
    const buttons = [
      {
        active: false,
        attrs: {} as Record<string, string>,
        classList: {
          toggle: (_className: string, value: boolean) => { buttons[0].active = value; },
        },
        setAttribute: (name: string, value: string) => { buttons[0].attrs[name] = value; },
      },
      {
        active: false,
        attrs: {} as Record<string, string>,
        classList: {
          toggle: (_className: string, value: boolean) => { buttons[1].active = value; },
        },
        setAttribute: (name: string, value: string) => { buttons[1].attrs[name] = value; },
      },
    ];
    const event = {
      currentTarget: buttons[1],
    } as any;
    event.currentTarget.closest = () => ({ querySelectorAll: () => buttons });

    runtime.hdpSelectHomeLayout('l_mirror', event);

    expect(runtime.hdpSettingsDraft.home.layout_preset).toBe('l_mirror');
    expect(store.get('hdp_config')).toBeUndefined();
    expect(buttons[0].active).toBe(false);
    expect(buttons[1].active).toBe(true);
    expect(buttons[1].attrs['aria-pressed']).toBe('true');

    runtime.hdpCommitSettings();

    const saved = JSON.parse(store.get('hdp_config') || '{}');
    expect(saved.home.layout_preset).toBe('l_mirror');
  });

  it('restores the save bar state when cancelling staged settings', () => {
    const { runtime, store, settingControls, layoutChoices, saveBar, saveText, timers, getReloadCount } = createRuntime();
    const nameInput = createMockSettingElement({ 'data-setting': 'dashboard.name' }, 'Draft Home');
    const hiddenDomainChip = createMockSettingElement({ 'data-setting': 'devices.hidden_domains', 'data-value': 'sensor' });
    const unavailableToggle = createMockSettingElement({ 'data-setting': 'areas.hide_unavailable', role: 'switch' });
    const gridLayout = createMockSettingElement({ 'data-layout-preset': 'grid' });
    const mirrorLayout = createMockSettingElement({ 'data-layout-preset': 'l_mirror' });
    hiddenDomainChip.active = true;
    unavailableToggle.active = true;
    mirrorLayout.active = true;
    settingControls.push(nameInput, hiddenDomainChip, unavailableToggle);
    layoutChoices.push(gridLayout, mirrorLayout);

    runtime.hdpSaveSetting('areas.hide_unavailable', true);
    runtime.hdpSaveSetting('dashboard.name', 'Draft Home');
    runtime.hdpToggleArrayItem('devices.hidden_domains', 'sensor');
    runtime.hdpSelectHomeLayout('l_mirror');

    expect(runtime.hdpSettingsDirty).toBe(true);
    expect(saveBar.attrs['data-dirty']).toBe('true');
    expect(saveText.textContent).toBe('有未保存的更改');
    expect(store.get('hdp_config')).toBeUndefined();

    runtime.hdpCancelSettings();

    expect(runtime.hdpSettingsDirty).toBe(false);
    expect(saveBar.attrs['data-dirty']).toBe('false');
    expect(saveText.textContent).toBe('修改设置后点击保存生效');
    expect(runtime.hdpSettingsDraft).toEqual({});
    expect(nameInput.value).toBe('');
    expect(hiddenDomainChip.active).toBe(false);
    expect(hiddenDomainChip.attrs['aria-pressed']).toBe('false');
    expect(unavailableToggle.active).toBe(false);
    expect(unavailableToggle.attrs['aria-checked']).toBe('false');
    expect(gridLayout.active).toBe(true);
    expect(gridLayout.attrs['aria-pressed']).toBe('true');
    expect(mirrorLayout.active).toBe(false);
    expect(mirrorLayout.attrs['aria-pressed']).toBe('false');
    expect(timers.map(timer => timer.delay)).not.toContain(120);
    expect(getReloadCount()).toBe(0);
    expect(store.get('hdp_config')).toBeUndefined();
  });

  it('removes an already hidden chip value on the second toggle', () => {
    const { runtime, store, eventForChip } = createRuntime();

    runtime.hdpToggleArrayItem('devices.hidden_device_types', 'sensor.temperature', eventForChip());
    runtime.hdpToggleArrayItem('devices.hidden_device_types', 'sensor.temperature', eventForChip());

    runtime.hdpCommitSettings();

    const saved = JSON.parse(store.get('hdp_config') || '{}');
    expect(saved.devices.hidden_device_types).toEqual([]);
  });

  it('stages recommended design plans without saving or reloading immediately', () => {
    const { runtime, store, getReloadCount } = createRuntime();

    runtime.hdpApplyDesignPlan({
      pack_id: 'warm-home',
      visual: {
        page_bg: '#f8f2e7',
        card_bg: '#ffffff',
        primary: '#d97706',
        text_primary: '#1f2937',
        text_secondary: '#6b7280',
        border: '#eadfd0',
        border_radius: 18,
        card_padding: 16,
        card_gap: 12,
        card_style: 'soft',
        font_family: 'system',
        shadows: true,
        layout_density: 'cozy',
      },
    });

    expect(store.get('hdp_config')).toBeUndefined();
    expect(store.get('hdp_visual_config')).toBeUndefined();
    expect(getReloadCount()).toBe(0);
    expect(runtime.hdpSettingsDirty).toBe(true);
    expect(runtime.hdpDraftVisualDirty).toBe(true);
    expect(runtime.hdpSettingsDraft.visual).toMatchObject({
      theme_id: 'warm-home',
      card_style: 'soft',
      layout_density: 'cozy',
      colors: {
        primary: '#d97706',
      },
    });

    runtime.hdpCommitSettings();

    const saved = JSON.parse(store.get('hdp_config') || '{}');
    expect(saved.visual.theme_id).toBe('warm-home');
    expect(saved.visual.colors.primary).toBe('#d97706');
  });

  it('protects staged changes before refreshing theme files', () => {
    const { runtime, store, getReloadCount } = createRuntime();
    const prompts: string[] = [];

    runtime.hdpSaveSetting('dashboard.name', 'Draft Home');
    runtime.confirm = (message: string) => {
      prompts.push(message);
      return false;
    };

    runtime.hdpRefreshThemes();

    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('未保存更改');
    expect(getReloadCount()).toBe(0);
    expect(runtime.hdpSettingsDraft.dashboard.name).toBe('Draft Home');
    expect(store.get('hdp_config')).toBeUndefined();

    runtime.confirm = () => true;
    runtime.hdpRefreshThemes();

    expect(getReloadCount()).toBe(1);
  });

  it('imports share codes without requiring an HA lookup helper', () => {
    const { runtime, store, timers, getReloadCount } = createRuntime();
    const code = encodeShareCode({
      schema: 'hass-dashboard-pro.share.v1',
      version: 1,
      hdp_config: {
        dashboard: {
          name: 'Imported Home',
          avatar_url: 'javascript:alert(1)',
          background_image_url: 'images/dashboard.jpg',
        },
        devices: { hidden_domains: ['sensor'] },
        cards: {
          slots: {
            'home.summary': {
              size: 'wide',
              order: 2,
              background_image_url: '/local/summary.jpg',
              theme_from_image: true,
              yaml: 'type: custom:html-pro-card\ncontent: |\n  <div>Imported</div>',
            },
            'home.unsafe': {
              background_image_url: 'java\nscript:alert(1)',
              theme_from_image: true,
            },
          },
        },
      },
      visual_config: { theme: 'dark' },
      blueprints: [],
      source_entities: ['light.source_lamp'],
    });
    const previousPrompt = (globalThis as any).prompt;
    const previousAlert = (globalThis as any).alert;
    const alerts: string[] = [];

    try {
      (globalThis as any).prompt = () => code;
      (globalThis as any).alert = (message: string) => { alerts.push(message); };

      runtime.hdpImportShareCode();

      expect(alerts).toEqual([]);
      expect(JSON.parse(store.get('hdp_config') || '{}').dashboard).toEqual({
        name: 'Imported Home',
        icon: 'mdi:home',
        avatar_url: '',
        background_image_url: 'images/dashboard.jpg',
      });
      expect(JSON.parse(store.get('hdp_config') || '{}').devices.hidden_domains).toEqual(['sensor']);
      expect(JSON.parse(store.get('hdp_config') || '{}').cards.slots['home.summary']).toMatchObject({
        size: 'wide',
        order: 2,
        background_image_url: '/local/summary.jpg',
        theme_from_image: true,
      });
      expect(JSON.parse(store.get('hdp_config') || '{}').cards.slots['home.unsafe']).toEqual({});
      expect(JSON.parse(store.get('hdp_visual_config') || '{}')).toEqual({ theme: 'dark' });
      expect(JSON.parse(store.get('hdp_last_import_report') || '{}').unmapped).toEqual(['light.source_lamp']);
      expect(getReloadCount()).toBe(0);
      timers[timers.length - 1]?.fn();
      expect(getReloadCount()).toBe(1);
    } finally {
      (globalThis as any).prompt = previousPrompt;
      (globalThis as any).alert = previousAlert;
    }
  });
});
