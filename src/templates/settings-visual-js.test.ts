import { describe, expect, it } from 'vitest';
import type { StrategyConfig } from '../types';
import { generateStorageJS } from '../services/storage';
import { generateSettingsJS } from './settings-view';

function createRuntime(config: StrategyConfig = { type: 'custom:hass-dashboard-pro' }) {
  const store = new Map<string, string>();
  const timers: Array<{ delay: number; fn: () => void }> = [];
  const window = {} as any;
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
  const document = {
    documentElement: { style: { setProperty: () => undefined } },
    getElementById: () => null,
    querySelectorAll: () => [],
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
      setAttribute: () => undefined,
    };
    return { target: { closest: () => chip } };
  };

  return { runtime, store, timers, location, eventForChip };
}

describe('settings visual client script', () => {
  it('saves visual config through window-scoped helpers and schedules reload', async () => {
    const { runtime, store, timers, location } = createRuntime();

    await runtime.hdpSaveVisualConfigAndReload({ theme: 'dark', card_style: 'glass' }, 250);

    expect(JSON.parse(store.get('hdp_visual_config') || '{}')).toEqual({
      theme: 'dark',
      card_style: 'glass',
    });
    expect(JSON.parse(store.get('hdp_config') || '{}').visual).toEqual({
      theme: 'dark',
      card_style: 'glass',
    });
    expect(timers.map(timer => timer.delay)).toContain(250);
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

    expect(JSON.parse(store.get('hdp_config') || '{}')).toMatchObject({
      dashboard: { name: 'Family Dashboard' },
      areas: { hidden_areas: ['kitchen'] },
      devices: {
        hidden_domains: ['sensor'],
        hidden_device_types: ['binary_sensor.motion'],
      },
    });

    runtime.hdpToggleArrayItem('areas.hidden_areas', 'garage', eventForChip());

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

    expect(JSON.parse(store.get('hdp_config') || '{}')).toMatchObject({
      areas: { hidden_areas: ['kitchen'] },
      devices: {
        hidden_domains: ['sensor'],
        hidden_device_types: ['binary_sensor.motion'],
      },
      people: { hidden_persons: ['person.alice'] },
    });

    runtime.hdpToggleArrayItem('devices.hidden_domains', 'sensor', eventForChip());
    runtime.hdpToggleArrayItem('areas.hidden_areas', 'kitchen', eventForChip());

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

    expect(store.get('hdp_visual_config')).toBeUndefined();
    expect(JSON.parse(store.get('hdp_config') || '{}').visual).toEqual({});
    expect(timers.map(timer => timer.delay)).toContain(100);
  });
});
