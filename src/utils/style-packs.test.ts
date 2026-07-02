import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { applyDefaultStylePack, selectDefaultStylePack, STYLE_PACKS } from './style-packs';

function makeHass(darkMode = false, entityCount = 1): Hass {
  const states: Hass['states'] = {};
  const entities: Hass['entities'] = {};
  for (let i = 0; i < entityCount; i++) {
    const id = `light.demo_${i}`;
    states[id] = {
      entity_id: id,
      state: 'off',
      attributes: {},
      last_changed: '',
      last_updated: '',
    };
    entities[id] = {
      entity_id: id,
      device_id: null,
      area_id: 'living',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    };
  }
  return {
    states,
    areas: { living: { area_id: 'living', name: 'Living', picture: null } },
    devices: {},
    floors: {},
    entities,
    themes: { darkMode },
  };
}

describe('style packs', () => {
  it('exposes the four phase-one packs', () => {
    expect(Object.keys(STYLE_PACKS).sort()).toEqual([
      'colorful-family',
      'dark-glass',
      'minimal-light',
      'warm-home',
    ]);
  });

  it('selects dark glass in dark mode', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    expect(selectDefaultStylePack(makeHass(true), config).pack.id).toBe('dark-glass');
  });

  it('does not override explicit visual config', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro', visual: { card_style: 'neon' } };
    expect(applyDefaultStylePack({}, makeHass(false), config)).toEqual({});
  });
});

