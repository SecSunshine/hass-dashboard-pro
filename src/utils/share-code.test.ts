import { describe, expect, it } from 'vitest';
import type { Hass } from '../types';
import { createShareBundle, decodeShareCode, encodeShareCode, importShareBundle } from './share-code';

const hass: Hass = {
  states: {
    'light.kitchen_ceiling': {
      entity_id: 'light.kitchen_ceiling',
      state: 'on',
      attributes: { friendly_name: 'Kitchen Ceiling' },
      last_changed: '',
      last_updated: '',
    },
  },
  areas: {},
  devices: {},
  floors: {},
  entities: {},
};

describe('share code', () => {
  it('round trips a dashboard bundle', () => {
    const bundle = createShareBundle({
      name: 'Demo',
      hdp_config: { dashboard: { name: 'Demo', icon: 'mdi:home' } } as any,
      visual_config: { primary: '#123456' },
      blueprints: [],
      exported_at: '2026-07-02T00:00:00.000Z',
    });

    const code = encodeShareCode(bundle);
    expect(code.startsWith('HDP1.')).toBe(true);
    expect(decodeShareCode(code)).toEqual(bundle);
  });

  it('maps imported entity references for the target home', () => {
    const bundle = createShareBundle({
      blueprints: [{
        id: 'bp_demo',
        name: 'Imported',
        icon: 'mdi:puzzle',
        blueprint_yaml: 'card:\n  entity: light.old_kitchen_ceiling',
        inputs: { main: 'light.old_kitchen_ceiling' },
        card: { type: 'custom:html-pro-card', content: '<div data-entity="light.old_kitchen_ceiling"></div>' },
      }],
      exported_at: '2026-07-02T00:00:00.000Z',
    });

    const imported = importShareBundle(bundle, hass);
    expect(imported.mapping.mapping['light.old_kitchen_ceiling']).toBe('light.kitchen_ceiling');
    expect(imported.blueprints?.[0].inputs.main).toBe('light.kitchen_ceiling');
    expect(imported.blueprints?.[0].card.content).toContain('light.kitchen_ceiling');
  });

  it('normalizes unsafe visual config and malformed blueprints on import', () => {
    const imported = importShareBundle({
      schema: 'hass-dashboard-pro.share.v1',
      version: 1,
      exported_at: '2026-07-02T00:00:00.000Z',
      hdp_config: {
        visual: {
          card_style: 'bad-style',
          layout_density: 'giant',
          card_sizes: { home_welcome: 'wide', broken: 'huge' },
          area_skins: { kitchen: 'glass', garage: 'bad' },
          time_moods: { dawn: 'coral', day: 'bad', bogus: 'neon' },
        },
        hidden_areas: ['garage', 'kitchen', 1],
        hidden_domains: ['switch', 'sensor', false],
        hidden_device_types: ['sensor.power', 'binary_sensor.motion', {}],
        hidden_persons: ['person.bob', 'person.alice', null],
        areas: { hidden_areas: ['kitchen', 1, ''], area_order: ['kitchen', null] },
        devices: { hidden_domains: ['sensor', false], hidden_device_types: ['binary_sensor.motion', {}] },
        people: { hidden_persons: ['person.alice', ''] },
        blueprints: {
          pages: [
            { id: 'broken' },
            {
              id: 'nested_good',
              name: 'Nested Good',
              blueprint_yaml: 'card:\n  type: custom:html-pro-card',
              inputs: null,
              card: { type: 'custom:html-pro-card', content: '<div></div>' },
            },
          ],
          replacements: [],
        },
      } as any,
      visual_config: { card_style: 'bad" onclick="evil()' } as any,
      blueprints: [
        { id: 'bad' } as any,
        {
          id: 'good',
          name: 'Good',
          icon: '',
          blueprint_yaml: 'card:\n  type: custom:html-pro-card',
          inputs: null,
          card: { type: 'custom:html-pro-card', content: '<div></div>' },
        } as any,
      ],
      source_entities: [],
    }, hass);

    expect(imported.visual_config?.card_style).toBe('classic');
    expect(imported.hdp_config?.visual?.card_style).toBe('classic');
    expect(imported.hdp_config?.visual?.layout_density).toBe('standard');
    expect(imported.hdp_config?.visual?.card_sizes).toEqual({ home_welcome: 'wide' });
    expect(imported.hdp_config?.visual?.area_skins).toEqual({ kitchen: 'glass' });
    expect(imported.hdp_config?.visual?.time_moods).toEqual({ dawn: 'coral' });
    expect(imported.hdp_config?.areas?.hidden_areas).toEqual(['kitchen', 'garage']);
    expect(imported.hdp_config?.areas?.area_order).toEqual(['kitchen']);
    expect(imported.hdp_config?.devices?.hidden_domains).toEqual(['sensor', 'switch']);
    expect(imported.hdp_config?.devices?.hidden_device_types).toEqual(['binary_sensor.motion', 'sensor.power']);
    expect(imported.hdp_config?.people?.hidden_persons).toEqual(['person.alice', 'person.bob']);
    expect(imported.hdp_config).not.toHaveProperty('hidden_areas');
    expect(imported.hdp_config).not.toHaveProperty('hidden_domains');
    expect(imported.hdp_config).not.toHaveProperty('hidden_device_types');
    expect(imported.hdp_config).not.toHaveProperty('hidden_persons');
    expect(imported.hdp_config?.blueprints?.pages).toHaveLength(1);
    expect(imported.hdp_config?.blueprints?.pages[0].icon).toBe('mdi:puzzle');
    expect(imported.hdp_config?.blueprints?.replacements).toEqual({});
    expect(imported.blueprints).toHaveLength(1);
    expect(imported.blueprints?.[0].id).toBe('good');
    expect(imported.blueprints?.[0].inputs).toEqual({});
  });
});
