import { describe, expect, it } from 'vitest';
import type { StrategyConfig } from '../types';
import { generateStorageJS } from '../services/storage';
import { generateSettingsJS } from './settings-view';

type VisualFixture = {
  selectors?: Record<string, any[]>;
  ids?: Record<string, any>;
};

function createRuntime(
  config: StrategyConfig = { type: 'custom:hass-dashboard-pro' },
  visualFixture: VisualFixture = {},
) {
  const store = new Map<string, string>();
  const styleValues = new Map<string, string>();
  const timers: Array<{ delay: number; fn: () => void }> = [];
  const window = {} as any;
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
  const visualRoot = {
    querySelector: (selector: string) => selector.startsWith('#')
      ? visualFixture.ids?.[selector.slice(1)] ?? null
      : null,
    querySelectorAll: (selector: string) => visualFixture.selectors?.[selector] ?? [],
  };
  const document = {
    documentElement: {
      style: {
        setProperty: (key: string, value: string) => { styleValues.set(key, value); },
        getPropertyValue: (key: string) => styleValues.get(key) ?? '',
        removeProperty: (key: string) => { styleValues.delete(key); },
      },
    },
    getElementById: (id: string) => id === 'st-visual-body'
      ? visualRoot
      : visualFixture.ids?.[id] ?? null,
    addEventListener: () => undefined,
    querySelectorAll: (selector: string) => visualFixture.selectors?.[selector] ?? [],
  };
  const location = { reloaded: false, reload: () => { location.reloaded = true; } };
  const setTimeout = (fn: () => void, delay: number) => {
    timers.push({ fn, delay });
    return timers.length;
  };
  const code = `${generateStorageJS()}\n${generateSettingsJS(config)}\nreturn window;`;

  const runtime = new Function('window', 'localStorage', 'document', 'location', 'setTimeout', 'console', code)(
    window,
    localStorage,
    document,
    location,
    setTimeout,
    console,
  );

  const eventForChip = () => {
    const chip = {
      active: false,
      classList: {
        toggle: (className: string) => {
          if (className === 'st-chip--active') chip.active = !chip.active;
        },
        contains: (className: string) => className === 'st-chip--active' && chip.active,
      },
      getAttribute: (name: string) => name === 'data-array-mode' ? 'exclude' : null,
      setAttribute: () => undefined,
    };
    return { target: { closest: () => chip } };
  };

  return { runtime, store, styleValues, timers, location, eventForChip };
}

