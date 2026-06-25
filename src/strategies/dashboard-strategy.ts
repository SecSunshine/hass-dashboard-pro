/**
 * Dashboard Strategy — Top-Level
 *
 * Generates the overview page + one view per HA area + settings page.
 * Uses html-pro-card for card rendering with beautified design tokens.
 *
 * The strategy type for generated views is `custom:hass-dashboard-pro-view`,
 * which maps to custom element `ll-strategy-view-hass-dashboard-pro-view`.
 * HA 2026.5+ requires the `custom:` prefix for all custom strategies.
 */

import type { Hass, StrategyConfig, DashboardStrategyResult, LovelaceViewConfig } from '../types';
import { buildAreaEntityMap, groupAreasByFloor } from '../utils/area-entities';

const VIEW_STRATEGY_TYPE = 'custom:hass-dashboard-pro-view';

export class HassDashboardProStrategy {
  static async generate(config: StrategyConfig, hass: Hass): Promise<DashboardStrategyResult> {
    const hiddenAreas = config.hidden_areas || [];
    const areaEntityMap = buildAreaEntityMap(hass, hiddenAreas);
    const floorGroups = groupAreasByFloor(hass);

    const views: LovelaceViewConfig[] = [];

    // 1. Home View
    views.push(buildHomeViewConfig(config));

    // 2. Area Views — grouped by floor
    const floors = Array.from(floorGroups.entries()).sort((a, b) => {
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      return 0;
    });

    for (const [, { areas }] of floors) {
      for (const areaId of areas) {
        const area = hass.areas[areaId];
        if (!area || hiddenAreas.includes(areaId)) continue;

        const entities = areaEntityMap.get(areaId) || [];
        const path = sanitizePath(area.name);
        const badgeCount = entities.length;
        const badgeText = badgeCount > 0 ? String(badgeCount) : '';

        views.push({
          title: area.name,
          path,
          icon: getAreaIcon(area.name),
          badges: [],
          cards: [],
          strategy: {
            ...config,
            type: VIEW_STRATEGY_TYPE,
            view_path: path,
            area_id: areaId,
          } as StrategyConfig,
          subview: false,
        });
      }
    }

    // 3. Settings View — visual configuration panel
    views.push({
      title: '视觉设置',
      path: 'hdp-settings',
      icon: 'mdi:palette',
      badges: [],
      cards: [],
      strategy: {
        ...config,
        type: VIEW_STRATEGY_TYPE,
        view_path: 'hdp-settings',
      } as StrategyConfig,
      subview: false,
    });

    return { views };
  }
}

function buildHomeViewConfig(config: StrategyConfig): LovelaceViewConfig {
  return {
    title: config.title || '首页',
    path: 'home',
    icon: 'mdi:home',
    badges: [],
    cards: [],
    strategy: {
      ...config,
      type: VIEW_STRATEGY_TYPE,
      view_path: 'home',
    } as StrategyConfig,
    subview: false,
  };
}

function sanitizePath(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getAreaIcon(name: string): string {
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
