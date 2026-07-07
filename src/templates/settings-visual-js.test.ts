import { describe, expect, it } from 'vitest';
import type { StrategyConfig } from '../types';
import { generateStorageJS } from '../services/storage';
import { generateSettingsJS } from './settings-view';

function createRuntime() {
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
  const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
  const code = `${generateStorageJS()}\n${generateSettingsJS(config)}\nreturn window;`;

  const runtime = new Function('window', 'localStorage', 'document', 'location', 'setTimeout', 'console', code)(
    window,
    localStorage,
    document,
    location,
    setTimeout,
    console,
  );

  return { runtime, store, timers, location };
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

  it('clears visual config through window-scoped helpers', async () => {
    const { runtime, store, timers } = createRuntime();
    store.set('hdp_visual_config', JSON.stringify({ theme: 'dark' }));

    await runtime.hdpClearVisualConfigAndReload(100);

    expect(store.get('hdp_visual_config')).toBeUndefined();
    expect(JSON.parse(store.get('hdp_config') || '{}').visual).toEqual({});
    expect(timers.map(timer => timer.delay)).toContain(100);
  });
});
