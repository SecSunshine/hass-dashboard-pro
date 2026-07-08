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
});
