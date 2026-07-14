import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { buildHomeHTML } from './home-view';

const hass: Hass = {
  states: {
    'person.alice': {
      entity_id: 'person.alice',
      state: 'home',
      attributes: { friendly_name: 'Alice' },
      last_changed: '',
      last_updated: '',
    },
    'person.bob': {
      entity_id: 'person.bob',
      state: 'not_home',
      attributes: { friendly_name: 'Bob' },
      last_changed: '',
      last_updated: '',
    },
    'light.kitchen': {
      entity_id: 'light.kitchen',
      state: 'on',
      attributes: { friendly_name: 'Kitchen Light' },
      last_changed: '',
      last_updated: '',
    },
    'weather.home': {
      entity_id: 'weather.home',
      state: 'sunny',
      attributes: { temperature: 24 },
      last_changed: '',
      last_updated: '',
    },
    'alarm_control_panel.home': {
      entity_id: 'alarm_control_panel.home',
      state: 'armed_home',
      attributes: {},
      last_changed: '',
      last_updated: '',
    },
  },
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen', picture: null },
  },
  devices: {},
  floors: {},
  entities: {
    'light.kitchen': {
      entity_id: 'light.kitchen',
      device_id: null,
      area_id: 'kitchen',
      platform: 'demo',
      disabled_by: null,
      hidden_by: null,
    },
  },
  user: { name: 'Demo' },
};

