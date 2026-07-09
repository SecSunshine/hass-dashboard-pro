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
    expect(card.content).toContain('id="bp-import-modal"');
    expect(card.content).toContain('window.hdpBlueprintSave');
    expect(card.content).toContain('window.hdpShowImportModal');
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
      settingsHTML: 'SECRET_SETTINGS_HTML',
      settingsJS: 'SECRET_SETTINGS_JS',
      areaSummaries: [],
      blueprintPages: [],
    });

    expect(card.content).not.toContain('data-view="settings" data-action="show-view"');
    expect(card.content).not.toContain('<div class="hdp-view" data-view="settings"');
    expect(card.content).not.toContain('SECRET_SETTINGS_HTML');
    expect(card.content).not.toContain('SECRET_SETTINGS_JS');
    expect(card.content).not.toContain('id="bp-import-modal"');
    expect(card.content).not.toContain('window.hdpBlueprintSave');
    expect(card.content).not.toContain('window.hdpShowImportModal');
    expect(card.content).not.toContain('window.hdpOpenStudio');
    expect(card.content).not.toContain('id="hdp-studio-overlay"');
  });

  it('uses safe view arguments for area navigation', () => {
    const areaId = "kitchen'bad";
    const card = buildLayoutCard({
      hass: {
        ...hass,
        areas: {
          [areaId]: { area_id: areaId, name: 'Kitchen', picture: null },
        },
      },
      config: { type: 'custom:hass-dashboard-pro' },
      homeHTML: '',
      areaSections: [{ area_id: areaId, area_name: 'Kitchen', html: '' }],
      devicesHTML: '',
      settingsHTML: '',
      areaSummaries: [{
        area_id: areaId,
        area_name: 'Kitchen',
        icon: 'mdi:home-outline',
        entity_count: 0,
        active_count: 0,
        temp: null,
        humidity: null,
        domain_counts: {},
      }],
      blueprintPages: [],
    });

    expect(card.content).toContain('onclick="hdpShowView(&quot;kitchen&#39;bad&quot;)"');
    expect(card.content).not.toContain("hdpShowView('kitchen'bad')");
    expect(card.content).toContain('function findView(viewId)');
  });

  it('applies the selected home layout preset to the home content grid', () => {
    const card = buildLayoutCard({
      hass,
      config: {
        type: 'custom:hass-dashboard-pro',
        hdp_config: {
          home: { layout_preset: 'l_shape' },
        } as any,
      },
      homeHTML: '',
      areaSections: [],
      devicesHTML: '',
      settingsHTML: '',
      areaSummaries: [],
      blueprintPages: [],
    });

    expect(card.content).toContain('class="hdp-home-content hdp-home-content--l_shape"');
    expect(card.content).toContain('data-layout-preset="l_shape"');
  });

  it('uses the configurable sidebar avatar to toggle dashboard fullscreen', () => {
    const card = buildLayoutCard({
      hass: {
        ...hass,
        user: { name: 'Alice Admin', is_admin: true },
      },
      config: {
        type: 'custom:hass-dashboard-pro',
        hdp_config: {
          dashboard: { name: 'Home', icon: 'mdi:home', avatar_url: '/local/avatar.png' },
        } as any,
      },
      homeHTML: '',
      areaSections: [],
      devicesHTML: '',
      settingsHTML: '',
      areaSummaries: [],
      blueprintPages: [],
    });

    expect(card.content).toContain('class="sb-profile-btn"');
    expect(card.content).toContain('src="/local/avatar.png"');
    expect(card.content).toContain('data-action="toggle-dashboard-fullscreen"');
    expect(card.content).toContain('onclick="hdpToggleDashboardFullscreen()"');
    expect(card.content).toContain('window.hdpToggleDashboardFullscreen = function()');
    expect(card.content).toContain('.hdp-root--fullscreen');
    expect(card.content).not.toContain('id="hdp-avatar-overlay"');
    expect(card.content).not.toContain('hdpOpenAvatarOverlay');
    expect(card.content).toContain('Alice Admin');
  });

  it('falls back to user initials and rejects unsafe avatar URLs', () => {
    const card = buildLayoutCard({
      hass: {
        ...hass,
        user: { name: 'Bob Builder', is_admin: true },
      },
      config: {
        type: 'custom:hass-dashboard-pro',
        hdp_config: {
          dashboard: { name: 'Home', icon: 'mdi:home', avatar_url: 'javascript:alert(1)' },
        } as any,
      },
      homeHTML: '',
      areaSections: [],
      devicesHTML: '',
      settingsHTML: '',
      areaSummaries: [],
      blueprintPages: [],
    });

    expect(card.content).toContain('<span class="sb-avatar">BB</span>');
    expect(card.content).not.toContain('javascript:alert');
  });
});
