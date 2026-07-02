/**
 * Area → Entity mapping utilities
 */

import type { Hass, HassArea, EntityInfo } from '../types';
import { HIDDEN_DOMAINS } from '../types';

/**
 * Build a map of area_id → EntityInfo[]
 */
export function buildAreaEntityMap(
  hass: Hass,
  hiddenAreas: string[] = [],
  hiddenDomains: string[] = [],
): Map<string, EntityInfo[]> {
  const map = new Map<string, EntityInfo[]>();

  for (const [entityId, stateObj] of Object.entries(hass.states)) {
    const domain = entityId.split('.')[0];
    if (HIDDEN_DOMAINS.has(domain)) continue;
    if (hiddenDomains.includes(domain)) continue;

    // Resolve area: entity registry → device registry → state attribute
    const registryEntry = hass.entities?.[entityId];
    let areaId: string | undefined = registryEntry?.area_id ?? undefined;

    if (!areaId && registryEntry?.device_id) {
      const device = hass.devices?.[registryEntry.device_id];
      areaId = device?.area_id ?? undefined;
    }

    if (!areaId) {
      areaId = stateObj.attributes?.area_id as string | undefined;
    }

    if (!areaId || hiddenAreas.includes(areaId)) continue;

    const area = hass.areas[areaId];
    if (!area) continue;

    if (!map.has(areaId)) map.set(areaId, []);
    map.get(areaId)!.push(extractEntityInfo(entityId, stateObj, area));
  }

  return map;
}

function extractEntityInfo(entityId: string, stateObj: { state: string; attributes: Record<string, unknown> }, area: HassArea): EntityInfo {
  const domain = entityId.split('.')[0];
  const friendlyName = (stateObj.attributes.friendly_name as string) || entityId.replace(`${domain}.`, '').replace(/_/g, ' ');
  const unit = (stateObj.attributes.unit_of_measurement as string) || null;
  const icon = (stateObj.attributes.icon as string) || null;

  return {
    entity_id: entityId,
    name: friendlyName,
    domain,
    icon,
    state: stateObj.state,
    unit,
    area_name: area.name,
  };
}

/**
 * Get floor-level grouping for areas
 */
export function groupAreasByFloor(hass: Hass): Map<string | null, { floorName: string | null; areas: string[] }> {
  const floors = new Map<string | null, { floorName: string | null; areas: string[] }>();

  for (const [, area] of Object.entries(hass.areas)) {
    const floorId = area.floor_id ?? null;
    const floorName = floorId ? (hass.floors[floorId]?.name ?? null) : null;
    if (!floors.has(floorId)) floors.set(floorId, { floorName, areas: [] });
    floors.get(floorId)!.areas.push(area.area_id);
  }

  return floors;
}

/**
 * Determine if an entity is currently active/on
 */
export function isEntityOn(state: string, domain: string): boolean {
  switch (domain) {
    case 'light':
    case 'switch':
    case 'input_boolean':
    case 'fan':
      return state === 'on';
    case 'climate':
      return state !== 'off';
    case 'cover':
      return state === 'open' || state === 'opening';
    case 'media_player':
      return state === 'playing' || state === 'on';
    case 'lock':
      return state === 'unlocked';
    case 'binary_sensor':
      return state === 'on';
    default:
      return false;
  }
}

/**
 * Format a state value for display
 */
export function formatState(entity: EntityInfo): string {
  const { state, domain, unit } = entity;
  switch (domain) {
    case 'climate':
      if (state === 'heat') return '制热';
      if (state === 'cool') return '制冷';
      if (state === 'auto') return '自动';
      if (state === 'dry') return '除湿';
      if (state === 'fan_only') return '送风';
      if (state === 'off') return '关闭';
      return state;
    case 'cover':
      if (state === 'open') return '开启';
      if (state === 'closed') return '关闭';
      if (state === 'opening') return '开启中';
      if (state === 'closing') return '关闭中';
      return `${state}%`;
    case 'lock':
      return state === 'locked' ? '已锁' : '已开锁';
    case 'sensor':
    case 'number':
      return unit ? `${state} ${unit}` : state;
    default:
      return state === 'on' ? '开启' : state === 'off' ? '关闭' : state;
  }
}
