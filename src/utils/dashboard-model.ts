/**
 * Registry-driven dashboard model utilities.
 *
 * This is the shared data pipeline for generated views: collect HA entities,
 * apply user visibility rules, resolve area inheritance, and classify devices.
 */

import type { EntityInfo, Hass, HassArea, HassEntity, StrategyConfig } from '../types';
import { HIDDEN_DOMAINS } from '../types';
import { getEntityDeviceType, isEntityOn, isUnavailableState } from './area-entities';
import { getEffectiveHDPConfig } from './effective-config';

export const UNASSIGNED_AREA_ID = '__unassigned';
export const UNASSIGNED_AREA_NAME = '未分配区域';

export interface DashboardFilters {
  hiddenAreas: string[];
  hiddenDomains: string[];
  hideUnavailable: boolean;
  hiddenDeviceTypes: string[];
}

export type EntitySemanticType =
  | 'lighting'
  | 'climate'
  | 'opening'
  | 'security'
  | 'media'
  | 'cleaning'
  | 'environment'
  | 'power'
  | 'presence'
  | 'control'
  | 'sensor'
  | 'other';

export interface DashboardEntity extends EntityInfo {
  area_id: string;
  semantic_type: EntitySemanticType;
  active: boolean;
}

export interface HomeProfile {
  area_count: number;
  entity_count: number;
  device_count: number;
  floor_count: number;
  active_count: number;
  dominant_semantics: EntitySemanticType[];
  density: 'compact' | 'standard' | 'spacious';
}

export function getDashboardFilters(config: StrategyConfig): DashboardFilters {
  const hdpConfig = getEffectiveHDPConfig(config);
  return {
    hiddenAreas: getConfiguredHiddenAreas(config),
    hiddenDomains: getConfiguredHiddenDomains(config),
    hideUnavailable: hdpConfig?.areas?.hide_unavailable || false,
    hiddenDeviceTypes: getConfiguredHiddenDeviceTypes(config),
  };
}

export function getConfiguredHiddenAreas(config: StrategyConfig): string[] {
  const hdpConfig = getEffectiveHDPConfig(config);
  const legacyConfig = hdpConfig as { hidden_areas?: unknown } | undefined;
  return mergeStringArrays(hdpConfig?.areas?.hidden_areas, legacyConfig?.hidden_areas, config.hidden_areas);
}

export function getConfiguredHiddenDomains(config: StrategyConfig): string[] {
  const hdpConfig = getEffectiveHDPConfig(config);
  const legacyConfig = hdpConfig as { hidden_domains?: unknown } | undefined;
  return mergeStringArrays(hdpConfig?.devices?.hidden_domains, legacyConfig?.hidden_domains, config.hidden_domains);
}

export function getConfiguredHiddenDeviceTypes(config: StrategyConfig): string[] {
  const hdpConfig = getEffectiveHDPConfig(config);
  const legacyConfig = hdpConfig as { hidden_device_types?: unknown } | undefined;
  return mergeStringArrays(hdpConfig?.devices?.hidden_device_types, legacyConfig?.hidden_device_types, config.hidden_device_types);
}

export function getConfiguredAreaOrder(config: StrategyConfig): string[] {
  const hdpConfig = getEffectiveHDPConfig(config);
  const legacyConfig = hdpConfig as { area_order?: unknown } | undefined;
  return mergeStringArrays(hdpConfig?.areas?.area_order, legacyConfig?.area_order);
}

function mergeStringArrays(...values: Array<unknown>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item === 'string' && item) seen.add(item);
    }
  }
  return Array.from(seen);
}

export function shouldIncludeDomain(domain: string, hiddenDomains: string[] = []): boolean {
  return !HIDDEN_DOMAINS.has(domain) && !hiddenDomains.includes(domain);
}

export function resolveEntityAreaId(hass: Hass, entityId: string): string | null {
  const registryEntry = hass.entities?.[entityId];
  if (registryEntry?.area_id) return registryEntry.area_id;

  if (registryEntry?.device_id) {
    const device = hass.devices?.[registryEntry.device_id];
    if (device?.area_id) return device.area_id;
  }

  const stateArea = hass.states[entityId]?.attributes?.area_id as string | undefined;
  return stateArea || null;
}

export function getEntityArea(hass: Hass, areaId: string): HassArea | null {
  if (areaId === UNASSIGNED_AREA_ID) {
    return { area_id: UNASSIGNED_AREA_ID, name: UNASSIGNED_AREA_NAME, picture: null };
  }
  return hass.areas[areaId] || null;
}

