/**
 * Portable share-code schema for dashboard replication.
 */

import type { BlueprintInstance, HDPConfig } from '../types';
import type { StoredVisualConfig } from './visual-config';
import { applyEntityMapping, buildEntityMapping, extractEntityIds, type EntityMappingResult } from './entity-mapper';
import type { Hass } from '../types';

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
  return {
    bundle,
    mapping,
    hdp_config: applyEntityMapping(bundle.hdp_config, mapping.mapping),
    visual_config: bundle.visual_config,
    blueprints: applyEntityMapping(bundle.blueprints || [], mapping.mapping),
  };
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