function createVisualButton(attributes: Record<string, string>, initialClasses: string[] = []) {
  const classes = new Set(initialClasses);
  const listeners = new Map<string, Array<(this: any) => void>>();
  const aria = new Map<string, string>();
  const button = {
    classList: {
      add: (...names: string[]) => names.forEach(name => classes.add(name)),
      toggle: (name: string, force?: boolean) => {
        const active = force === undefined ? !classes.has(name) : force;
        if (active) classes.add(name);
        else classes.delete(name);
        return active;
      },
      contains: (name: string) => classes.has(name),
    },
    getAttribute: (name: string) => attributes[name] ?? null,
    setAttribute: (name: string, value: string) => { aria.set(name, value); },
    addEventListener: (name: string, listener: (this: any) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener]);
    },
    click: () => (listeners.get('click') ?? []).forEach(listener => listener.call(button)),
    classes,
    aria,
  };
  return button;
}
describe('settings visual client script', () => {
  it('updates the selected theme and live preview from an actual control click', () => {
    const light = createVisualButton({ 'data-preset': 'light' }, ['theme-card', 'theme-card--active']);
    const dark = createVisualButton({ 'data-preset': 'dark' }, ['theme-card']);
    const { runtime, store, styleValues } = createRuntime({
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        visual: {
          theme: 'light',
          mood_preset: 'calm',
          primary: '#ff0000',
          colors: { page_bg: '#ffeeee' },
        },
      } as any,
    }, {
      selectors: { '.theme-card': [light, dark] },
    });

    dark.click();

    expect(runtime.hdpSettingsDraft.visual).toEqual({ theme: 'dark' });
    expect(runtime.hdpDraftVisualDirty).toBe(true);
    expect(dark.classes.has('theme-card--active')).toBe(true);
    expect(light.classes.has('theme-card--active')).toBe(false);
    expect(dark.aria.get('aria-pressed')).toBe('true');
    expect(styleValues.get('--hdp-bg')).toBe('#0C0E14');
    expect(styleValues.get('--hdp-text')).toBe('#F1F3F8');
    expect(store.get('hdp_visual_config')).toBeUndefined();
  });
  it('stages visual config through window-scoped helpers and saves on commit', async () => {
    const { runtime, store, timers, location } = createRuntime();

    await runtime.hdpSaveVisualConfigAndReload({ theme: 'dark', card_style: 'glass' }, 250);

    expect(store.get('hdp_visual_config')).toBeUndefined();
    expect(runtime.hdpLoadDraftVisualConfig()).toEqual({
      theme: 'dark',
      card_style: 'glass',
    });
    expect(runtime.hdpSettingsDraft.visual).toEqual({
      theme: 'dark',
      card_style: 'glass',
    });
    expect(timers).toEqual([]);
    expect(location.reloaded).toBe(false);

    runtime.hdpCommitSettings();

    expect(JSON.parse(store.get('hdp_visual_config') || '{}')).toEqual({
      theme: 'dark',
      card_style: 'glass',
    });
    expect(JSON.parse(store.get('hdp_config') || '{}').visual).toMatchObject({
      theme: 'dark',
      card_style: 'glass',
    });
    expect(timers.map(timer => timer.delay)).toContain(700);
    timers[timers.length - 1]?.fn();
    expect(location.reloaded).toBe(true);
  });


  it('seeds current strategy config before hidden setting toggles', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        dashboard: { name: 'Family Dashboard' },
        areas: { hidden_areas: ['kitchen'] },
        devices: {
          hidden_domains: ['sensor'],
          hidden_device_types: ['binary_sensor.motion'],
        },
      } as any,
    };
    const { runtime, store, eventForChip } = createRuntime(config);

    expect(store.get('hdp_config')).toBeUndefined();
    expect(runtime.hdpSettingsDraft).toMatchObject({
      dashboard: { name: 'Family Dashboard' },
      areas: { hidden_areas: ['kitchen'] },
      devices: {
        hidden_domains: ['sensor'],
        hidden_device_types: ['binary_sensor.motion'],
      },
    });

    runtime.hdpToggleArrayItem('areas.hidden_areas', 'garage', eventForChip());

    expect(runtime.hdpSettingsDraft.areas.hidden_areas).toEqual(['kitchen', 'garage']);
    expect(store.get('hdp_config')).toBeUndefined();

    runtime.hdpCommitSettings();

    const saved = JSON.parse(store.get('hdp_config') || '{}');
    expect(saved.areas.hidden_areas).toEqual(['kitchen', 'garage']);
    expect(saved.devices.hidden_domains).toEqual(['sensor']);
    expect(saved.devices.hidden_device_types).toEqual(['binary_sensor.motion']);
  });

  it('normalizes legacy hidden settings before toggling chips', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hidden_areas: ['kitchen'],
      hidden_domains: ['sensor'],
      hidden_device_types: ['binary_sensor.motion'],
      hidden_persons: ['person.alice'],
    };
    const { runtime, store, eventForChip } = createRuntime(config);

    expect(store.get('hdp_config')).toBeUndefined();
    expect(runtime.hdpSettingsDraft).toMatchObject({
      areas: { hidden_areas: ['kitchen'] },
      devices: {
        hidden_domains: ['sensor'],
        hidden_device_types: ['binary_sensor.motion'],
      },
      people: { hidden_persons: ['person.alice'] },
    });

    runtime.hdpToggleArrayItem('devices.hidden_domains', 'sensor', eventForChip());
    runtime.hdpToggleArrayItem('areas.hidden_areas', 'kitchen', eventForChip());

    expect(runtime.hdpSettingsDraft.devices.hidden_domains).toEqual([]);
    expect(runtime.hdpSettingsDraft.areas.hidden_areas).toEqual([]);

    runtime.hdpCommitSettings();

    const saved = JSON.parse(store.get('hdp_config') || '{}');
    expect(saved.devices.hidden_domains).toEqual([]);
    expect(saved.areas.hidden_areas).toEqual([]);
    expect(saved.devices.hidden_device_types).toEqual(['binary_sensor.motion']);
    expect(saved.people.hidden_persons).toEqual(['person.alice']);
  });
  it('clears visual config through window-scoped helpers', async () => {
    const { runtime, store, timers } = createRuntime();
    store.set('hdp_visual_config', JSON.stringify({ theme: 'dark' }));

    await runtime.hdpClearVisualConfigAndReload(100);

    expect(store.get('hdp_visual_config')).toBe(JSON.stringify({ theme: 'dark' }));
    expect(runtime.hdpLoadDraftVisualConfig()).toEqual({});
    expect(runtime.hdpSettingsDraft.visual).toEqual({});
    expect(timers).toEqual([]);

    runtime.hdpCommitSettings();

    expect(JSON.parse(store.get('hdp_visual_config') || '{}')).toEqual({});
    expect(JSON.parse(store.get('hdp_config') || '{}').visual).toEqual({});
    expect(timers.map(timer => timer.delay)).toContain(700);
  });

  it('discards staged visual changes when cancelling settings', async () => {
    const { runtime, store, styleValues, timers } = createRuntime({
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        visual: { theme: 'light' },
      } as any,
    });

    await runtime.hdpSaveVisualConfigAndReload({ theme: 'dark', card_style: 'glass' });

    expect(runtime.hdpDraftVisualDirty).toBe(true);
    expect(runtime.hdpSettingsDraft.visual).toEqual({ theme: 'dark', card_style: 'glass' });
    expect(store.get('hdp_visual_config')).toBeUndefined();
    expect(styleValues.get('--hdp-bg')).toBe('#0C0E14');

    runtime.hdpCancelSettings();

    expect(runtime.hdpDraftVisualDirty).toBe(false);
    expect(runtime.hdpDraftVisualConfig).toBeUndefined();
    expect(runtime.hdpSettingsDirty).toBe(false);
    expect(runtime.hdpSettingsDraft.visual).toEqual({ theme: 'light' });
    expect(styleValues.get('--hdp-bg')).toBeUndefined();
    expect(store.get('hdp_visual_config')).toBeUndefined();
    expect(timers.map(timer => timer.delay)).not.toContain(120);

    runtime.hdpCommitSettings();

    expect(store.get('hdp_visual_config')).toBeUndefined();
    expect(JSON.parse(store.get('hdp_config') || '{}').visual).toEqual({ theme: 'light' });
  });
});
