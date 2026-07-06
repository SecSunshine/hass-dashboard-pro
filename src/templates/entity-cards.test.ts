import { describe, expect, it } from 'vitest';
import type { EntityInfo, HassEntity } from '../types';
import { buildDomainCard, getDomainCardCSS } from './entity-cards';

const climateEntity: EntityInfo = {
  entity_id: 'climate.living_room',
  name: 'Living Room AC',
  domain: 'climate',
  icon: null,
  state: 'cool',
  unit: null,
  area_name: 'Living Room',
};

const climateState: HassEntity = {
  entity_id: 'climate.living_room',
  state: 'cool',
  attributes: {
    current_temperature: 24.2,
    temperature: 23,
    hvac_modes: ['off', 'cool', 'heat'],
    fan_modes: ['auto', 'high'],
    fan_mode: 'auto',
    target_temp_step: 0.5,
    min_temp: 16,
    max_temp: 30,
  },
  last_changed: '',
  last_updated: '',
};

describe('domain entity cards', () => {
  it('renders climate controls as declarative buttons', () => {
    const html = buildDomainCard(climateEntity, climateState);

    expect(html).toContain('data-no-toggle');
    expect(html).toContain('<button type="button" class="dc-climate-mode');
    expect(html).toContain('data-entity="climate.living_room"');
    expect(html).toContain('data-action="climate-mode"');
    expect(html).toContain('data-mode="cool"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('<button type="button" class="dc-climate-fan-btn');
    expect(html).toContain('data-action="climate-fan"');
    expect(html).toContain('data-fan-mode="auto"');
    expect(html).toContain('aria-label="Decrease target temperature"');
    expect(html).toContain('aria-label="Increase target temperature"');
    expect(html).toContain('data-step="-0.5"');
    expect(html).toContain('data-step="0.5"');
    expect(html).not.toContain('<div class="' + 'dc-climate-temp-btn"');
  });

  it('normalizes domain-card button appearance', () => {
    const css = getDomainCardCSS();

    expect(css).toContain('.dvc button');
    expect(css).toContain('appearance: none;');
    expect(css).toContain('.dc-climate-mode');
    expect(css).toContain('text-align: center;');
  });
});
