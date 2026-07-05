import { describe, expect, it } from 'vitest';
import type { Hass, StrategyConfig } from '../types';
import { buildLayoutCard } from './layout-card';

const hass: Hass = {
  states: {},
  areas: {},
  devices: {},
  floors: {},
  entities: {},
};

describe('layout card', () => {
  it('uses the persisted dashboard name for the sidebar title', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      title: 'Fallback',
      hdp_config: {
        dashboard: { name: 'My <Home>', icon: 'mdi:home' },
      } as any,
    };

    const card = buildLayoutCard({
      hass,
      config,
      homeHTML: '',
      areaSections: [],
      devicesHTML: '',
      settingsHTML: '',
      areaSummaries: [],
      blueprintPages: [],
    });

    expect(card.content).toContain('<div class="sb-title">My &lt;Home&gt;</div>');
    expect(card.content).not.toContain('<div class="sb-title">Fallback</div>');
  });

  it('shows settings in mobile navigation when allowed', () => {
    const config: StrategyConfig = { type: 'custom:hass-dashboard-pro' };

    const card = buildLayoutCard({
      hass,
      config,
      homeHTML: '',
      areaSections: [],
      devicesHTML: '',
      settingsHTML: '',
      areaSummaries: [],
      blueprintPages: [],
    });

    expect(card.content).toContain('data-view="settings" data-action="show-view"');
    expect(card.content).toContain('<span>设置</span>');
  });

  it('hides settings in mobile navigation when restricted', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        permissions: { restrict_settings: true },
      } as any,
    };

    const card = buildLayoutCard({
      hass,
      config,
      homeHTML: '',
      areaSections: [],
      devicesHTML: '',
      settingsHTML: '',
      areaSummaries: [],
      blueprintPages: [],
    });

    expect(card.content).not.toContain('data-view="settings" data-action="show-view"');
  });
});
