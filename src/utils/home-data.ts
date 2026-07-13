/**
 * Home Data Aggregation — People, Climate, Status Domains, Favorites, Summaries
 *
 * Consolidates HA state into structured data for the home view.
 * Inspired by dwains-dashboard-next's registry-driven approach.
 */

import type { Hass, EntityInfo, StrategyConfig } from '../types';
import { isEntityOn } from './area-entities';
import { collectVisibleEntities, countVisibleDevices, getDashboardFilters } from './dashboard-model';
import { formatTemperatureCelsius, isTemperatureLikeEntity, isTemperatureUnit, normalizeTemperatureToCelsius } from './temperature';

// ─── Person Tracking ───────────────────────────────────────────────────────

export interface PersonInfo {
  entity_id: string;
  name: string;
  state: string;         // 'home', 'not_home', zone name
  display: string;       // Chinese display label
  is_home: boolean;
  picture: string | null;
  last_changed: string;
}

export function getPersons(hass: Hass, hiddenPersons: string[] = []): PersonInfo[] {
  const persons: PersonInfo[] = [];

  for (const [entityId, stateObj] of Object.entries(hass.states)) {
    if (!entityId.startsWith('person.')) continue;
    if (hiddenPersons.includes(entityId)) continue;
    if (!isRegistryVisible(hass, entityId)) continue;

    const st = stateObj.state;
    const name = (stateObj.attributes.friendly_name as string)
      || entityId.replace('person.', '').replace(/_/g, ' ');
    const picture = (stateObj.attributes.entity_picture as string) || null;

    persons.push({
      entity_id: entityId,
      name,
      state: st,
      display: formatPersonState(st),
      is_home: st === 'home',
      picture,
      last_changed: stateObj.last_changed,
    });
  }

  // Sort: home first, then alphabetical
  persons.sort((a, b) => {
    if (a.is_home !== b.is_home) return a.is_home ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return persons;
}

function formatPersonState(state: string): string {
  switch (state) {
    case 'home': return '在家';
    case 'not_home': return '不在家';
    default: return state; // zone name
  }
}

// ─── Climate Summary ───────────────────────────────────────────────────────

export interface ClimateSummary {
  avg_temp: string;       // e.g. "24.5°C" or "--"
  avg_humidity: string;   // e.g. "55%" or "--"
  temp_sensors: number;
  humidity_sensors: number;
  has_data: boolean;
}

/**
 * Compute averaged indoor temperature and humidity across all areas.
 * Uses sensor entities with °C/°F or % units.
 */
export function getClimateSummary(hass: Hass, config?: StrategyConfig): ClimateSummary {
  let tempSum = 0, tempCount = 0;
  let humSum = 0, humCount = 0;
  const entries = config
    ? collectVisibleEntities(hass, getDashboardFilters(config)).filter(entity => entity.domain === 'sensor')
    : Object.entries(hass.states)
      .filter(([entityId]) => entityId.startsWith('sensor.'))
      .map(([entity_id, stateObj]) => ({ entity_id, state: stateObj.state, attributes: stateObj.attributes }));

  for (const entry of entries) {
    const entityId = entry.entity_id;
    const attrs = 'attributes' in entry ? entry.attributes : hass.states[entityId]?.attributes || {};
    const state = 'state' in entry ? entry.state : hass.states[entityId]?.state;
    const uom = attrs.unit_of_measurement as string | undefined;
    const deviceClass = attrs.device_class as string | undefined;
    const value = parseFloat(state);
    if (isNaN(value)) continue;

    const lowerId = entityId.toLowerCase();
    const isTemperatureSensor = deviceClass === 'temperature'
      || isTemperatureUnit(uom)
      || lowerId.includes('temperature')
      || lowerId.includes('temp');

    if (isTemperatureSensor) {
      // Only count indoor sensors (skip weather/outdoor)
      if (lowerId.includes('outdoor') || lowerId.includes('weather') || lowerId.includes('external')) continue;
      const celsius = normalizeTemperatureToCelsius(value, uom);
      if (isNaN(celsius)) continue;
      tempSum += celsius;
      tempCount++;
    } else if (uom === '%' && (attrs.device_class === 'humidity' || entityId.includes('humidity'))) {
      if (entityId.includes('outdoor') || entityId.includes('weather')) continue;
      humSum += value;
      humCount++;
    }
  }

  if (tempCount === 0 && humCount === 0) {
    return { avg_temp: '--', avg_humidity: '--', temp_sensors: 0, humidity_sensors: 0, has_data: false };
  }

  return {
    avg_temp: tempCount > 0 ? `${(tempSum / tempCount).toFixed(1)}°C` : '--',
    avg_humidity: humCount > 0 ? `${Math.round(humSum / humCount)}%` : '--',
    temp_sensors: tempCount,
    humidity_sensors: humCount,
    has_data: true,
  };
}

// ─── Status Domains ────────────────────────────────────────────────────────

export interface DomainStatus {
  domain: string;
  label: string;
  active: number;
  total: number;
  icon_svg: string;
  color_class: string;   // CSS class suffix for badge/icon coloring
}

/**
 * Comprehensive domain status tracking — counts active/total for each
 * controllable domain and key binary_sensor device classes.
 */
export function getStatusDomains(hass: Hass, config?: StrategyConfig): DomainStatus[] {
  const domains: DomainStatus[] = [];
  const visibleEntities = config ? collectVisibleEntities(hass, getDashboardFilters(config)) : null;

  // Controllable domains
  const domainDefs: Array<{
    domain: string; label: string; icon: string; color: string;
  }> = [
    { domain: 'light', label: '灯光', icon: 'light', color: 'warning' },
    { domain: 'switch', label: '开关', icon: 'switch', color: 'accent' },
    { domain: 'fan', label: '风扇', icon: 'fan', color: 'info' },
    { domain: 'cover', label: '窗帘', icon: 'cover', color: 'accent' },
    { domain: 'lock', label: '门锁', icon: 'lock', color: 'danger' },
    { domain: 'climate', label: '空调', icon: 'climate', color: 'info' },
    { domain: 'media_player', label: '媒体', icon: 'media', color: 'info' },
    { domain: 'vacuum', label: '扫地机', icon: 'vacuum', color: 'success' },
    { domain: 'camera', label: '摄像头', icon: 'camera', color: 'info' },
  ];

  for (const def of domainDefs) {
    let active = 0, total = 0;
    const entities = visibleEntities
      ? visibleEntities.filter(entity => entity.domain === def.domain)
      : Object.entries(hass.states)
        .filter(([eid]) => eid.startsWith(`${def.domain}.`))
        .map(([entity_id, state]) => ({ entity_id, state: state.state, domain: def.domain }));
    for (const entity of entities) {
      total++;
      if (isEntityOn(entity.state, def.domain)) active++;
    }
    if (total > 0) {
      domains.push({
        domain: def.domain,
        label: def.label,
        active,
        total,
        icon_svg: getDomainIcon(def.icon),
        color_class: def.color,
      });
    }
  }

  // Binary sensor device classes
  const bsClasses: Array<{ cls: string; label: string; icon: string; color: string }> = [
    { cls: 'window', label: '窗户', icon: 'window', color: 'info' },
    { cls: 'door', label: '门', icon: 'door', color: 'info' },
    { cls: 'motion', label: '人体感应', icon: 'motion', color: 'warning' },
    { cls: 'smoke', label: '烟雾', icon: 'smoke', color: 'danger' },
    { cls: 'moisture', label: '漏水', icon: 'moisture', color: 'info' },
  ];

  for (const bsDef of bsClasses) {
    let active = 0, total = 0;
    const entities = visibleEntities
      ? visibleEntities.filter(entity => entity.domain === 'binary_sensor')
      : Object.entries(hass.states)
        .filter(([eid]) => eid.startsWith('binary_sensor.'))
        .map(([entity_id, state]) => ({ entity_id, state: state.state, attributes: state.attributes }));
    for (const entity of entities) {
      const dc = ('attributes' in entity ? entity.attributes : hass.states[entity.entity_id]?.attributes)?.device_class as string | undefined;
      if (dc !== bsDef.cls) continue;
      total++;
      if (entity.state === 'on') active++;
    }
    if (total > 0) {
      domains.push({
        domain: `binary_sensor.${bsDef.cls}`,
        label: bsDef.label,
        active,
        total,
        icon_svg: getDomainIcon(bsDef.icon),
        color_class: bsDef.color,
      });
    }
  }

  return domains;
}

// ─── Favorites ─────────────────────────────────────────────────────────────

export interface FavoriteEntity {
  entity_id: string;
  name: string;
  domain: string;
  state: string;
  display: string;
  is_active: boolean;
  unit: string | null;
}

/**
 * Resolve favorite entity IDs from config into display-ready objects.
 */
export function getFavorites(hass: Hass, config: StrategyConfig): FavoriteEntity[] {
  const ids = config.favorite_entities || [];
  const favorites: FavoriteEntity[] = [];
  const visible = new Set(collectVisibleEntities(hass, getDashboardFilters(config)).map(entity => entity.entity_id));

  for (const eid of ids) {
    const stateObj = hass.states[eid];
    if (!stateObj) continue;
    if (!visible.has(eid)) continue;

    const domain = eid.split('.')[0];
    const name = (stateObj.attributes.friendly_name as string) || eid.replace(`${domain}.`, '').replace(/_/g, ' ');
    const unit = (stateObj.attributes.unit_of_measurement as string) || null;
    const deviceClass = stateObj.attributes.device_class as string | undefined;
    const isActive = isEntityOn(stateObj.state, domain);

    let display: string;
    if ((domain === 'sensor' || domain === 'number') && isTemperatureLikeEntity(eid, deviceClass, unit)) {
      const celsius = normalizeTemperatureToCelsius(stateObj.state, unit);
      display = !isNaN(celsius) ? formatTemperatureCelsius(celsius) : (unit ? `${stateObj.state} ${unit}` : stateObj.state);
    } else if (unit) {
      display = `${stateObj.state} ${unit}`;
    } else if (isActive) {
      display = '开启';
    } else if (stateObj.state === 'off') {
      display = '关闭';
    } else {
      display = stateObj.state;
    }

    favorites.push({
      entity_id: eid,
      name,
      domain,
      state: stateObj.state,
      display,
      is_active: isActive,
      unit,
    });
  }

  return favorites;
}

// ─── Summary Cards ─────────────────────────────────────────────────────────

export interface HomeSummary {
  repairs_count: number;
  updates_count: number;
  automations_count: number;
  total_entities: number;
  total_devices: number;
  total_areas: number;
  active_entities: number;
}

function isRegistryVisible(hass: Hass, entityId: string): boolean {
  const registryEntry = hass.entities?.[entityId];
  return !registryEntry?.disabled_by && !registryEntry?.hidden_by;
}

export function countActiveAutomations(hass: Hass): number {
  let count = 0;
  for (const [eid, s] of Object.entries(hass.states)) {
    if (eid.startsWith('automation.') && s.state === 'on' && isRegistryVisible(hass, eid)) count++;
  }
  return count;
}

function countVisibleAutomations(hass: Hass): number {
  return Object.keys(hass.states).filter(entityId => (
    entityId.startsWith('automation.') && isRegistryVisible(hass, entityId)
  )).length;
}

/**
 * Collect summary statistics for the home page footer.
 */
export function getHomeSummaries(hass: Hass, config?: StrategyConfig): HomeSummary {
  let repairsCount = 0;
  let updatesCount = 0;
  const visibleEntities = config ? collectVisibleEntities(hass, getDashboardFilters(config)) : null;

  for (const [eid, s] of Object.entries(hass.states)) {
    if (eid.startsWith('update.') && s.state === 'on' && isRegistryVisible(hass, eid)) updatesCount++;
  }

  // Check for repairs integration
  const repairsEntityId = ['sensor.repairs', 'binary_sensor.repairs']
    .find(entityId => hass.states[entityId] && isRegistryVisible(hass, entityId));
  const repairsEntity = repairsEntityId ? hass.states[repairsEntityId] : undefined;
  if (repairsEntity) {
    repairsCount = parseInt(repairsEntity.state) || 0;
  }

  return {
    repairs_count: repairsCount,
    updates_count: updatesCount,
    automations_count: countVisibleAutomations(hass),
    total_entities: visibleEntities ? visibleEntities.length : Object.keys(hass.states).length,
    total_devices: visibleEntities ? countVisibleDevices(hass, visibleEntities) : Object.keys(hass.devices || {}).length,
    total_areas: visibleEntities
      ? new Set(visibleEntities.map(entity => entity.area_id)).size
      : Object.keys(hass.areas || {}).length,
    active_entities: visibleEntities
      ? visibleEntities.filter(entity => isEntityOn(entity.state, entity.domain)).length
      : Object.entries(hass.states).filter(([entityId, stateObj]) => isEntityOn(stateObj.state, entityId.split('.')[0])).length,
  };
}

// ─── Weather ───────────────────────────────────────────────────────────────

export interface WeatherInfo {
  temp: string;
  condition: string;
  condition_display: string;
  icon_svg: string;
  has_data: boolean;
}

/**
 * Get weather from a configured weather entity, or auto-detect.
 */
export function getWeather(hass: Hass, weatherEntity?: string): WeatherInfo {
  const eid = weatherEntity || findWeatherEntity(hass);
  if (!eid) return { temp: '--', condition: '', condition_display: '--', icon_svg: '', has_data: false };

  const s = hass.states[eid];
  if (!s || !isRegistryVisible(hass, eid)) return { temp: '--', condition: '', condition_display: '--', icon_svg: '', has_data: false };

  const temp = s.attributes.temperature != null
    ? formatTemperatureCelsius(normalizeTemperatureToCelsius(
      s.attributes.temperature,
      s.attributes.temperature_unit || s.attributes.unit_of_measurement || s.attributes.unit,
    ))
    : '--';
  const condition = s.state;

  return {
    temp,
    condition,
    condition_display: formatWeatherCondition(condition),
    icon_svg: getWeatherIcon(condition),
    has_data: true,
  };
}

function findWeatherEntity(hass: Hass): string | null {
  for (const eid of Object.keys(hass.states)) {
    if (eid.startsWith('weather.') && isRegistryVisible(hass, eid)) return eid;
  }
  return null;
}

function formatWeatherCondition(condition: string): string {
  const map: Record<string, string> = {
    'clear-night': '晴夜',
    'cloudy': '多云',
    'fog': '雾',
    'hail': '冰雹',
    'lightning': '雷电',
    'lightning-rainy': '雷阵雨',
    'partlycloudy': '局部多云',
    'pouring': '大雨',
    'rainy': '雨',
    'snowy': '雪',
    'snowy-rainy': '雨夹雪',
    'sunny': '晴',
    'windy': '大风',
    'windy-variant': '大风',
    'exceptional': '异常',
  };
  return map[condition] || condition;
}

// ─── Alarm Status ──────────────────────────────────────────────────────────

export interface AlarmStatus {
  state: string;
  display: string;
  badge: string;
  badge_class: string;    // 'ok' | 'warn' | 'danger' | 'info'
  has_alarm: boolean;
}

export function getAlarmStatus(hass: Hass, alarmEntity?: string, config?: StrategyConfig): AlarmStatus {
  const visible = config ? new Set(collectVisibleEntities(hass, getDashboardFilters(config)).map(entity => entity.entity_id)) : null;
  if (alarmEntity && hass.states[alarmEntity] && (!visible || visible.has(alarmEntity))) {
    const stateObj = hass.states[alarmEntity];
    if (alarmEntity.startsWith('alarm_control_panel.')) {
      return formatAlarmControlState(stateObj.state);
    }
    if (alarmEntity.startsWith('lock.')) {
      const locked = stateObj.state === 'locked';
      return {
        state: stateObj.state,
        display: locked ? '1/1 已锁' : '0/1 已锁',
        badge: locked ? '安全' : '未锁定',
        badge_class: locked ? 'ok' : 'warn',
        has_alarm: true,
      };
    }
  }

  for (const [eid, s] of Object.entries(hass.states)) {
    if (!eid.startsWith('alarm_control_panel.')) continue;
    if (visible && !visible.has(eid)) continue;
    if (!visible && !isRegistryVisible(hass, eid)) continue;
    return formatAlarmControlState(s.state);
  }

  // Fallback: check locks
  let locked = 0, total = 0;
  for (const [eid, s] of Object.entries(hass.states)) {
    if (!eid.startsWith('lock.')) continue;
    if (visible && !visible.has(eid)) continue;
    if (!visible && !isRegistryVisible(hass, eid)) continue;
    total++;
    if (s.state === 'locked') locked++;
  }
  if (total > 0) {
    const allLocked = locked === total;
    return {
      state: allLocked ? 'locked' : 'partial',
      display: `${locked}/${total} 已锁`,
      badge: allLocked ? '安全' : '部分锁定',
      badge_class: allLocked ? 'ok' : 'warn',
      has_alarm: true,
    };
  }

  return { state: 'none', display: '--', badge: '无设备', badge_class: 'info', has_alarm: false };
}

function formatAlarmControlState(state: string): AlarmStatus {
  if (state === 'armed_away' || state === 'armed_home' || state === 'armed_night' || state === 'armed_custom_bypass') {
    return { state, display: '已布防', badge: '安全', badge_class: 'ok', has_alarm: true };
  }
  if (state === 'triggered') {
    return { state, display: '报警中', badge: '警报', badge_class: 'danger', has_alarm: true };
  }
  if (state === 'arming' || state === 'pending') {
    return { state, display: '布防中', badge: '等待', badge_class: 'warn', has_alarm: true };
  }
  return { state, display: '已撤防', badge: '未布防', badge_class: 'info', has_alarm: true };
}

// ─── SVG Icon Maps ─────────────────────────────────────────────────────────

function getDomainIcon(key: string): string {
  const c = 'currentColor';
  const icons: Record<string, string> = {
    light: `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/></svg>`,
    switch: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3" fill="${c}" opacity="0.4"/></svg>`,
    fan: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
    cover: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M3 7h18M3 17h18" opacity="0.4"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    climate: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0z"/></svg>`,
    media: `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
    vacuum: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="${c}"/></svg>`,
    camera: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
    window: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
    door: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><circle cx="15" cy="12" r="1" fill="${c}"/></svg>`,
    motion: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="5" r="2"/><path d="M9 22l3-9 3 9M12 13V8"/><path d="M7 12l5-4 5 4"/></svg>`,
    smoke: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M12 2C8 2 5 5 5 9c0 3 2 5 4 6v3h6v-3c2-1 4-3 4-6 0-4-3-7-7-7z"/><path d="M9 22h6" opacity="0.5"/></svg>`,
    moisture: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M12 2C8 8 4 12 4 16a8 8 0 0 0 16 0c0-4-4-8-8-14z"/></svg>`,
  };
  return icons[key] || `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`;
}

function getWeatherIcon(condition: string): string {
  const c = 'currentColor';
  switch (condition) {
    case 'sunny':
    case 'clear-night':
      return `<svg viewBox="0 0 24 24" fill="${c}"><circle cx="12" cy="12" r="5"/><g stroke="${c}" stroke-width="2"><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></g></svg>`;
    case 'cloudy':
    case 'partlycloudy':
      return `<svg viewBox="0 0 24 24" fill="${c}"><path d="M19 15h1c1.1 0 2-.9 2-2s-.9-2-2-2h-.5C19 8.8 16.8 7 14 7c-2 0-3.7 1-4.7 2.5C8.5 9.2 7.8 9 7 9 4.8 9 3 10.8 3 13s1.8 4 4 4h12c1.1 0 2-.9 2-2s-.9-2-2-2z" opacity="0.7"/></svg>`;
    case 'rainy':
    case 'pouring':
    case 'lightning-rainy':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M16 13V7a4 4 0 0 0-8 0v6"/><path d="M8 17l-2 4M12 17l-2 4M16 17l-2 4"/></svg>`;
    case 'snowy':
    case 'snowy-rainy':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M16 13V7a4 4 0 0 0-8 0v6"/><circle cx="8" cy="19" r="1" fill="${c}"/><circle cx="12" cy="21" r="1" fill="${c}"/><circle cx="16" cy="19" r="1" fill="${c}"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>`;
  }
}
