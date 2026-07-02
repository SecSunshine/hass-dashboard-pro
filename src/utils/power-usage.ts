/**
 * Power Usage Aggregation — Per-Room Breakdown
 *
 * Algorithm (inspired by dwains-dashboard-next):
 *   1. Scan all sensor.* entities
 *   2. Filter by device_class=power or unit W/kW
 *   3. Resolve area via entity registry → fallback to device area
 *   4. Normalize to watts, sum per room
 *   5. Sort descending, compute percentage bars
 */

import type { Hass, StrategyConfig } from '../types';
import { getDashboardFilters, resolveEntityAreaId, shouldIncludeDomain } from './dashboard-model';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface RoomPower {
  area_id: string;
  area_name: string;
  watts: number;
  display: string;
  percent: number;       // 0-100, relative to total house power
  entity_count: number;  // how many power sensors contributed
}

export interface HousePowerUsage {
  total_watts: number;
  total_display: string;
  rooms: RoomPower[];
  has_data: boolean;
}

// ─── Main Builder ──────────────────────────────────────────────────────────

/**
 * Build a complete house power usage summary from HA state.
 * Groups power sensors by area, sums watts, sorts descending.
 */
export function buildHousePowerUsage(hass: Hass, config?: StrategyConfig): HousePowerUsage {
  const roomMap = new Map<string, { watts: number; count: number; name: string }>();
  const filters = config ? getDashboardFilters(config) : { hiddenAreas: [], hiddenDomains: [], hideUnavailable: false };

  for (const [entityId, stateObj] of Object.entries(hass.states)) {
    // Only sensor domain
    if (!entityId.startsWith('sensor.')) continue;
    if (!shouldIncludeDomain('sensor', filters.hiddenDomains)) continue;

    const attrs = stateObj.attributes;
    const deviceClass = attrs.device_class as string | undefined;
    const uom = attrs.unit_of_measurement as string | undefined;

    // Must be a power sensor
    const isPower = deviceClass === 'power' || uom === 'W' || uom === 'kW';
    if (!isPower) continue;

    const value = parseFloat(stateObj.state);
    if (isNaN(value) || value < 0) continue;

    // Normalize to watts
    const watts = uom === 'kW' ? value * 1000 : value;

    // Resolve area
    const areaId = resolveEntityAreaId(hass, entityId);
    if (!areaId || filters.hiddenAreas.includes(areaId)) continue;

    const area = hass.areas[areaId];
    const areaName = area?.name || areaId;

    if (!roomMap.has(areaId)) {
      roomMap.set(areaId, { watts: 0, count: 0, name: areaName });
    }
    const entry = roomMap.get(areaId)!;
    entry.watts += watts;
    entry.count += 1;
  }

  if (roomMap.size === 0) {
    return { total_watts: 0, total_display: '-- W', rooms: [], has_data: false };
  }

  // Calculate total
  let totalWatts = 0;
  for (const [, room] of roomMap) {
    totalWatts += room.watts;
  }

  // Build sorted room list
  const rooms: RoomPower[] = [];
  for (const [areaId, data] of roomMap) {
    const percent = totalWatts > 0 ? Math.round((data.watts / totalWatts) * 100) : 0;
    rooms.push({
      area_id: areaId,
      area_name: data.name,
      watts: data.watts,
      display: formatWatts(data.watts),
      percent,
      entity_count: data.count,
    });
  }

  // Sort by watts descending
  rooms.sort((a, b) => b.watts - a.watts);

  return {
    total_watts: totalWatts,
    total_display: formatWatts(totalWatts),
    rooms,
    has_data: true,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Resolve the area_id for an entity, checking:
 *   1. Entity registry entry area_id
 *   2. Device's area_id (via device registry)
 *   3. State attributes area_id
 */
function formatWatts(watts: number): string {
  if (watts >= 1000) {
    return `${(watts / 1000).toFixed(1)} kW`;
  }
  return `${Math.round(watts)} W`;
}

/**
 * Get a simple total power reading (for quick-strip / status cards).
 * Returns the first power sensor found, or null.
 */
export function getQuickPower(hass: Hass): { display: string; percent: number } | null {
  const result = buildHousePowerUsage(hass);
  if (!result.has_data) return null;
  // Estimate percent based on a reasonable 8kW baseline
  const percent = Math.min(100, Math.round((result.total_watts / 8000) * 100));
  return { display: result.total_display, percent };
}
