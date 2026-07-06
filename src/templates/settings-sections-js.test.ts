import { describe, expect, it } from 'vitest';
import { generateStorageJS } from '../services/storage';
import { generateSettingsSectionsJS } from './settings-sections';

function createRuntime() {
  const store = new Map<string, string>();
  const chips: Array<{ active: boolean; pressed: string }> = [];
  const window = {} as any;
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
  const location = { reload: () => undefined };
  const setTimeout = () => 1;

  const code = `${generateStorageJS()}\n${generateSettingsSectionsJS()}\nreturn window;`;
  const runtime = new Function('window', 'localStorage', 'location', 'setTimeout', code)(
    window,
    localStorage,
    location,
    setTimeout,
  );

  const eventForChip = () => {
    const chip = {
      active: false,
      pressed: 'false',
      classList: {
        toggle: (className: string) => {
          if (className === 'st-chip--active') chip.active = !chip.active;
        },
        contains: (className: string) => className === 'st-chip--active' && chip.active,
      },
      setAttribute: (name: string, value: string) => {
        if (name === 'aria-pressed') chip.pressed = value;
      },
    };
    chips.push(chip);
    return { target: { closest: () => chip } };
  };

  return { runtime, store, eventForChip, chips };
}

describe('settings sections client script', () => {
  it('persists hidden area, domain, and device type chip toggles', () => {
    const { runtime, store, eventForChip, chips } = createRuntime();

    runtime.hdpToggleArrayItem('areas.hidden_areas', 'kitchen', eventForChip());
    runtime.hdpToggleArrayItem('devices.hidden_domains', 'sensor', eventForChip());
    runtime.hdpToggleArrayItem('devices.hidden_device_types', 'binary_sensor.motion', eventForChip());

    const saved = JSON.parse(store.get('hdp_config') || '{}');
    expect(saved.areas.hidden_areas).toEqual(['kitchen']);
    expect(saved.devices.hidden_domains).toEqual(['sensor']);
    expect(saved.devices.hidden_device_types).toEqual(['binary_sensor.motion']);
    expect(chips.map(chip => chip.pressed)).toEqual(['true', 'true', 'true']);
  });

  it('removes an already hidden chip value on the second toggle', () => {
    const { runtime, store, eventForChip } = createRuntime();

    runtime.hdpToggleArrayItem('devices.hidden_device_types', 'sensor.temperature', eventForChip());
    runtime.hdpToggleArrayItem('devices.hidden_device_types', 'sensor.temperature', eventForChip());

    const saved = JSON.parse(store.get('hdp_config') || '{}');
    expect(saved.devices.hidden_device_types).toEqual([]);
  });
});
