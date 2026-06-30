/**
 * View Strategy v4.0 — Monolithic Layout Card Router
 *
 * The home view generates the complete layout card containing:
 *   - Sidebar with area navigation
 *   - All content sections (home, devices, areas, blueprints, settings)
 *   - Client-side navigation script
 *
 * All other HA views (devices, blueprint pages, settings) return empty cards
 * because the home view's layout card handles all navigation client-side.
 * Users interact with the sidebar/bottom-nav, never with HA's tab bar.
 */

import type { Hass, StrategyConfig, ViewStrategyResult, LovelaceCardConfig, EntityInfo } from '../types';
import { buildAreaEntityMap } from '../utils/area-entities';
import { resolveTokens } from '../utils/visual-config';
import { buildHomeHTML } from '../templates/home-view';
import { buildAreaHTML } from '../templates/area-view';
import { buildDevicesHTML, generateDevicesJS } from '../templates/devices-view';
import { buildSettingsHTML, generateSettingsJS } from '../templates/settings-view';
import { buildBlueprintPagesHTML } from '../blueprints/blueprint-page';
import { buildLayoutCard } from '../layout/layout-card';

export class HassDashboardProViewStrategy {
  static async generate(config: StrategyConfig, hass: Hass): Promise<ViewStrategyResult> {
    const tokens = resolveTokens(config);
    const viewPath = config.view_path || 'home';

    console.debug(
      '%c[HDPro View v4]%c path=%s',
      'color: #4F6EF7; font-weight: bold;',
      'color: #64748B;',
      viewPath,
    );

    // Home view → build the full monolithic layout card
    if (viewPath === 'home') {
      const card = buildFullLayoutCard(hass, config, tokens);
      return { cards: [card] };
    }

    // All other views return empty — the home view's layout card handles
    // client-side navigation (sidebar clicks, bottom nav, URL params)
    return { cards: [] };
  }
}

// ─── Build Complete Layout Card ─────────────────────────────────────────────

function buildFullLayoutCard(hass: Hass, config: StrategyConfig, tokens: ReturnType<typeof resolveTokens>): LovelaceCardConfig {
  const hiddenAreas = config.hidden_areas || [];
  const areaEntityMap = buildAreaEntityMap(hass, hiddenAreas);
  const areaSummaries = config.area_summaries || [];
  const blueprintPages = config.blueprint_pages || [];

  // 1. Home HTML
  const homeHTML = buildHomeHTML(hass, config, tokens);

  // 2. Area HTML sections — iterate areaSummaries so ALL visible areas get a view,
  // even those with no entities (otherwise sidebar clicks fall back to home)
  const areaSections: Array<{ area_id: string; area_name: string; html: string }> = [];
  for (const summary of areaSummaries) {
    const entities = areaEntityMap.get(summary.area_id) || [];
    areaSections.push({
      area_id: summary.area_id,
      area_name: summary.area_name,
      html: buildAreaHTML(summary.area_name, entities, hass, tokens),
    });
  }

  // 3. Devices HTML + JS (JS must go in main script block — nested scripts don't execute)
  const devicesHTML = buildDevicesHTML(hass, config, tokens);
  const devicesJS = generateDevicesJS();

  // 4. Settings HTML + JS (JS must go in main script block — nested scripts don't execute)
  const settingsHTML = buildSettingsHTML(config, tokens, hass);
  const settingsJS = generateSettingsJS(config, tokens);

  // 5. Blueprint page HTML
  const blueprintHTML = buildBlueprintPagesHTML(blueprintPages);

  return buildLayoutCard({
    hass,
    config,
    tokens,
    homeHTML,
    areaSections,
    devicesHTML,
    devicesJS,
    settingsHTML,
    settingsJS,
    areaSummaries,
    blueprintPages,
    blueprintHTML,
  });
}
