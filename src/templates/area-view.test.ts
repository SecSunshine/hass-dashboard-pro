import { describe, expect, it } from 'vitest';
import type { EntityInfo, Hass } from '../types';
import { buildAreaHTML } from './area-view';

const hass: Hass = {
  states: {
    'light.kitchen_counter': {
      entity_id: 'light.kitchen_counter',
      state: 'on',
      attributes: {
        friendly_name: 'Kitchen Counter',
      },
      last_changed: '',
      last_updated: '',
    },
    'sensor.power_meter': {
      entity_id: 'sensor.power_meter',
      state: '12345678901234567890',
      attributes: {
        friendly_name: 'Power Meter With An Extremely Long Friendly Name',
        device_class: 'power',
        unit_of_measurement: 'W',
      },
      last_changed: '',
      last_updated: '',
    },
  },
  areas: {},
  devices: {},
  floors: {},
  entities: {},
};

const entities: EntityInfo[] = [
  {
    entity_id: 'light.kitchen_counter',
    name: 'Kitchen Counter',
    domain: 'light',
    icon: null,
    state: 'on',
    unit: null,
    area_name: 'Kitchen With A Very Long Area Name',
  },
  {
    entity_id: 'sensor.power_meter',
    name: 'Power Meter With An Extremely Long Friendly Name',
    domain: 'sensor',
    icon: null,
    state: '12345678901234567890',
    unit: 'W',
    area_name: 'Kitchen With A Very Long Area Name',
  },
];

describe('area view', () => {
  it('uses overflow-safe grids and entity values', () => {
    const html = buildAreaHTML('Kitchen With A Very Long Area Name', entities, hass);

    expect(html).toContain('grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))');
    expect(html).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(html).not.toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(html).toContain('min-width: 0');
    expect(html).toContain('overflow-wrap: anywhere');
    expect(html).toContain('flex: 0 1 45%');
    expect(html).toContain('text-overflow: ellipsis');
  });

  it('marks only controllable default cards as toggle buttons', () => {
    const html = buildAreaHTML('Kitchen With A Very Long Area Name', entities, hass);

    expect(html).toContain('data-entity="light.kitchen_counter" data-action="toggle" role="button" tabindex="0" aria-pressed="true"');
    expect(html).toContain('data-entity="sensor.power_meter"');
    expect(html).not.toContain('data-entity="sensor.power_meter" data-action="toggle"');
    expect(html).toContain('.ec[role="button"]:focus-visible');
  });
});
