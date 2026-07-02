import type { HDPConfig, StrategyConfig } from '../types';

const HDP_CONFIG_KEY = 'hdp_config';

export function getEffectiveStrategyConfig(config: StrategyConfig): StrategyConfig {
  const hdpConfig = getEffectiveHDPConfig(config);
  return hdpConfig ? { ...config, hdp_config: hdpConfig } : config;
}

export function getEffectiveHDPConfig(config: StrategyConfig): Partial<HDPConfig> | undefined {
  const localConfig = readLocalHDPConfig();
  const strategyConfig = config.hdp_config || {};
  const merged = deepMerge(strategyConfig, localConfig || {}) as Partial<HDPConfig>;
  return Object.keys(merged).length > 0 ? merged : config.hdp_config;
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
