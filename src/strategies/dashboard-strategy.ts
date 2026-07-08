/**
 * Dashboard Strategy v4.0 — Top-Level
 *
 * Generates the view list:
 *   1. Home view (panel: true, contains layout card with sidebar + all areas)
 *   2. Devices view
 *   3. Blueprint page views (0..N)
 *   4. Settings view
 *
 * Areas are NOT separate views — they are pre-rendered into the layout card.
 */

import type { Hass, StrategyConfig, DashboardStrategyResult, LovelaceViewConfig, BlueprintInstance } from '../types';
import { safeBlueprintViewId } from '../utils/dom-id';
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

const VIEW_STRATEGY_TYPE = 'custom:hass-dashboard-pro-view';

export class HassDashboardProStrategy {
  static async generate(config: StrategyConfig, hass: Hass): Promise<DashboardStrategyResult> {
    const effectiveConfig = getEffectiveStrategyConfig(config);
    const hiddenAreas = getConfiguredHiddenAreas(effectiveConfig);
    const areaOrder = getConfiguredAreaOrder(effectiveConfig);
    const visibleEntities = collectVisibleEntities(hass, getDashboardFilters(effectiveConfig));
    const areaEntityMap = buildAreaEntityMapFromModel(visibleEntities);

    // Pre-compute area summaries (for sidebar display)
    const areaSummaries = buildAreaSummaries(hass, areaEntityMap, hiddenAreas, areaOrder);

    // Inject pre-computed data into config for the view strategy
    const enrichedConfig: StrategyConfig = {
      ...effectiveConfig,
      area_summaries: areaSummaries,
    };

    const views: LovelaceViewConfig[] = [];

    // 1. Home View (panel: true — takes full width for sidebar layout)
    views.push({
      title: effectiveConfig.hdp_config?.dashboard?.name || effectiveConfig.title || '首页',
      path: 'home',
      icon: 'mdi:home',
      badges: [],
      cards: [],
      panel: true,
      strategy: {
        ...enrichedConfig,
        type: VIEW_STRATEGY_TYPE,
        view_path: 'home',
      } as StrategyConfig,
      subview: false,
    });

    // 2. Devices View
    views.push({
      title: '设备',
      path: 'devices',
      icon: 'mdi:format-list-bulleted-type',
      badges: [],
      cards: [],
      panel: true,
      strategy: {
        ...enrichedConfig,
        type: VIEW_STRATEGY_TYPE,
        view_path: 'devices',
      } as StrategyConfig,
      subview: false,
    });

    // 3. Blueprint Page Views — read from hdp_config (where runtime saves them)
    const blueprintPages = effectiveConfig.hdp_config?.blueprints?.pages || effectiveConfig.blueprint_pages || [];
    for (const page of blueprintPages) {
      const path = safeBlueprintViewId(page.id);
      views.push({
        title: page.name,
        path,
        icon: page.icon || 'mdi:puzzle',
        badges: [],
        cards: [],
        strategy: {
          ...enrichedConfig,
          type: VIEW_STRATEGY_TYPE,
          view_path: path,
        } as StrategyConfig,
        subview: false,
      });
    }

    // 4. Settings View
    if (shouldShowSettings(hass, effectiveConfig)) {
      views.push({
        title: '设置',
        path: 'hdp-settings',
        icon: 'mdi:cog',
        badges: [],
        cards: [],
        panel: true,
        strategy: {
          ...enrichedConfig,
          type: VIEW_STRATEGY_TYPE,
          view_path: 'hdp-settings',
        } as StrategyConfig,
        subview: false,
      });
    }

    return { views };
  }
}
