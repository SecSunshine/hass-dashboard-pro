/**
 * View Strategy v4.0 - Monolithic Layout Card Router
 *
 * Every top-level HA view renders the complete layout card so Home Assistant's
 * native tab bar and HDP's internal navigation open the same interface.
 */

import type { Hass, StrategyConfig, ViewStrategyResult, LovelaceCardConfig, EntityInfo } from '../types';
import { resolveTokens } from '../utils/visual-config';
import { buildHomeHTML } from '../templates/home-view';
import { buildAreaHTML } from '../templates/area-view';
import { buildDevicesHTML, generateDevicesJS } from '../templates/devices-view';
import { buildSettingsHTML, generateSettingsJS } from '../templates/settings-view';
import { buildBlueprintPagesHTML } from '../blueprints/blueprint-page';
import { buildLayoutCard } from '../layout/layout-card';
import { getEffectiveStrategyConfig } from '../utils/effective-config';
import {
  buildAreaEntityMapFromModel,
  buildAreaSummaries,
  collectVisibleEntities,
  getConfiguredAreaOrder,
  getConfiguredHiddenAreas,
  getDashboardFilters,
} from '../utils/dashboard-model';
import { shouldShowSettings } from '../utils/permissions';

export class HassDashboardProViewStrategy {
  static async generate(config: StrategyConfig, hass: Hass): Promise<ViewStrategyResult> {
    const effectiveConfig = getEffectiveStrategyConfig(config);
    const tokens = resolveTokens(effectiveConfig, hass);
    const viewPath = effectiveConfig.view_path || 'home';

    console.debug(
      '%c[HDPro View v4]%c path=%s',
      'color: #4F6EF7; font-weight: bold;',
      'color: #64748B;',
      viewPath,
    );

    const card = buildFullLayoutCard(hass, effectiveConfig, tokens, resolveInitialView(viewPath));
    return { cards: [card] };
  }
}

// ─── Build Complete Layout Card ─────────────────────────────────────────────

function resolveInitialView(viewPath: string): string {
  if (viewPath === 'hdp-settings') return 'settings';
  return viewPath || 'home';
}

function buildFullLayoutCard(
  hass: Hass,
  config: StrategyConfig,
  tokens: ReturnType<typeof resolveTokens>,
  initialView = 'home',
): LovelaceCardConfig {
  const visibleEntities = collectVisibleEntities(hass, getDashboardFilters(config));
  const areaEntityMap = buildAreaEntityMapFromModel(visibleEntities);
  const areaSummaries = buildAreaSummaries(
    hass,
    areaEntityMap,
    getConfiguredHiddenAreas(config),
    getConfiguredAreaOrder(config),
  );
  const blueprintPages = config.hdp_config?.blueprints?.pages || config.blueprint_pages || [];
  const canEditBlueprints = shouldShowSettings(hass, config);

  // 1. Home HTML
  const homeHTML = buildHomeHTML(hass, config, tokens);

  // 2. Area HTML sections - iterate filtered summaries so sidebar entries and
  // pre-rendered area views stay in sync after hidden domain/type filters.
  const areaSections: Array<{ area_id: string; area_name: string; html: string }> = [];
  for (const summary of areaSummaries) {
    const entities = areaEntityMap.get(summary.area_id) || [];
    areaSections.push({
      area_id: summary.area_id,
      area_name: summary.area_name,
      html: buildAreaHTML(summary.area_name, entities, hass, tokens, summary.area_id),
    });
  }

  // 3. Devices HTML + JS (JS must go in main script block — nested scripts don't execute)
  const devicesHTML = buildDevicesHTML(hass, config, tokens);
  const devicesJS = generateDevicesJS();

  // 4. Settings HTML + JS (JS must go in main script block — nested scripts don't execute)
  const settingsHTML = buildSettingsHTML(config, tokens, hass);
  const settingsJS = generateSettingsJS(config, tokens, hass);

  // 5. Blueprint page HTML
  const blueprintHTML = buildBlueprintPagesHTML(blueprintPages, canEditBlueprints);

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
    initialView,
  });
}
