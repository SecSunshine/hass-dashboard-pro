import { describe, expect, it } from 'vitest';
import type { AreaSummary, Hass } from '../types';
import { buildSidebarHTML, getSidebarCSS } from './sidebar';

const hass: Hass = {
  states: {},
  areas: {},
  devices: {},
  floors: {},
  entities: {},
  user: { name: 'Alice <Admin>', is_admin: true },
};

const areas: AreaSummary[] = [{
  area_id: 'living',
  area_name: 'Living <Room>',
  icon: 'mdi:sofa',
  entity_count: 3,
  active_count: 1,
  temp: '23°C',
  humidity: null,
  domain_counts: {},
}];

describe('sidebar', () => {
  it('uses shared surface and control tokens for desktop navigation', () => {
    const css = getSidebarCSS();

    expect(css).toContain('background: color-mix(in srgb, var(--hdp-surface-card, var(--hdp-card-bg)) 94%, transparent);');
    expect(css).toContain('background: var(--hdp-control-bg, var(--hdp-surface-muted, var(--hdp-bg)));');
    expect(css).toContain('background: var(--hdp-control-bg-hover, var(--hdp-primary-light');
    expect(css).toContain('color: var(--hdp-text-inverse, #fff);');
    expect(css).toContain('box-shadow: var(--hdp-shadow-card, 0 2px 8px rgba(0,0,0,0.12));');
    expect(css).toContain('background: var(--hdp-control-bg-hover, var(--hdp-surface-muted, var(--hdp-divider)));');
    expect(css).toContain('border-color: color-mix(in srgb, var(--hdp-primary) 24%, var(--hdp-border));');
    expect(css).toContain('background: var(--hdp-surface-muted, var(--hdp-divider));');
    expect(css).toContain('.sb-profile-btn:focus-visible');
    expect(css).toContain('outline: 2px solid var(--hdp-primary);');
  });

  it('escapes user and area text while keeping fullscreen avatar action', () => {
    const html = buildSidebarHTML({
      title: 'Home <Title>',
      areas,
      hass,
      config: { type: 'custom:hass-dashboard-pro' },
      hiddenAreas: [],
    });

    expect(html).toContain('Home &lt;Title&gt;');
    expect(html).toContain('Alice &lt;Admin&gt;');
    expect(html).toContain('Living &lt;Room&gt;');
    expect(html).toContain('data-action="toggle-dashboard-fullscreen"');
    expect(html).not.toContain('Home <Title>');
    expect(html).not.toContain('Alice <Admin>');
    expect(html).not.toContain('Living <Room>');
  });
});