describe('home view settings', () => {
  it('honors hdp_config hidden home sections', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        home: { hidden_sections: ['status_badges', 'people', 'summary'] },
      } as any,
    };

    const html = buildHomeHTML(hass, config);
    expect(html).not.toContain('<div class="sd-wrap">');
    expect(html).not.toContain('<div class="pp-grid">');
    expect(html).not.toContain('<div class="sum-grid">');
  });

  it('honors hdp_config hidden summary info cards', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        home: { hidden_info_cards: ['entities'] },
      } as any,
    };

    const html = buildHomeHTML(hass, config);
    expect(html).toContain('<div class="sum-grid">');
    expect(html).not.toContain('data-info-card="entities"');
  });

  it('allows one summary statistic to be customized independently', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'home.summary.entities': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <div class="custom-entity-summary" data-view="home">实体自定义</div>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };
    const html = buildHomeHTML(hass, config);

    expect(html).toContain('data-card-slot="home.summary.entities" data-card-custom="true"');
    expect(html).toContain('实体自定义');
    expect(html).toContain('data-card-slot="home.summary.devices"');
    expect(html).toContain('data-info-card="devices"');
  });

  it('honors configured home section order and appends omitted defaults', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        home: { section_order: ['summary', 'people', 'status_badges'] },
      } as any,
    };

    const html = buildHomeHTML(hass, config);
    const summaryIndex = html.indexOf('<div class="sum-grid">');
    const peopleIndex = html.indexOf('<div class="pp-grid">');
    const statusIndex = html.indexOf('<div class="sd-wrap">');
    const environmentIndex = html.indexOf('<div class="env-grid">');

    expect(summaryIndex).toBeGreaterThan(-1);
    expect(peopleIndex).toBeGreaterThan(summaryIndex);
    expect(statusIndex).toBeGreaterThan(peopleIndex);
    expect(environmentIndex).toBeGreaterThan(statusIndex);
  });

  it('ignores invalid configured home section order keys', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        home: { section_order: ['summary', 'bad_key', 'people'] },
      } as any,
    };

    const html = buildHomeHTML(hass, config);
    const summaryIndex = html.indexOf('<div class="sum-grid">');
    const peopleIndex = html.indexOf('<div class="pp-grid">');
    const statusIndex = html.indexOf('<div class="sd-wrap">');

    expect(summaryIndex).toBeGreaterThan(-1);
    expect(peopleIndex).toBeGreaterThan(summaryIndex);
    expect(statusIndex).toBeGreaterThan(peopleIndex);
    expect(html).not.toContain('bad_key');
  });

  it('renders status badges as device-domain navigation buttons', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildHomeHTML(hass, config);

    expect(html).toContain('<button type="button" class="sd-badge');
    expect(html).toContain('data-action="show-device-domain"');
    expect(html).toContain('data-domain="light"');
    expect(html).not.toContain('onclick="hdpShowDeviceDomain');
    expect(html).toContain('cursor: pointer;');
    expect(html).toContain('.sd-badge:hover');
    expect(html).toContain('background: var(--hdp-surface-raised, var(--hdp-card-bg));');
    expect(html).toContain('color: var(--hdp-text-inverse, var(--primary-background-color, Canvas));');
    expect(html).not.toContain('color: white;');
    expect(html).not.toContain('<div class="sd-badge');
  });

  it('allows one status badge to be customized independently', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'home.status_badges.light': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <div class="custom-light-badge" data-action="show-device-domain" data-domain="light">灯光自定义</div>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };
    const html = buildHomeHTML(hass, config);

    expect(html).toContain('data-card-slot="home.status_badges.light" data-card-custom="true"');
    expect(html).toContain('灯光自定义');
    expect(html).toContain('data-card-slot="home.status_badges"');
  });

  it('renders environment metrics as 24-hour history buttons', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildHomeHTML({
      ...hass,
      states: {
        ...hass.states,
        'sensor.living_temperature': {
          entity_id: 'sensor.living_temperature',
          state: '23.5',
          attributes: { friendly_name: 'Living Temperature', device_class: 'temperature', unit_of_measurement: '°C' },
          last_changed: '',
          last_updated: '',
        },
        'sensor.living_humidity': {
          entity_id: 'sensor.living_humidity',
          state: '58',
          attributes: { friendly_name: 'Living Humidity', device_class: 'humidity', unit_of_measurement: '%' },
          last_changed: '',
          last_updated: '',
        },
      },
    }, config);

    expect(html).toContain('data-action="show-environment-history" data-metric="temperature"');
    expect(html).not.toContain('onclick="hdpShowEnvironmentHistory');
    expect(html).toContain('data-action="show-environment-history" data-metric="humidity"');
    expect(html).not.toContain('onclick="hdpShowEnvironmentHistory');
    expect(html).toContain('data-card-slot="home.environment.temperature"');
    expect(html).toContain('data-card-slot="home.environment.humidity"');
  });

  it('replaces one environment metric without replacing its sibling cards', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'home.environment.temperature': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <div class="custom-temperature" data-view="home">温度自定义</div>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };
    const html = buildHomeHTML({
      ...hass,
      states: {
        ...hass.states,
        'sensor.living_temperature': {
          entity_id: 'sensor.living_temperature',
          state: '23.5',
          attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
          last_changed: '',
          last_updated: '',
        },
        'sensor.living_humidity': {
          entity_id: 'sensor.living_humidity',
          state: '58',
          attributes: { device_class: 'humidity', unit_of_measurement: '%' },
          last_changed: '',
          last_updated: '',
        },
      },
    }, config);

    expect(html).toContain('温度自定义');
    expect(html).toContain('data-card-slot="home.environment.temperature" data-card-custom="true"');
    expect(html).toContain('data-card-slot="home.environment.humidity"');
    expect(html).toContain('data-metric="humidity"');
  });

  it('keeps environment info cards structurally valid and visually aligned', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildHomeHTML(hass, config);
    const securityIconIndex = html.indexOf('<div class="env-icon env-icon--sec">');
    const securityChunk = html.slice(securityIconIndex, securityIconIndex + 420);

    expect(securityIconIndex).toBeGreaterThan(-1);
    expect(securityChunk).toContain('</div>');
    expect(securityChunk).not.toContain('</button>');
    expect(html).toContain('data-card-slot="home.environment.security"');
    expect(html).toContain('background: var(--hdp-surface-card, var(--hdp-card-bg));');
    expect(html).toContain('button.env-item:hover');
    expect(html).toContain('background: var(--hdp-surface-raised, var(--hdp-card-bg));');
  });

  it('keeps favorite and summary cards on themed surfaces', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      favorite_entities: ['light.kitchen'],
    };
    const html = buildHomeHTML(hass, config);

    expect(html).toContain('.fav-item {');
    expect(html).toContain('.sum-item {');
    expect(html).toContain('background: var(--hdp-surface-card, var(--hdp-card-bg));');
    expect(html).toContain('background: var(--hdp-surface-raised, var(--hdp-card-bg));');
    expect(html).toContain('background: var(--hdp-surface-muted, var(--hdp-card-bg));');
    expect(html).toContain('background: var(--hdp-surface-muted, var(--hdp-divider));');
  });

  it('uses topology layout presets for home section ordering and sizing', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        home: { layout_preset: 'rows' },
      } as any,
    };
    const html = buildHomeHTML(hass, config);

    expect(html).toContain('hdp-bento hdp-bento--wide');
    expect(html).not.toContain('layout_preset');
  });

  it('keeps people names from forcing narrow layouts', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildHomeHTML(hass, config);

    expect(html).toContain(`.pp-grid {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    min-width: 0;`);
    expect(html).toContain(`.pp-item {
    display: flex;
    flex: 1 1 64px;
    max-width: 96px;`);
    expect(html).toContain(`.pp-name {
    font: inherit;`);
    expect(html).toContain(`display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;`);
    expect(html).toContain(`white-space: normal;
    overflow-wrap: anywhere;`);
    expect(html).not.toContain(`.pp-name {
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    color: var(--hdp-text);
    max-width: 72px;`);
  });
  it('honors hdp_config hidden persons', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        people: { hidden_persons: ['person.bob'] },
      } as any,
    };

    const html = buildHomeHTML(hass, config);
    expect(html).toContain('Alice');
    expect(html).not.toContain('Bob');
  });

  it('honors legacy hidden persons when no nested people config exists', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hidden_persons: ['person.bob'],
    };

    const html = buildHomeHTML(hass, config);
    expect(html).toContain('Alice');
    expect(html).not.toContain('Bob');
  });

  it('lets nested people config restore legacy hidden persons', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hidden_persons: ['person.bob'],
      hdp_config: {
        people: { hidden_persons: [] },
      } as any,
    };

    const html = buildHomeHTML(hass, config);
    expect(html).toContain('Alice');
    expect(html).toContain('Bob');
  });

  it('honors header visibility toggles', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        header: {
          show_time: false,
          show_weather: false,
          show_notifications: false,
          weather_entity: 'weather.home',
          alarm_entity: 'alarm_control_panel.home',
        },
      } as any,
    };

    const html = buildHomeHTML(hass, config);
    expect(html).not.toContain('<span class="hw-date">');
    expect(html).not.toContain('<div class="hw-weather">');
    expect(html).not.toContain('<div class="hw-alarm');
  });

  it('allows welcome weather to be customized without replacing alarm status', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        header: { weather_entity: 'weather.home', alarm_entity: 'alarm_control_panel.home' },
        cards: { slots: {
          'home.welcome.weather': {
            yaml: [
              'type: custom:html-pro-card',
              'content: |',
              '  <button class="custom-weather" data-entity="$entity$" data-action="more-info">$name$ / $state$</button>',
            ].join('\n'),
          },
        } },
      } as any,
    };
    const html = buildHomeHTML(hass, config);

    expect(html).toContain('data-card-slot="home.welcome.weather" data-card-custom="true"');
    expect(html).toContain('class="custom-weather"');
    expect(html).toContain('data-entity="weather.home"');
    expect(html).toContain('24°C');
    expect(html).toContain('data-card-slot="home.welcome.alarm"');
    expect(html).toContain('class="hw-alarm');
  });

  it('sanitizes persisted card skin classes', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildHomeHTML(hass, config, { card_style: 'bad" onclick="evil()' } as any);

    expect(html).toContain('hdp-card--classic');
    expect(html).not.toContain('onclick="evil()');
  });

  it('marks active favorites with the class used by the active border style', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      favorite_entities: ['light.kitchen'],
    };
    const html = buildHomeHTML(hass, config);

    expect(html).toContain('class="fav-item fav-item--active fav--active');
    expect(html).toContain('.fav-item--active');
  });

  it('allows one favorite entity to be customized independently', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      favorite_entities: ['light.kitchen'],
      hdp_config: {
        cards: {
          slots: {
            'home.favorites.light.kitchen': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <button class="custom-favorite" data-entity="$entity$" data-action="toggle">$name$ 自定义</button>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };
    const html = buildHomeHTML(hass, config);

    expect(html).toContain('data-card-slot="home.favorites.light.kitchen" data-card-custom="true"');
    expect(html).toContain('class="custom-favorite"');
    expect(html).toContain('data-entity="light.kitchen"');
    expect(html).toContain('Kitchen Light 自定义');
  });

  it('allows one person card to be customized independently', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'home.people.person.alice': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <button class="custom-person" data-entity="$entity$" data-action="more-info">$name$：$state$</button>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };
    const html = buildHomeHTML(hass, config);

    expect(html).toContain('data-card-slot="home.people.person.alice" data-card-custom="true"');
    expect(html).toContain('class="custom-person"');
    expect(html).toContain('data-entity="person.alice"');
    expect(html).toContain('Alice：home');
    expect(html).toContain('data-card-slot="home.people.person.bob"');
  });

  it('allows one area power row to be customized independently', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'home.power_usage.kitchen': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <div class="custom-power" data-view="area">$name$：$state$</div>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };
    const html = buildHomeHTML({
      ...hass,
      states: {
        ...hass.states,
        'sensor.kitchen_power': {
          entity_id: 'sensor.kitchen_power',
          state: '420',
          attributes: { friendly_name: 'Kitchen Power', device_class: 'power', unit_of_measurement: 'W' },
          last_changed: '',
          last_updated: '',
        },
        'sensor.living_power': {
          entity_id: 'sensor.living_power',
          state: '80',
          attributes: { friendly_name: 'Living Power', device_class: 'power', unit_of_measurement: 'W' },
          last_changed: '',
          last_updated: '',
        },
      },
      areas: {
        ...hass.areas,
        living: { area_id: 'living', name: 'Living', picture: null },
      },
      entities: {
        ...hass.entities,
        'sensor.kitchen_power': { entity_id: 'sensor.kitchen_power', device_id: null, area_id: 'kitchen', platform: 'demo', disabled_by: null, hidden_by: null },
        'sensor.living_power': { entity_id: 'sensor.living_power', device_id: null, area_id: 'living', platform: 'demo', disabled_by: null, hidden_by: null },
      },
    }, config);

    expect(html).toContain('data-card-slot="home.power_usage.kitchen" data-card-custom="true"');
    expect(html).toContain('class="custom-power"');
    expect(html).toContain('Kitchen：420 W');
    expect(html).toContain('data-card-slot="home.power_usage.living"');
  });

  it('renders automations summary as a configuration popup button', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildHomeHTML({
      ...hass,
      states: {
        ...hass.states,
        'automation.morning': {
          entity_id: 'automation.morning',
          state: 'on',
          attributes: { friendly_name: 'Morning' },
          last_changed: '',
          last_updated: '',
        },
      },
    }, config);

    expect(html).toContain('data-info-card="automations"');
    expect(html).toContain('data-action="open-automation-config"');
    expect(html).not.toContain('onclick="hdpOpenAutomationConfig()"');
    expect(html).toContain('<button type="button" class="env-item');
    expect(html).toContain('<div class="env-lbl">自动化运行</div>');
    expect(html).toContain('data-card-slot="home.environment.automations"');
  });

  it('keeps the automation configuration entry when every automation is disabled', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };
    const html = buildHomeHTML({
      ...hass,
      states: {
        ...hass.states,
        'automation.morning': {
          entity_id: 'automation.morning',
          state: 'off',
          attributes: { friendly_name: 'Morning' },
          last_changed: '',
          last_updated: '',
        },
      },
    }, config);

    expect(html).toContain('data-info-card="automations"');
    expect(html).toContain('data-action="open-automation-config"');
    expect(html).not.toContain('<div class="env-lbl">自动化运行</div>');
  });

  it('lets card slots replace, hide, resize and reorder home cards', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'home.summary': {
              order: -5,
              size: 'wide',
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <div class="custom-summary" data-view="home" data-action="inspect">Custom Summary</div>',
              ].join('\n'),
            },
            'home.people': { enabled: false },
          },
        },
      } as any,
    };

    const html = buildHomeHTML(hass, config);
    const customIndex = html.indexOf('Custom Summary');
    const statusIndex = html.indexOf('data-card-slot="home.status_badges"');

    expect(customIndex).toBeGreaterThan(-1);
    expect(statusIndex).toBeGreaterThan(-1);
    expect(customIndex).toBeLessThan(statusIndex);
    expect(html).toContain('hdp-bento hdp-bento--wide');
    expect(html).toContain('data-card-slot="home.summary"');
    expect(html).toContain('data-card-custom="true"');
    expect(html).not.toContain('data-card-slot="home.people"');
    expect(html).not.toContain('Bob');
  });

  it('renders saved standalone custom cards with their explicit grid span', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        home: { layout_preset: 'custom' },
        cards: { slots: {
          'home.custom.weather-wall': {
            order: -3,
            grid_columns: 3,
            grid_rows: 2,
            yaml: [
              'type: custom:html-pro-card',
              'content: |',
              '  <section class="weather-wall" data-view="home">Custom weather wall</section>',
            ].join('\n'),
          },
        } },
      } as any,
    };

    const html = buildHomeHTML(hass, config);

    expect(html).toContain('data-card-slot="home.custom.weather-wall" data-card-custom="true"');
    expect(html).toContain('Custom weather wall');
    expect(html).toContain('data-hdp-bento-custom="true"');
    expect(html).toContain('--hdp-bento-column-span: 3');
    expect(html).toContain('--hdp-bento-row-span: 2');
  });
});
