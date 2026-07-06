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

import type { Hass, StrategyConfig, DashboardStrategyResult, LovelaceViewConfig, AreaSummary, BlueprintInstance } from '../types';
import { isEntityOn } from '../utils/area-entities';
import { safeBlueprintViewId } from '../utils/dom-id';
import { getEffectiveStrategyConfig } from '../utils/effective-config';
import {
  buildAreaEntityMapFromModel,
  collectVisibleEntities,
  getConfiguredAreaOrder,
  getConfiguredHiddenAreas,
  getDashboardFilters,
  UNASSIGNED_AREA_ID,
  UNASSIGNED_AREA_NAME,
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

// ─── Area Summaries ────────────────────────────────────────────────────────

function buildAreaSummaries(
  hass: Hass,
  areaEntityMap: Map<string, import('../types').EntityInfo[]>,
  hiddenAreas: string[],
  areaOrder: string[] = [],
): AreaSummary[] {
  const summaries: AreaSummary[] = [];

  for (const [areaId, area] of Object.entries(hass.areas)) {
    if (hiddenAreas.includes(areaId)) continue;

    const entities = areaEntityMap.get(areaId) || [];
    if (entities.length === 0) continue;
    const activeCount = entities.filter(e => isEntityOn(e.state, e.domain)).length;

    // Find temp/humidity sensors in this area
    let temp: string | null = null;
    let humidity: string | null = null;
    const domainCounts: Record<string, number> = {};

    for (const e of entities) {
      // Count domains
      domainCounts[e.domain] = (domainCounts[e.domain] || 0) + 1;

      // Find temp/humidity
      if (e.domain === 'sensor') {
        if (e.unit === '°C' && !temp) temp = `${e.state}°C`;
        if (e.unit === '%' && (e.entity_id.includes('humidity') || e.entity_id.includes('humid')) && !humidity) {
          humidity = `${e.state}%`;
        }
      }
    }

    summaries.push({
      area_id: areaId,
      area_name: area.name,
      icon: getAreaIcon(area.name),
      entity_count: entities.length,
      active_count: activeCount,
      temp,
      humidity,
      domain_counts: domainCounts,
    });
  }

  for (const [areaId, entities] of areaEntityMap.entries()) {
    if (hass.areas[areaId] || hiddenAreas.includes(areaId)) continue;
    const activeCount = entities.filter(e => isEntityOn(e.state, e.domain)).length;
    const domainCounts: Record<string, number> = {};
    for (const e of entities) {
      domainCounts[e.domain] = (domainCounts[e.domain] || 0) + 1;
    }

    summaries.push({
      area_id: areaId,
      area_name: areaId === UNASSIGNED_AREA_ID ? UNASSIGNED_AREA_NAME : areaId,
      icon: 'mdi:home-outline',
      entity_count: entities.length,
      active_count: activeCount,
      temp: null,
      humidity: null,
      domain_counts: domainCounts,
    });
  }

  return sortAreaSummaries(summaries, areaOrder);
}

function sortAreaSummaries(summaries: AreaSummary[], areaOrder: string[]): AreaSummary[] {
  if (!areaOrder.length) return summaries;

  const orderIndex = new Map(areaOrder.map((areaId, index) => [areaId, index]));
  return summaries
    .map((summary, index) => ({ summary, index }))
    .sort((a, b) => {
      const ai = orderIndex.get(a.summary.area_id);
      const bi = orderIndex.get(b.summary.area_id);
      if (ai !== undefined || bi !== undefined) {
        return (ai ?? Number.MAX_SAFE_INTEGER) - (bi ?? Number.MAX_SAFE_INTEGER);
      }
      return a.index - b.index;
    })
    .map(item => item.summary);
}

// ─── Area Icon Mapping ─────────────────────────────────────────────────────

export function getAreaIcon(name: string): string {
  const n = name.toLowerCase();

  // Living areas
  if (/客厅|起居室|lounge|living/.test(n)) return 'mdi:sofa';
  if (/餐厅|饭厅|dining/.test(n)) return 'mdi:silverware-fork-knife';
  if (/厨房|kitchen/.test(n)) return 'mdi:chef-hat';

  // Bedrooms
  if (/主卧|master/.test(n)) return 'mdi:bed-king';
  if (/卧室|bedroom|bed/.test(n)) return 'mdi:bed';
  if (/儿童|child|kid/.test(n)) return 'mdi:teddy-bear';
  if (/客卧|guest/.test(n)) return 'mdi:bed-empty';

  // Work & study
  if (/书房|study|office/.test(n)) return 'mdi:desk';

  // Bathrooms
  if (/浴室|卫生间|bath|toilet|wc/.test(n)) return 'mdi:shower';

  // Entryways
  if (/玄关|门厅|entry|foyer|hall/.test(n)) return 'mdi:door';

  // Storage & utility
  if (/车库|garage/.test(n)) return 'mdi:car';
  if (/阳台|balcony|terrace/.test(n)) return 'mdi:flower';
  if (/花园|garden|yard/.test(n)) return 'mdi:tree';
  if (/储物|储藏|storage/.test(n)) return 'mdi:package-variant';
  if (/洗衣|laundry/.test(n)) return 'mdi:washing-machine';

  // Entertainment
  if (/影院|影音|media|theater|theatre/.test(n)) return 'mdi:movie';
  if (/游戏|game|play/.test(n)) return 'mdi:gamepad-variant';

  // Outdoor / structural
  if (/楼梯|stair/.test(n)) return 'mdi:stairs';
  if (/走廊|corridor|hallway/.test(n)) return 'mdi:foot-print';
  if (/阁楼|attic/.test(n)) return 'mdi:home-roof';
  if (/地下|basement/.test(n)) return 'mdi:elevator-passenger';

  return 'mdi:home-outline';
}
