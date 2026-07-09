import { describe, expect, it } from 'vitest';
import { generateStorageJS } from '../services/storage';
import { generateSettingsSectionsJS } from './settings-sections';

type MockChip = {
  active: boolean;
  pressed: string;
  disabled: boolean;
  attrs: Record<string, string>;
  classList: {
    toggle: (className: string) => void;
    contains: (className: string) => boolean;
  };
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | undefined;
};
function createRuntime(initialSettingsConfig?: Record<string, unknown>) {
  const store = new Map<string, string>();
  const chips: MockChip[] = [];
  const timers: Array<{ delay: number; fn: () => void }> = [];
  let reloadCount = 0;
  const window = initialSettingsConfig ? { hdpInitialSettingsConfig: initialSettingsConfig } as any : {} as any;
  const saveBar = {
    attrs: {} as Record<string, string>,
    setAttribute: (name: string, value: string) => { saveBar.attrs[name] = value; },
  };
  const saveText = { textContent: '修改设置后点击保存生效' };
  const document = {
    querySelector: (selector: string) => {
      if (selector === '.st-settings-actions') return saveBar;
      if (selector === '.st-settings-actions-text') return saveText;
      return null;
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

  return { runtime, store, eventForChip, chips, saveBar, saveText, timers, getReloadCount: () => reloadCount };
}

function encodeShareCode(bundle: unknown): string {
  return `HDP1.${btoa(unescape(encodeURIComponent(JSON.stringify(bundle))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')}`;
}

describe('settings sections client script', () => {
  it('loads initial settings config into the draft without saving it', () => {
    const { runtime, store } = createRuntime({
      dashboard: { name: 'Seeded Home' },
      devices: { hidden_domains: ['sensor'] },
    });

    expect(runtime.hdpSettingsDraft.dashboard.name).toBe('Seeded Home');
    expect(runtime.hdpSettingsDraft.devices.hidden_domains).toEqual(['sensor']);
    expect(store.get('hdp_config')).toBeUndefined();

    runtime.hdpSaveSetting('dashboard.name', 'Draft Home');
    expect(runtime.hdpSettingsDraft.dashboard.name).toBe('Draft Home');
    runtime.hdpCancelSettings();
    expect(runtime.hdpSettingsDraft.dashboard.name).toBe('Seeded Home');
    expect(store.get('hdp_config')).toBeUndefined();
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
  });

  it('restores the save bar state when cancelling staged settings', () => {
    const { runtime, store, saveBar, saveText, timers, getReloadCount } = createRuntime();

    runtime.hdpSaveSetting('areas.hide_unavailable', true);

    expect(runtime.hdpSettingsDirty).toBe(true);
    expect(saveBar.attrs['data-dirty']).toBe('true');
    expect(saveText.textContent).toBe('有未保存的更改');
    expect(store.get('hdp_config')).toBeUndefined();

    runtime.hdpCancelSettings();

    expect(runtime.hdpSettingsDirty).toBe(false);
    expect(saveBar.attrs['data-dirty']).toBe('false');
    expect(saveText.textContent).toBe('修改设置后点击保存生效');
    expect(runtime.hdpSettingsDraft).toEqual({});
    expect(timers.map(timer => timer.delay)).toContain(120);
    expect(getReloadCount()).toBe(0);
    timers[timers.length - 1]?.fn();
    expect(getReloadCount()).toBe(1);
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
        dashboard: { name: 'Imported Home' },
        devices: { hidden_domains: ['sensor'] },
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
      expect(JSON.parse(store.get('hdp_config') || '{}').dashboard.name).toBe('Imported Home');
      expect(JSON.parse(store.get('hdp_config') || '{}').devices.hidden_domains).toEqual(['sensor']);
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
