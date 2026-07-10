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

const coverEntity: EntityInfo = {
  entity_id: 'cover.bedroom_curtain',
  name: 'Bedroom Curtain',
  domain: 'cover',
  icon: null,
  state: 'open',
  unit: null,
  area_name: 'Bedroom',
};

const coverState: HassEntity = {
  entity_id: 'cover.bedroom_curtain',
  state: 'open',
  attributes: {
    current_position: 68,
  },
  last_changed: '',
  last_updated: '',
};

describe('domain entity cards', () => {
  it('renders climate controls as declarative buttons', () => {
    const html = buildDomainCard(climateEntity, climateState);

    expect(html).toContain('data-no-toggle');
    expect(html).toContain('dc-control-card dc-climate');
    expect(html).toContain('dc-control-head');
    expect(html).toContain('目标温度');
    expect(html).toContain('运行模式');
    expect(html).toContain('风速');
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
    expect(html).toContain('data-min-temp="16"');
    expect(html).toContain('data-max-temp="30"');
    expect(html).not.toContain('onclick="hdpSetClimate');
    expect(html).not.toContain('<div class="' + 'dc-climate-temp-btn"');
  });

  it('normalizes string climate attributes from Home Assistant', () => {
    const html = buildDomainCard(climateEntity, {
      ...climateState,
      state: 'unavailable',
      attributes: {
        current_temperature: '24.2',
        temperature: '23',
        hvac_modes: ['off', 'cool', 'heat'],
        fan_modes: 'auto',
        target_temp_step: '1',
        min_temp: '18',
        max_temp: '28',
      },
    } as unknown as HassEntity);

    expect(html).toContain('24.2°C');
    expect(html).toContain('23°C');
    expect(html).toContain('18°C - 28°C');
    expect(html).toContain('data-step="-1"');
    expect(html).toContain('data-step="1"');
    expect(html).toContain('不可用');
    expect(html).toContain('dvc-ico dvc-ico--off');
    expect(html).not.toContain('dc-climate-fan-btn');
  });

  it('normalizes climate card temperatures to Celsius for display', () => {
    const html = buildDomainCard(climateEntity, {
      ...climateState,
      attributes: {
        current_temperature: 72,
        temperature: 70,
        temperature_unit: '°F',
        hvac_modes: ['off', 'cool', 'heat'],
        target_temp_step: 1,
        min_temp: 60,
        max_temp: 86,
      },
    } as unknown as HassEntity);

    expect(html).toContain('22.2°C');
    expect(html).toContain('21.1°C');
    expect(html).toContain('15.6°C - 30°C');
    expect(html).toContain('data-min-temp="60"');
    expect(html).toContain('data-max-temp="86"');
    expect(html).not.toContain('72&deg;');
  });

  it('renders cover controls as delegated service buttons', () => {
    const html = buildDomainCard(coverEntity, coverState);

    expect(html).toContain('data-no-toggle');
    expect(html).toContain('dc-control-card dc-cover');
    expect(html).toContain('dc-cover-visual');
    expect(html).toContain('dc-cover-curtain');
    expect(html).toContain('开合 68%');
    expect(html).toContain('已打开');
    expect(html).toContain('class="dc-cover-slider"');
    expect(html).toContain('data-action="cover-position"');
    expect(html).toContain('value="68"');
    expect(html).toContain('aria-label="设置 Bedroom Curtain 位置"');
    expect(html).toContain('data-action="cover-open"');
    expect(html).toContain('data-action="cover-stop"');
    expect(html).toContain('data-action="cover-close"');
    expect(html).toContain('data-entity="cover.bedroom_curtain"');
    expect(html).toContain('aria-label="打开 Bedroom Curtain"');
    expect(html).toContain('aria-label="停止 Bedroom Curtain"');
    expect(html).toContain('aria-label="关闭 Bedroom Curtain"');
    expect(html).not.toContain('onclick="hdpCoverAction');
  });

  it('normalizes domain-card button appearance', () => {
    const css = getDomainCardCSS();

    expect(css).toContain('.dvc button');
    expect(css).toContain('appearance: none;');
    expect(css).toContain('.dvc {');
    expect(css).toContain('.dc-control-card');
    expect(css).toContain('background: var(--hdp-surface-card, var(--hdp-card-bg));');
    expect(css).toContain('.dc-control-section');
    expect(css).toContain('background: var(--hdp-surface-muted');
    expect(css).toContain('background: var(--hdp-control-bg');
    expect(css).toContain('background: var(--hdp-control-bg-hover');
    expect(css).toContain('.dc-climate-mode');
    expect(css).toContain('.dc-cover-visual');
    expect(css).toContain('.dc-cover-slider');
    expect(css).toContain('.dc-cover-btn--stop');
    expect(css).toContain('.dc-lock-btn');
    expect(css).toContain('border: 1px solid transparent;');
    expect(css).toContain('color: var(--hdp-text-inverse, white);');
    expect(css).toContain('border: 2px solid var(--hdp-surface-card, white);');
    expect(css).toContain('box-shadow: var(--hdp-shadow-card, 0 1px 4px rgba(0,0,0,0.2));');
    expect(css).toContain('.dc-media-btn');
    expect(css).toContain('.dc-vacuum-btn');
    expect(css).toContain('text-align: center;');
    expect(css).toContain('.dvc[data-no-toggle]');
  });
});
