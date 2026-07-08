import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { buildDevicesHTML } from './devices-view';

const hass: Hass = {
  states: {
    'light.kitchen_counter': {
      entity_id: 'light.kitchen_counter',
      state: 'on',
      attributes: { friendly_name: 'Kitchen Counter Light With A Very Long Name' },
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
    'binary_sensor.kitchen_motion': {
      entity_id: 'binary_sensor.kitchen_motion',
      state: 'off',
      attributes: { friendly_name: 'Kitchen Motion', device_class: 'motion' },
      last_changed: '',
      last_updated: '',
    },
  },
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen With A Long Area Name', picture: null },
  },
  devices: {},
  floors: {},
  entities: {
    'light.kitchen_counter': {
      entity_id: 'light.kitchen_counter',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'sensor.power_meter': {
      entity_id: 'sensor.power_meter',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'binary_sensor.kitchen_motion': {
      entity_id: 'binary_sensor.kitchen_motion',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
  },
};

describe('devices view', () => {
  it('uses overflow-safe device grids and cards', () => {
    const html = buildDevicesHTML(hass, { type: 'custom:hass-dashboard-pro' });

    expect(html).toContain('grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))');
    expect(html).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(html).not.toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(html).toContain('.dv-grid');
    expect(html).toContain('min-width: 0');
    expect(html).toContain('flex: 0 1 45%');
    expect(html).toContain('overflow-wrap: anywhere');
    expect(html).toContain('<button type="button" class="dv-chip"');
    expect(html).toContain('data-action="scroll-domain"');
    expect(html).toContain('appearance: none;');
  });

  it('applies hidden areas to the all devices view', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        areas: { hidden_areas: ['kitchen'] },
      } as any,
    };
    const html = buildDevicesHTML(hass, config);

    expect(html).not.toContain('Kitchen Counter Light');
    expect(html).not.toContain('Power Meter With An Extremely Long Friendly Name');
    expect(html).not.toContain('Kitchen Motion');
    expect(html).toContain('dv-empty');
  });

  it('applies hidden domains and hidden device types', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        devices: {
          hidden_domains: ['light'],
          hidden_device_types: ['binary_sensor.motion'],
        },
      } as any,
    };
    const html = buildDevicesHTML(hass, config);

    expect(html).not.toContain('Kitchen Counter Light');
    expect(html).not.toContain('Kitchen Motion');
    expect(html).toContain('Power Meter With An Extremely Long Friendly Name');
  });

  it('marks only controllable default cards as toggle buttons', () => {
    const html = buildDevicesHTML(hass, { type: 'custom:hass-dashboard-pro' });

    expect(html).toContain('data-entity="light.kitchen_counter" data-action="toggle" role="button" tabindex="0" aria-pressed="true"');
    expect(html).toContain('data-entity="sensor.power_meter"');
    expect(html).not.toContain('data-entity="sensor.power_meter" data-action="toggle"');
    expect(html).toContain('.dvc[role="button"]:focus-visible');
  });
});
