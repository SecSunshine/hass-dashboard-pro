/**
 * Portable share-code schema for dashboard replication.
 */

import type { BlueprintInstance, HDPConfig } from '../types';
import type { StoredVisualConfig } from './visual-config';
import { applyEntityMapping, buildEntityMapping, extractEntityIds, type EntityMappingResult } from './entity-mapper';
import type { Hass } from '../types';
import { sanitizeCardSkin } from './card-skin';

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
