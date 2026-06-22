/**
 * Dashboard Strategy — Top-Level
 *
 * Generates the overview page + one view per HA area + settings page.
 * Uses html-pro-card for card rendering with beautified design tokens.
 */

import type { StrategyConfig, StrategyContext, DashboardStrategyResult, LovelaceViewConfig } from '../types';
import { buildAreaEntityMap, groupAreasByFloor } from '../utils/area-entities';

export class HassDashboardProStrategy {
  static async generate(context: StrategyContext): Promise<DashboardStrategyResult> {
    const { config, hass } = context;
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

    for (const [, { floorName, areas }] of floors) {
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
          icon: 'mdi:home-outline',
          badges: [],
          cards: [],
          strategy: {
            ...config,
            type: 'strategy',
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
        type: 'strategy',
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
      type: 'strategy',
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
