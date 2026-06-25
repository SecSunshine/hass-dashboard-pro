/**
 * View Strategy — Per-View Content Generator
 *
 * Generates the card list for each view (home page, area page, settings).
 * The dashboard strategy injects `view_path` and `area_id` into each view's
 * strategy config, since HA does not pass view metadata to generate().
 *
 * All visual tokens are resolved from config + localStorage and passed
 * through to templates via CSS variables (generateDesignTokenCSS).
 */

import type { Hass, StrategyConfig, ViewStrategyResult, LovelaceCardConfig } from '../types';
import { buildAreaEntityMap } from '../utils/area-entities';
import { resolveTokens } from '../utils/visual-config';
import { buildHomeView } from '../templates/home-view';
import { buildAreaView } from '../templates/area-view';
import { buildSettingsView } from '../templates/settings-view';

export class HassDashboardProViewStrategy {
  static async generate(config: StrategyConfig, hass: Hass): Promise<ViewStrategyResult> {
    const tokens = resolveTokens(config);

    // Read view path from config (injected by dashboard strategy)
    const viewPath = config.view_path || null;
    const areaId = config.area_id || null;

    // Debug: log routing info to help diagnose view issues
    console.debug(
      '%c[HDPro View]%c path=%s area=%s keys=%s',
      'color: #4F6EF7; font-weight: bold;',
      'color: #64748B;',
      viewPath,
      areaId,
      Object.keys(config).join(','),
    );

    // Settings page
    if (viewPath === 'settings' || viewPath === 'hdp-settings') {
      return { cards: buildSettingsView(config, tokens) };
    }

    // Home view
    if (viewPath === 'home' || !viewPath) {
      return { cards: buildHomeView(hass, config, tokens) };
    }

    // Area view — use area_id directly (most reliable)
    const hiddenAreas = config.hidden_areas || [];
    if (areaId && !hiddenAreas.includes(areaId)) {
      const area = hass.areas[areaId];
      if (area) {
        const areaEntityMap = buildAreaEntityMap(hass, hiddenAreas);
        const entities = areaEntityMap.get(areaId) || [];
        return { cards: buildAreaView(area.name, entities, hass, tokens) };
      }
    }

    // Area view — fallback: match by view path
    const areaEntityMap = buildAreaEntityMap(hass, hiddenAreas);
    for (const [id, area] of Object.entries(hass.areas)) {
      if (hiddenAreas.includes(id)) continue;
      const path = area.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      if (path === viewPath || id === viewPath) {
        const entities = areaEntityMap.get(id) || [];
        return { cards: buildAreaView(area.name, entities, hass, tokens) };
      }
    }

    // Fallback
    return { cards: [] };
  }
}
