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
});
