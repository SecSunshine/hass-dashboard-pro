import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { buildDevicesHTML, generateDevicesJS } from './devices-view';

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
    'sensor.living_room_temperature': {
      entity_id: 'sensor.living_room_temperature',
      state: '72',
      attributes: {
        friendly_name: 'Living Room Temperature',
        device_class: 'temperature',
        unit_of_measurement: '\u00b0C',
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
    'switch.z_inactive': {
      entity_id: 'switch.z_inactive',
      state: 'off',
      attributes: { friendly_name: 'Z Inactive Switch' },
      last_changed: '',
      last_updated: '',
    },
    'switch.a_active': {
      entity_id: 'switch.a_active',
      state: 'on',
      attributes: { friendly_name: 'A Active Switch' },
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
    'sensor.living_room_temperature': {
      entity_id: 'sensor.living_room_temperature',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'switch.z_inactive': {
      entity_id: 'switch.z_inactive',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
    'switch.a_active': {
      entity_id: 'switch.a_active',
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
    expect(html).toContain('max-width: min(220px, 68vw)');
    expect(html).toContain(`.dv-chip-label {
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;`);
    expect(html).toContain('flex: 0 0 auto;');
    expect(html).toContain('data-action="scroll-domain"');
    expect(html).toContain('appearance: none;');
    expect(html).toContain('background: var(--hdp-surface-card, var(--hdp-card-bg));');
    expect(html).toContain('background: var(--hdp-surface-card, white);');
    expect(html).toContain('box-shadow: var(--hdp-shadow-card, 0 1px 3px rgba(0,0,0,0.15));');
  });

  it('generates status-badge navigation helpers for device domains', () => {
    const js = generateDevicesJS();

    expect(js).toContain('window.hdpShowDeviceDomain = function(domain)');
    expect(js).toContain("if (typeof window.hdpOpenDeviceDomainModal === 'function')");
    expect(js).toContain('window.hdpOpenDeviceDomainModal(domain);');
    expect(js).toContain("window.hdpShowView('devices')");
    expect(js).toContain('window.hdpScrollToDomain(domain)');
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

  it('normalizes mislabeled Fahrenheit temperature sensors to Celsius', () => {
    const html = buildDevicesHTML(hass, { type: 'custom:hass-dashboard-pro' });

    expect(html).toContain('22.2\u00b0C');
    expect(html).not.toContain('72 \u00b0C');
  });

  it('sorts running devices before inactive devices within a domain', () => {
    const html = buildDevicesHTML(hass, { type: 'custom:hass-dashboard-pro' });

    expect(html.indexOf('A Active Switch')).toBeGreaterThan(-1);
    expect(html.indexOf('Z Inactive Switch')).toBeGreaterThan(-1);
    expect(html.indexOf('A Active Switch')).toBeLessThan(html.indexOf('Z Inactive Switch'));
  });

  it('lets device domain slots replace default domain sections', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'device.domain.light': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <div class="custom-device-light" data-view="devices" data-action="toggle">Device Light Slot</div>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };

    const html = buildDevicesHTML(hass, config);
    expect(html).toContain('Device Light Slot');
    expect(html).toContain('data-card-slot="device.domain.light"');
    expect(html).toContain('data-card-custom="true"');
    expect(html).not.toContain('Kitchen Counter Light With A Very Long Name');
  });

  it('lets entity domain slots replace default device entity cards', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'entity.domain.sensor': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <button class="custom-device-sensor" data-entity="sensor.power_meter" data-action="more-info">Device Sensor Slot</button>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };

    const html = buildDevicesHTML(hass, config);
    expect(html).toContain('Device Sensor Slot');
    expect(html).toContain('data-card-slot="entity.domain.sensor"');
    expect(html).toContain('data-card-custom="true"');
    expect(html).not.toContain('Power Meter With An Extremely Long Friendly Name');
  });
});
