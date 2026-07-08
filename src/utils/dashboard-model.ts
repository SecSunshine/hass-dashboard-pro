/**
 * Registry-driven dashboard model utilities.
 *
 * This is the shared data pipeline for generated views: collect HA entities,
 * apply user visibility rules, resolve area inheritance, and classify devices.
 */

import type { AreaSummary, EntityInfo, Hass, HassArea, HassEntity, StrategyConfig } from '../types';
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
  hiddenKeywords: string[];
  visibleKeywords: string[];
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
    hiddenKeywords: getConfiguredHiddenKeywords(config),
    visibleKeywords: getConfiguredVisibleKeywords(config),
  };
}

export function getConfiguredHiddenAreas(config: StrategyConfig): string[] {
  const hdpConfig = getEffectiveHDPConfig(config);
  const legacyConfig = hdpConfig as { hidden_areas?: unknown } | undefined;
  if (Array.isArray(hdpConfig?.areas?.hidden_areas)) return mergeStringArrays(hdpConfig?.areas?.hidden_areas);
  return mergeStringArrays(hdpConfig?.areas?.hidden_areas, legacyConfig?.hidden_areas, config.hidden_areas);
}

export function getConfiguredHiddenDomains(config: StrategyConfig): string[] {
  const hdpConfig = getEffectiveHDPConfig(config);
  const legacyConfig = hdpConfig as { hidden_domains?: unknown } | undefined;
  if (Array.isArray(hdpConfig?.devices?.hidden_domains)) return mergeStringArrays(hdpConfig?.devices?.hidden_domains);
  return mergeStringArrays(hdpConfig?.devices?.hidden_domains, legacyConfig?.hidden_domains, config.hidden_domains);
}

export function getConfiguredHiddenDeviceTypes(config: StrategyConfig): string[] {
  const hdpConfig = getEffectiveHDPConfig(config);
  const legacyConfig = hdpConfig as { hidden_device_types?: unknown } | undefined;
  if (Array.isArray(hdpConfig?.devices?.hidden_device_types)) return mergeStringArrays(hdpConfig?.devices?.hidden_device_types);
  return mergeStringArrays(hdpConfig?.devices?.hidden_device_types, legacyConfig?.hidden_device_types, config.hidden_device_types);
}

export function getConfiguredHiddenKeywords(config: StrategyConfig): string[] {
  const hdpConfig = getEffectiveHDPConfig(config);
  const legacyConfig = hdpConfig as { hidden_keywords?: unknown; hidden_device_keywords?: unknown } | undefined;
  if (Array.isArray(hdpConfig?.devices?.hidden_keywords)) return normalizeKeywordList(hdpConfig.devices.hidden_keywords);
  return normalizeKeywordList(
    hdpConfig?.devices?.hidden_keywords,
    legacyConfig?.hidden_keywords,
    legacyConfig?.hidden_device_keywords,
  );
}

export function getConfiguredVisibleKeywords(config: StrategyConfig): string[] {
  const hdpConfig = getEffectiveHDPConfig(config);
  const legacyConfig = hdpConfig as { visible_keywords?: unknown; visible_device_keywords?: unknown } | undefined;
  if (Array.isArray(hdpConfig?.devices?.visible_keywords)) return normalizeKeywordList(hdpConfig.devices.visible_keywords);
  return normalizeKeywordList(
    hdpConfig?.devices?.visible_keywords,
    legacyConfig?.visible_keywords,
    legacyConfig?.visible_device_keywords,
  );
}

export function getConfiguredHiddenPersons(config: StrategyConfig): string[] {
  const hdpConfig = getEffectiveHDPConfig(config);
  const legacyConfig = hdpConfig as { hidden_persons?: unknown } | undefined;
  if (Array.isArray(hdpConfig?.people?.hidden_persons)) return mergeStringArrays(hdpConfig?.people?.hidden_persons);
  return mergeStringArrays(hdpConfig?.people?.hidden_persons, legacyConfig?.hidden_persons, config.hidden_persons);
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

function normalizeKeywordList(...values: Array<unknown>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item !== 'string') continue;
      const keyword = item.trim().toLowerCase();
      if (keyword) seen.add(keyword);
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
    if (!matchesKeywordVisibility(hass, entityId, area, filters)) continue;

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

function matchesKeywordVisibility(hass: Hass, entityId: string, area: HassArea, filters: DashboardFilters): boolean {
  const visibleKeywords = filters.visibleKeywords || [];
  const hiddenKeywords = filters.hiddenKeywords || [];
  if (!visibleKeywords.length && !hiddenKeywords.length) return true;

  const haystack = buildEntityKeywordText(hass, entityId, area);
  if (visibleKeywords.length && !visibleKeywords.some(keyword => haystack.includes(keyword))) return false;
  if (hiddenKeywords.some(keyword => haystack.includes(keyword))) return false;
  return true;
}

function buildEntityKeywordText(hass: Hass, entityId: string, area: HassArea): string {
  const stateObj = hass.states[entityId];
  const registryEntry = hass.entities?.[entityId];
  const device = registryEntry?.device_id ? hass.devices?.[registryEntry.device_id] : undefined;
  const values = [
    entityId,
    stateObj?.attributes?.friendly_name,
    registryEntry?.name,
    device?.name_by_user,
    device?.name,
    area.name,
    getEntityDeviceType(entityId, stateObj?.attributes || {}),
  ];
  return values
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();
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

// ─── Area Summaries ────────────────────────────────────────────────────────

export function buildAreaSummaries(
  hass: Hass,
  areaEntityMap: Map<string, EntityInfo[]>,
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
