/**
 * Unified Storage Layer
 *
 * Manages the HDP configuration across two persistence layers:
 *   1. localStorage — fast, works immediately, used as primary cache
 *   2. Lovelace config — durable, survives HA restarts, used for cross-device sync
 *
 * Also handles migration from v3 localStorage keys.
 */

import type { HDPConfig, StoredVisualConfig, BlueprintInstance } from '../types';

const LS_KEY = 'hdp_config';
const LS_MIGRATED = 'hdp_v3_migrated';
const LS_V3_VISUAL = 'hdp_visual_config';

// ─── Default Config ────────────────────────────────────────────────────────

export function getDefaultConfig(): HDPConfig {
  return {
    dashboard: {
      name: '智能家居',
      icon: 'mdi:home',
    },
    home: {
      section_order: ['status_badges', 'people', 'environment', 'power_usage', 'favorites', 'summary'],
      hidden_sections: [],
      hidden_info_cards: [],
    },
    header: {
      show_time: true,
      show_weather: true,
      show_notifications: true,
      weather_entity: '',
      alarm_entity: '',
    },
    people: {
      hidden_persons: [],
    },
    areas: {
      hidden_areas: [],
      area_order: [],
      hide_unavailable: false,
    },
    devices: {
      hidden_domains: [],
      hidden_device_types: [],
    },
    blueprints: {
      pages: [],
      replacements: {},
    },
    visual: {
      theme_id: 'light',
      card_style: 'classic',
      colors: {},
      border_radius: 10,
      card_padding: 16,
      card_gap: 12,
      font_family: '',
      shadows: true,
    },
    permissions: {
      restrict_non_admin: false,
      restrict_settings: false,
    },
  };
}

// ─── Load / Save ───────────────────────────────────────────────────────────

/**
 * Load the full HDPConfig from localStorage, falling back to defaults.
 * Called during strategy generate() time (server-side, synchronous).
 */
export function loadConfig(): HDPConfig {
  const defaults = getDefaultConfig();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      // Check for v3 migration
      const migrated = migrateV3Config();
      if (migrated) {
        saveConfig(migrated);
        return migrated;
      }
      return defaults;
    }
    const stored = JSON.parse(raw) as Partial<HDPConfig>;
    return deepMerge(defaults, stored) as HDPConfig;
  } catch {
    return defaults;
  }
}

/**
 * Save a partial config update to localStorage.
 * Returns the merged full config.
 */
export function saveConfig(partial: Partial<HDPConfig>): HDPConfig {
  const current = loadConfig();
  const merged = deepMerge(current, partial) as HDPConfig;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(merged));
  } catch (e) {
    console.error('[HDP Storage] Save failed:', e);
  }
  return merged;
}

/**
 * Generate client-side JS for config load/save.
 * This is embedded in html-pro-card scripts.
 */
export function generateStorageJS(): string {
  return `
function hdpLoadConfig() {
  var defaults = ${JSON.stringify(getDefaultConfig())};
  try {
    var raw = localStorage.getItem('hdp_config');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return hdpDeepMerge(defaults, parsed);
      }
    }
  } catch(e) {}
  return defaults;
}

function hdpSaveConfig(partial) {
  var current = hdpLoadConfig();
  var merged = hdpDeepMerge(current, partial);
  try {
    localStorage.setItem('hdp_config', JSON.stringify(merged));
  } catch(e) {
    console.error('[HDP] Save failed:', e);
  }
  return merged;
}

function hdpDeepMerge(target, source) {
  var result = Object.assign({}, target);
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = hdpDeepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  return result;
}

function hdpClearConfig() {
  try {
    localStorage.removeItem('hdp_config');
    localStorage.removeItem('hdp_visual_config');
  } catch(e) {}
}
`;
}

// ─── v3 Migration ──────────────────────────────────────────────────────────

function migrateV3Config(): HDPConfig | null {
  if (typeof localStorage === 'undefined') return null;
  if (localStorage.getItem(LS_MIGRATED)) return null;

  try {
    const raw = localStorage.getItem(LS_V3_VISUAL);
    if (!raw) return null;

    const v3 = JSON.parse(raw);
    const config = getDefaultConfig();

    // Map v3 visual config to v4 format
    if (v3.theme) config.visual.theme_id = v3.theme;
    if (v3.card_style) config.visual.card_style = v3.card_style;
    if (v3.border_radius != null) config.visual.border_radius = v3.border_radius;
    if (v3.card_padding != null) config.visual.card_padding = v3.card_padding;
    if (v3.card_gap != null) config.visual.card_gap = v3.card_gap;
    if (v3.font_family) config.visual.font_family = v3.font_family;
    if (v3.shadows != null) config.visual.shadows = v3.shadows;
    if (v3.colors) config.visual.colors = { ...v3.colors };

    localStorage.setItem(LS_MIGRATED, 'true');
    return config;
  } catch {
    localStorage.setItem(LS_MIGRATED, 'true');
    return null;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function deepMerge(target: unknown, source: unknown): unknown {
  if (source === null || source === undefined) return target;
  if (typeof target !== 'object' || typeof source !== 'object') return source;
  if (Array.isArray(target) || Array.isArray(source)) return source;

  const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };
  for (const key of Object.keys(source as Record<string, unknown>)) {
    const val = (source as Record<string, unknown>)[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = deepMerge(result[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
