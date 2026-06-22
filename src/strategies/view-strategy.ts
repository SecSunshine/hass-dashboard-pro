/**
 * View Strategy — Per-View Content Generator
 *
 * Generates the card list for each view (home page, area page, settings).
 * Uses the template layer to produce html-pro-card renderable content.
 *
 * All visual tokens are resolved from config + localStorage and passed
 * through to templates via CSS variables (generateDesignTokenCSS).
 */

import type { Hass, StrategyConfig, StrategyContext, ViewStrategyResult, LovelaceCardConfig } from '../types';
import { buildAreaEntityMap } from '../utils/area-entities';
import { resolveTokens } from '../utils/visual-config';
import { buildHomeView } from '../templates/home-view';
import { buildAreaView } from '../templates/area-view';
import { buildSettingsView } from '../templates/settings-view';

export class HassDashboardProViewStrategy {
  static async generate(context: StrategyContext): Promise<ViewStrategyResult> {
    const { config, hass } = context;
    const tokens = resolveTokens(config);

    // Determine which view we're generating
    const viewPath = getViewPath(context);

    // Settings page
    if (viewPath === 'settings' || viewPath === 'hdp-settings') {
      return { cards: buildSettingsView(config, tokens) };
    }

    // Home view
    if (viewPath === 'home' || !viewPath) {
      return { cards: buildHomeView(hass, config, tokens) };
    }

    // Area view
    const hiddenAreas = config.hidden_areas || [];
    const areaEntityMap = buildAreaEntityMap(hass, hiddenAreas);

    for (const [areaId, area] of Object.entries(hass.areas)) {
      if (hiddenAreas.includes(areaId)) continue;
      if (sanitizePath(area.name) === viewPath || areaId === viewPath) {
        const entities = areaEntityMap.get(areaId) || [];
        return { cards: buildAreaView(area.name, entities, hass, tokens) };
      }
    }

    // Fallback
    return { cards: [] };
  }
}

function getViewPath(context: StrategyContext): string | null {
  const { hass } = context;
  const anyHass = hass as unknown as Record<string, unknown>;

  if (anyHass._viewPath) return anyHass._viewPath as string;
  if ((anyHass.panel as Record<string, unknown>)?.path) return (anyHass.panel as Record<string, unknown>).path as string;

  try {
    const url = (anyHass._currentUrl as string) || '';
    const match = url.match(/\/([^/?]+)/);
    if (match && match[1] && match[1] !== 'lovelace') return match[1];
  } catch {
    // ignore
  }

  return null;
}

function sanitizePath(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
