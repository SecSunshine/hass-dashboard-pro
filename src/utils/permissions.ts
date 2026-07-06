import type { Hass, StrategyConfig } from '../types';

export function shouldShowSettings(hass: Hass, config: StrategyConfig): boolean {
  const permissions = config.hdp_config?.permissions;
  if (permissions?.restrict_settings) return false;
  if (permissions?.restrict_non_admin && hass.user?.is_admin === false) return false;
  return true;
}