export function createEntityInfo(
  entityId: string,
  stateObj: HassEntity | { state: string; attributes: Record<string, unknown> },
  area: HassArea,
): EntityInfo {
  const domain = entityId.split('.')[0];
  const friendlyName = (stateObj.attributes.friendly_name as string)
    || entityId.replace(`${domain}.`, '').replace(/_/g, ' ');
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

export function collectVisibleEntities(hass: Hass, filters: DashboardFilters): DashboardEntity[] {
  const entities: DashboardEntity[] = [];

  for (const [entityId, stateObj] of Object.entries(hass.states)) {
    const domain = entityId.split('.')[0];
    if (!shouldIncludeDomain(domain, filters.hiddenDomains)) continue;
    if (isRegistryHidden(hass, entityId)) continue;
    if (filters.hideUnavailable && isUnavailableState(stateObj.state)) continue;
    if (filters.hiddenDeviceTypes.includes(getEntityDeviceType(entityId, stateObj.attributes))) continue;

    const areaId = resolveEntityAreaId(hass, entityId) || UNASSIGNED_AREA_ID;
    if (filters.hiddenAreas.includes(areaId)) continue;

    const area = getEntityArea(hass, areaId);
    if (!area) continue;

    const entity = createEntityInfo(entityId, stateObj, area);
    entities.push({
      ...entity,
      area_id: areaId,
      semantic_type: classifyEntity(entity, stateObj),
      active: isEntityOn(entity.state, entity.domain),
    });
  }

  return entities;
}

function isRegistryHidden(hass: Hass, entityId: string): boolean {
  const registryEntry = hass.entities?.[entityId];
  return Boolean(registryEntry?.disabled_by || registryEntry?.hidden_by);
}

export function buildAreaEntityMapFromModel(entities: DashboardEntity[]): Map<string, EntityInfo[]> {
  const map = new Map<string, EntityInfo[]>();
  for (const entity of entities) {
    if (!map.has(entity.area_id)) map.set(entity.area_id, []);
    map.get(entity.area_id)!.push(entity);
  }
  return map;
}

export function countVisibleDevices(hass: Hass, entities: EntityInfo[]): number {
  const deviceIds = new Set<string>();
  for (const entity of entities) {
    const deviceId = hass.entities?.[entity.entity_id]?.device_id;
    if (deviceId && hass.devices?.[deviceId]) deviceIds.add(deviceId);
  }
  return deviceIds.size;
}

export function classifyEntity(entity: EntityInfo, stateObj?: { attributes: Record<string, unknown> }): EntitySemanticType {
  const deviceClass = stateObj?.attributes?.device_class as string | undefined;

  switch (entity.domain) {
    case 'light':
      return 'lighting';
    case 'climate':
    case 'fan':
      return 'climate';
    case 'cover':
      return 'opening';
    case 'lock':
    case 'alarm_control_panel':
      return 'security';
    case 'media_player':
    case 'camera':
      return 'media';
    case 'vacuum':
      return 'cleaning';
    case 'button':
    case 'switch':
    case 'input_boolean':
      return 'control';
    case 'binary_sensor':
      if (['door', 'window', 'garage_door', 'opening'].includes(deviceClass || '')) return 'opening';
      if (['motion', 'occupancy', 'presence'].includes(deviceClass || '')) return 'presence';
      if (['smoke', 'gas', 'moisture', 'safety'].includes(deviceClass || '')) return 'security';
      return 'sensor';
    case 'sensor':
      if (['temperature', 'humidity', 'illuminance', 'aqi', 'pm25', 'carbon_dioxide'].includes(deviceClass || '')) {
        return 'environment';
      }
      if (['power', 'energy', 'current', 'voltage'].includes(deviceClass || '') || entity.unit === 'W' || entity.unit === 'kW') {
        return 'power';
      }
      return 'sensor';
    default:
      return 'other';
  }
}

export function buildHomeProfile(hass: Hass, config: StrategyConfig): HomeProfile {
  const filters = getDashboardFilters(config);
  const entities = collectVisibleEntities(hass, filters);
  const semanticCounts = new Map<EntitySemanticType, number>();

  for (const entity of entities) {
    semanticCounts.set(entity.semantic_type, (semanticCounts.get(entity.semantic_type) || 0) + 1);
  }

  const dominantSemantics = Array.from(semanticCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([semantic]) => semantic);

  const visibleAreaIds = new Set(Object.keys(hass.areas || {})
    .filter(areaId => !filters.hiddenAreas.includes(areaId)));
  for (const entity of entities) visibleAreaIds.add(entity.area_id);
  const entityCount = entities.length;

  return {
    area_count: visibleAreaIds.size,
    entity_count: entityCount,
    device_count: countVisibleDevices(hass, entities),
    floor_count: Object.keys(hass.floors || {}).length,
    active_count: entities.filter(entity => entity.active).length,
    dominant_semantics: dominantSemantics,
    density: entityCount > 120 || visibleAreaIds.size > 12 ? 'compact' : entityCount < 30 ? 'spacious' : 'standard',
  };
}
