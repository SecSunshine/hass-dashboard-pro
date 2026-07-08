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
function createRuntime() {
  const store = new Map<string, string>();
  const chips: MockChip[] = [];
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

  return { runtime, store, eventForChip, chips };
}

describe('settings sections client script', () => {
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

  it('removes an already hidden chip value on the second toggle', () => {
    const { runtime, store, eventForChip } = createRuntime();

    runtime.hdpToggleArrayItem('devices.hidden_device_types', 'sensor.temperature', eventForChip());
    runtime.hdpToggleArrayItem('devices.hidden_device_types', 'sensor.temperature', eventForChip());

    runtime.hdpCommitSettings();

    const saved = JSON.parse(store.get('hdp_config') || '{}');
    expect(saved.devices.hidden_device_types).toEqual([]);
  });
});
