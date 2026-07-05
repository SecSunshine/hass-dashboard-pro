/**
 * Portable share-code schema for dashboard replication.
 */

import type { BlueprintInstance, HDPConfig } from '../types';
import type { StoredVisualConfig } from './visual-config';
import { applyEntityMapping, buildEntityMapping, extractEntityIds, type EntityMappingResult } from './entity-mapper';
import type { Hass } from '../types';
import { CARD_SKINS, sanitizeCardSkin } from './card-skin';
import { sanitizeBentoSize, sanitizeLayoutDensity } from './bento-layout';
import { MOOD_PRESETS } from '../themes/palette-generator';

export const SHARE_CODE_PREFIX = 'HDP1.';
export const SHARE_SCHEMA = 'hass-dashboard-pro.share.v1';

export interface DashboardShareBundle {
  schema: typeof SHARE_SCHEMA;
  version: 1;
  exported_at: string;
  name?: string;
  hdp_config?: Partial<HDPConfig>;
  visual_config?: StoredVisualConfig;
  blueprints?: BlueprintInstance[];
  source_entities: string[];
}

export interface ImportedShareBundle {
  bundle: DashboardShareBundle;
  mapping: EntityMappingResult;
  hdp_config?: Partial<HDPConfig>;
  visual_config?: StoredVisualConfig;
  blueprints?: BlueprintInstance[];
}

export function createShareBundle(input: {
  name?: string;
  hdp_config?: Partial<HDPConfig>;
  visual_config?: StoredVisualConfig | null;
  blueprints?: BlueprintInstance[];
  exported_at?: string;
}): DashboardShareBundle {
  const source = {
    hdp_config: input.hdp_config,
    visual_config: input.visual_config || undefined,
    blueprints: input.blueprints || [],
  };

  return {
    schema: SHARE_SCHEMA,
    version: 1,
    exported_at: input.exported_at || new Date().toISOString(),
    name: input.name,
    hdp_config: input.hdp_config,
    visual_config: input.visual_config || undefined,
    blueprints: input.blueprints || [],
    source_entities: extractEntityIds(source),
  };
}

export function encodeShareCode(bundle: DashboardShareBundle): string {
  return `${SHARE_CODE_PREFIX}${base64UrlEncode(JSON.stringify(bundle))}`;
}

export function decodeShareCode(code: string): DashboardShareBundle {
  const trimmed = String(code || '').trim();
  if (!trimmed.startsWith(SHARE_CODE_PREFIX)) {
    throw new Error('Invalid hass-dashboard-pro share code prefix');
  }

  const json = base64UrlDecode(trimmed.slice(SHARE_CODE_PREFIX.length));
  const bundle = JSON.parse(json) as DashboardShareBundle;
  if (bundle.schema !== SHARE_SCHEMA || bundle.version !== 1) {
    throw new Error('Unsupported hass-dashboard-pro share code version');
  }
  return bundle;
}

export function importShareBundle(bundle: DashboardShareBundle, hass: Hass): ImportedShareBundle {
  const mapping = buildEntityMapping(bundle.source_entities || extractEntityIds(bundle), hass);
  const blueprints = normalizeBlueprints(applyEntityMapping(bundle.blueprints || [], mapping.mapping));
  const hdpConfig = normalizeHDPConfig(applyEntityMapping(bundle.hdp_config, mapping.mapping));
  return {
    bundle,
    mapping,
    hdp_config: hdpConfig,
    visual_config: normalizeVisualConfig(bundle.visual_config),
    blueprints,
  };
}

function normalizeHDPConfig(config: unknown): Partial<HDPConfig> | undefined {
  if (!isRecord(config)) return undefined;
  const normalized = { ...config } as Record<string, unknown>;

  if ('visual' in normalized) {
    const visual = normalizeVisualConfig(normalized.visual);
    if (visual) normalized.visual = visual;
    else delete normalized.visual;
  }

  if (isRecord(normalized.areas)) {
    normalized.areas = {
      ...normalized.areas,
      hidden_areas: normalizeStringArray(normalized.areas.hidden_areas),
      area_order: normalizeStringArray(normalized.areas.area_order),
    };
  }

  if (isRecord(normalized.devices)) {
    normalized.devices = {
      ...normalized.devices,
      hidden_domains: normalizeStringArray(normalized.devices.hidden_domains),
      hidden_device_types: normalizeStringArray(normalized.devices.hidden_device_types),
    };
  }

  if (isRecord(normalized.people)) {
    normalized.people = {
      ...normalized.people,
      hidden_persons: normalizeStringArray(normalized.people.hidden_persons),
    };
  }

  if (isRecord(normalized.home)) {
    normalized.home = {
      ...normalized.home,
      section_order: normalizeStringArray(normalized.home.section_order),
      hidden_sections: normalizeStringArray(normalized.home.hidden_sections),
      hidden_info_cards: normalizeStringArray(normalized.home.hidden_info_cards),
    };
  }

  if (isRecord(normalized.blueprints)) {
    const replacements = isRecord(normalized.blueprints.replacements)
      ? normalized.blueprints.replacements
      : {};
    normalized.blueprints = {
      ...normalized.blueprints,
      pages: normalizeBlueprints(normalized.blueprints.pages),
      replacements,
    };
  }

  return normalized as Partial<HDPConfig>;
}

