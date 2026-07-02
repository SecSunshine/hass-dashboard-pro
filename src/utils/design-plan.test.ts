import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { buildDashboardDesignPlan, buildPlanAlternatives } from './design-plan';

function makeHass(darkMode = false, entityCount = 8): Hass {
  const states: Hass['states'] = {};
  const entities: Hass['entities'] = {};
  for (let i = 0; i < entityCount; i++) {
    const id = i % 3 === 0 ? `binary_sensor.motion_${i}` : `light.room_${i}`;
    states[id] = {
      entity_id: id,
      state: i % 2 === 0 ? 'on' : 'off',
      attributes: i % 3 === 0 ? { device_class: 'motion' } : {},
      last_changed: '',
      last_updated: '',
    };
    entities[id] = {
      entity_id: id,
      device_id: null,
      area_id: i % 2 === 0 ? 'living' : 'bedroom',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    };
  }

  return {
    states,
    areas: {
      living: { area_id: 'living', name: 'Living', picture: null },
      bedroom: { area_id: 'bedroom', name: 'Bedroom', picture: null },
    },
    devices: {},
    floors: {},
    entities,
    themes: { darkMode },
  };
}

describe('dashboard design plan', () => {
  it('builds a confirmable visual payload from the recommended style pack', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const plan = buildDashboardDesignPlan(makeHass(false, 8), config);

    expect(['colorful-family', 'warm-home', 'minimal-light']).toContain(plan.pack_id);
    expect(plan.visual.mood_preset).toBe(plan.pack_id);
    expect(plan.visual.card_style).toBeTruthy();
    expect(plan.rationale.join(' ')).toContain('2 个区域');
    expect(plan.focus.length).toBeGreaterThan(0);
  });

  it('prefers dark glass when Home Assistant is in dark mode', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    expect(buildDashboardDesignPlan(makeHass(true, 80), config).pack_id).toBe('dark-glass');
  });

  it('exposes all built-in alternatives for one-click confirmation', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    expect(buildPlanAlternatives(makeHass(false, 40), config).map(plan => plan.pack_id).sort()).toEqual([
      'colorful-family',
      'dark-glass',
      'minimal-light',
      'warm-home',
    ]);
  });
});
