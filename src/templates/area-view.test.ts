import { describe, expect, it } from 'vitest';
import type { EntityInfo, Hass, StrategyConfig } from '../types';
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
    'sensor.kitchen_temperature': {
      entity_id: 'sensor.kitchen_temperature',
      state: '72',
      attributes: {
        friendly_name: 'Kitchen Temperature',
        device_class: 'temperature',
        unit_of_measurement: '°F',
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
  {
    entity_id: 'sensor.kitchen_temperature',
    name: 'Kitchen Temperature',
    domain: 'sensor',
    icon: null,
    state: '72',
    unit: '°F',
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
    expect(html).toContain('background: var(--hdp-surface-card, var(--hdp-card-bg));');
    expect(html).not.toContain('background: var(--hdp-surface-card, white);');
    expect(html).toContain('box-shadow: var(--hdp-shadow-card, 0 1px 3px rgba(0,0,0,0.15));');
    expect(html).toContain('22.2°C');
    expect(html).not.toContain('72°F');
  });

  it('marks only controllable default cards as toggle buttons', () => {
    const html = buildAreaHTML('Kitchen With A Very Long Area Name', entities, hass);

    expect(html).toContain('data-entity="light.kitchen_counter" data-action="toggle" role="button" tabindex="0" aria-pressed="true"');
    expect(html).toContain('data-entity="sensor.power_meter"');
    expect(html).not.toContain('data-entity="sensor.power_meter" data-action="toggle"');
    expect(html).toContain('.ec[role="button"]:focus-visible');
  });

  it('lets area domain slots replace default domain sections', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'area.domain.light': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <div class="custom-area-light" data-view="area" data-action="toggle">Area Light Slot</div>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };

    const html = buildAreaHTML('Kitchen With A Very Long Area Name', entities, hass, undefined, undefined, config);
    expect(html).toContain('Area Light Slot');
    expect(html).toContain('data-card-slot="area.domain.light"');
    expect(html).toContain('data-card-custom="true"');
    expect(html).not.toContain('Kitchen Counter');
    expect(html).toContain('Power Meter With An Extremely Long Friendly Name');
  });

  it('lets entity domain slots replace area entity cards', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'entity.domain.sensor': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <button class="custom-sensor" data-entity="sensor.power_meter" data-action="more-info">Sensor Slot</button>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };

    const html = buildAreaHTML('Kitchen With A Very Long Area Name', entities, hass, undefined, undefined, config);
    expect(html).toContain('Sensor Slot');
    expect(html).toContain('data-card-slot="entity.domain.sensor"');
    expect(html).toContain('data-card-custom="true"');
    expect(html).not.toContain('Power Meter With An Extremely Long Friendly Name');
  });
});