function normalizeVisualConfig(config: unknown): StoredVisualConfig | undefined {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return undefined;
  const normalized = { ...(config as Record<string, unknown>) };
  if (normalized.card_style) normalized.card_style = sanitizeCardSkin(normalized.card_style);
  if (normalized.layout_density) normalized.layout_density = sanitizeLayoutDensity(normalized.layout_density);
  const cardSizes = normalizeCardSizes(normalized.card_sizes);
  if (cardSizes) normalized.card_sizes = cardSizes;
  else delete normalized.card_sizes;
  const areaSkins = normalizeSkinMap(normalized.area_skins);
  if (areaSkins) normalized.area_skins = areaSkins;
  else delete normalized.area_skins;
  const timeMoods = normalizeTimeMoods(normalized.time_moods);
  if (timeMoods) normalized.time_moods = timeMoods;
  else delete normalized.time_moods;
  return normalized as StoredVisualConfig;
}

function normalizeBlueprints(value: unknown): BlueprintInstance[] {
  if (!Array.isArray(value)) return [];
  return value.filter((page): page is BlueprintInstance => {
    if (!page || typeof page !== 'object') return false;
    const candidate = page as Partial<BlueprintInstance>;
    return typeof candidate.id === 'string'
      && typeof candidate.name === 'string'
      && typeof candidate.blueprint_yaml === 'string'
      && typeof candidate.card === 'object'
      && candidate.card !== null;
  }).map(page => ({
    ...page,
    icon: typeof page.icon === 'string' ? page.icon : 'mdi:puzzle',
    inputs: page.inputs && typeof page.inputs === 'object' && !Array.isArray(page.inputs) ? page.inputs : {},
  }));
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

function normalizeCardSizes(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const result: Record<string, string> = {};
  for (const [key, size] of Object.entries(value)) {
    if (!key || typeof size !== 'string' || sanitizeBentoSize(size, 'md') !== size) continue;
    result[key] = size;
  }
  return Object.keys(result).length ? result : undefined;
}

function normalizeSkinMap(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const result: Record<string, string> = {};
  for (const [key, skin] of Object.entries(value)) {
    if (!key || typeof skin !== 'string') continue;
    if (!(CARD_SKINS as readonly string[]).includes(skin)) continue;
    result[key] = skin;
  }
  return Object.keys(result).length ? result : undefined;
}

function normalizeTimeMoods(value: unknown): StoredVisualConfig['time_moods'] | undefined {
  if (!isRecord(value)) return undefined;
  const allowedPeriods = ['dawn', 'day', 'dusk', 'night', 'midnight'] as const;
  const allowedMoods = new Set(MOOD_PRESETS.map(mood => mood.id));
  const result: StoredVisualConfig['time_moods'] = {};
  for (const period of allowedPeriods) {
    const mood = value[period];
    if (typeof mood === 'string' && allowedMoods.has(mood)) result[period] = mood;
  }
  return Object.keys(result).length ? result : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function base64UrlEncode(value: string): string {
  const buffer = (globalThis as unknown as { Buffer?: { from: (value: string, encoding: string) => { toString: (encoding: string) => string } } }).Buffer;
  const encoded = buffer
    ? buffer.from(value, 'utf8').toString('base64')
    : btoa(unescape(encodeURIComponent(value)));
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const buffer = (globalThis as unknown as { Buffer?: { from: (value: string, encoding: string) => { toString: (encoding: string) => string } } }).Buffer;
  return buffer
    ? buffer.from(padded, 'base64').toString('utf8')
    : decodeURIComponent(escape(atob(padded)));
}
