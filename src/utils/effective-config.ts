import type { HDPConfig, StrategyConfig } from '../types';

const HDP_CONFIG_KEY = 'hdp_config';
const HDP_CONFIG_PENDING_KEY = 'hdp_config_pending_sync';
const HDP_CONFIG_LOCAL_OVERRIDE_KEY = 'hdp_config_local_override_at';
const LOCAL_OVERRIDE_TTL_MS = 5 * 60 * 1000;

export function getEffectiveStrategyConfig(config: StrategyConfig): StrategyConfig {
  const hdpConfig = getEffectiveHDPConfig(config);
  return hdpConfig ? { ...config, hdp_config: hdpConfig } : config;
}

export function getEffectiveHDPConfig(config: StrategyConfig): Partial<HDPConfig> | undefined {
  const localConfig = readLocalHDPConfig();
  const strategyConfig = config.hdp_config || {};
  if (!localConfig) return Object.keys(strategyConfig).length ? strategyConfig : config.hdp_config;
  if (!Object.keys(strategyConfig).length) return localConfig;
  if (!isLocalHDPConfigPending()) {
    // A strategy refresh can briefly lag behind the successful Lovelace save.
    // Keep the freshly saved home/card configuration for this first reload.
    if (hasRecentLocalOverride()) {
      const merged = deepMerge(strategyConfig, localConfig) as Partial<HDPConfig>;
      if (strategyConfig.permissions) merged.permissions = strategyConfig.permissions;
      return merged;
    }
    // Dashboard images are browser-local presentation settings. Keep the user's
    // latest saved avatar/background even while HA serves a cached strategy.
    const localDashboard = localConfig.dashboard;
    if (!localDashboard || typeof localDashboard !== 'object') return strategyConfig;
    const dashboard = { ...(strategyConfig.dashboard || {}) };
    if ('avatar_url' in localDashboard) dashboard.avatar_url = localDashboard.avatar_url;
    if ('background_image_url' in localDashboard) dashboard.background_image_url = localDashboard.background_image_url;
    return { ...strategyConfig, dashboard } as Partial<HDPConfig>;
  }
  const merged = deepMerge(strategyConfig, localConfig) as Partial<HDPConfig>;
  if (strategyConfig.permissions) merged.permissions = strategyConfig.permissions;
  return merged;
}

function hasRecentLocalOverride(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const savedAt = Number(localStorage.getItem(HDP_CONFIG_LOCAL_OVERRIDE_KEY));
    const age = Date.now() - savedAt;
    return Number.isFinite(savedAt) && savedAt > 0 && age >= 0 && age < LOCAL_OVERRIDE_TTL_MS;
  } catch {
    return false;
  }
}

export function readLocalHDPConfig(): Partial<HDPConfig> | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(HDP_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Partial<HDPConfig>
      : null;
  } catch {
    return null;
  }
}

function isLocalHDPConfigPending(): boolean {
  try {
    return typeof localStorage !== 'undefined'
      && localStorage.getItem(HDP_CONFIG_PENDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function deepMerge(target: unknown, source: unknown): unknown {
  if (source === null || source === undefined) return target;
  if (target === null || target === undefined) return source;
  if (typeof target !== 'object' || typeof source !== 'object') return source;
  if (Array.isArray(target) || Array.isArray(source)) return source;

  const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };
  for (const key of Object.keys(source as Record<string, unknown>)) {
    result[key] = deepMerge(result[key], (source as Record<string, unknown>)[key]);
  }
  return result;
}
