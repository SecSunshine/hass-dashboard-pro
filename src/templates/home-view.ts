/**
 * Template: Home Dashboard View
 *
 * Generates the home overview page with:
 * - Welcome card (greeting + environment stats)
 * - Quick actions (lights, climate, scenes)
 * - Status summary grid (lights count, climate, power, security)
 * - Favorite entities
 *
 * All visual properties use CSS variables (--hdp-*) injected by generateDesignTokenCSS().
 * This enables runtime theme switching via the Settings page.
 */

import type { Hass, LovelaceCardConfig, StrategyConfig } from '../types';
import { generateDesignTokenCSS } from '../styles/design-tokens';
import type { ResolvedTokens } from '../utils/visual-config';

export function buildHomeView(hass: Hass, _config: StrategyConfig, tokens?: ResolvedTokens): LovelaceCardConfig[] {
  const greeting = getGreeting();

  return [
    buildWelcomeCard(hass, greeting, tokens),
    buildQuickActions(tokens),
    buildStatusGrid(hass, tokens),
  ];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

// ─── Welcome Card ─────────────────────────────────────────────────────────

function buildWelcomeCard(hass: Hass, greeting: string, tokens?: ResolvedTokens): LovelaceCardConfig {
  const indoors = getIndoorEnv(hass);
  const userName = hass.user?.name || '';

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .welcome-card {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-spacing-xxl);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--hdp-spacing-xxl);
    box-shadow: var(--hdp-shadow-card);
  }
  .welcome-left { display: flex; flex-direction: column; gap: var(--hdp-spacing-md); }
  .welcome-greeting { font-size: 28px; font-weight: 700; color: var(--hdp-text); }
  .welcome-subtitle { font-size: 14px; color: var(--hdp-text-secondary); }
  .stats-row { display: flex; gap: 32px; margin-top: 4px; }
  .stat-item { display: flex; flex-direction: column; gap: 2px; }
  .stat-value { font-size: 20px; font-weight: 700; color: var(--hdp-primary); }
  .stat-label { font-size: 11px; font-weight: 500; color: var(--hdp-text-muted); }
  .stat-value--good { color: var(--hdp-success); }
  .welcome-right { display: flex; gap: 12px; align-items: center; }
  .quick-btn {
    width: 48px; height: 48px; border-radius: 50%; border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: transform 0.15s ease;
  }
  .quick-btn:active { transform: scale(0.92); }
  .quick-btn--primary { background: var(--hdp-primary); }
  .quick-btn--ghost { background: var(--hdp-divider); }
  .quick-btn svg { width: 22px; height: 22px; }
  .quick-btn--primary svg path { fill: var(--hdp-text-inverse); }
  .quick-btn--ghost svg path { fill: var(--hdp-text-secondary); }
</style>
<div class="welcome-card">
  <div class="welcome-left">
    <div class="welcome-greeting">${greeting}${userName ? `，${userName}` : ''}</div>
    <div class="welcome-subtitle">室内温度 ${indoors.temp} · 湿度 ${indoors.humidity} · 空气质量 ${indoors.airQuality}</div>
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-value">${indoors.temp}</div>
        <div class="stat-label">温度</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${indoors.humidity}</div>
        <div class="stat-label">湿度</div>
      </div>
      <div class="stat-item">
        <div class="stat-value stat-value--good">${indoors.airQuality}</div>
        <div class="stat-label">空气质量</div>
      </div>
    </div>
  </div>
  <div class="welcome-right">
    <div class="quick-btn quick-btn--primary" title="灯光">${ICONS.light}</div>
    <div class="quick-btn quick-btn--ghost" title="空调">${ICONS.climate}</div>
    <div class="quick-btn quick-btn--ghost" title="音乐">${ICONS.music}</div>
  </div>
</div>`,
  };
}

function getIndoorEnv(hass: Hass): { temp: string; humidity: string; airQuality: string } {
  let temp = '--°C';
  let humidity = '--%';
  let airQuality = '--';

  for (const [entityId, stateObj] of Object.entries(hass.states)) {
    const domain = entityId.split('.')[0];
    if (domain === 'sensor') {
      const uom = stateObj.attributes.unit_of_measurement as string;
      if (uom === '°C' && temp === '--°C') temp = `${stateObj.state}°C`;
      if (uom === '%' && humidity === '--%') humidity = `${stateObj.state}%`;
      if ((entityId.includes('pm25') || entityId.includes('air_quality')) && airQuality === '--') {
        const val = Number(stateObj.state);
        airQuality = val <= 35 ? '优' : val <= 75 ? '良' : '差';
      }
    }
  }
  return { temp, humidity, airQuality };
}

// ─── Quick Actions ────────────────────────────────────────────────────────

function buildQuickActions(tokens?: ResolvedTokens): LovelaceCardConfig {
  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .quick-actions { display: flex; gap: var(--hdp-card-padding); flex-wrap: wrap; }
  .qa-item {
    background: var(--hdp-card-bg); border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding); display: flex; flex-direction: column;
    gap: 8px; flex: 1; min-width: 200px;
    box-shadow: var(--hdp-shadow-card);
  }
  .qa-icon { width: 24px; height: 24px; }
  .qa-value { font-size: 24px; font-weight: 700; color: var(--hdp-text); }
  .qa-label { font-size: 12px; font-weight: 500; color: var(--hdp-text-secondary); }
</style>
<div class="quick-actions">
  <ha-card style="--ha-card-box-shadow: none; margin: 0; border: none;">
    <div class="qa-item">
      <div class="qa-icon">${ICONS.light24}</div>
      <div class="qa-value">灯光</div>
      <div class="qa-label">点击控制全屋灯光</div>
    </div>
  </ha-card>
  <ha-card style="--ha-card-box-shadow: none; margin: 0; border: none;">
    <div class="qa-item">
      <div class="qa-icon">${ICONS.climate24}</div>
      <div class="qa-value">空调</div>
      <div class="qa-label">调节室内温度</div>
    </div>
  </ha-card>
  <ha-card style="--ha-card-box-shadow: none; margin: 0; border: none;">
    <div class="qa-item">
      <div class="qa-icon">${ICONS.curtain24}</div>
      <div class="qa-value">窗帘</div>
      <div class="qa-label">控制智能窗帘</div>
    </div>
  </ha-card>
</div>`,
  };
}

// ─── Status Grid Cards ────────────────────────────────────────────────────

function buildStatusGrid(hass: Hass, tokens?: ResolvedTokens): LovelaceCardConfig {
  const counts = getDomainCounts(hass);

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .status-grid { display: flex; gap: var(--hdp-card-padding); }
  .status-card {
    background: var(--hdp-card-bg); border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding); display: flex; flex-direction: column;
    gap: 8px; flex: 1; box-shadow: var(--hdp-shadow-card);
  }
  .sc-icon { width: 24px; height: 24px; }
  .sc-value { font-size: 24px; font-weight: 700; color: var(--hdp-text); }
  .sc-label { font-size: 12px; font-weight: 500; color: var(--hdp-text-secondary); }
</style>
<div class="status-grid">
  <div class="status-card">
    <div class="sc-icon">${ICONS.light24}</div>
    <div class="sc-value">${counts.lights.on}/${counts.lights.total}</div>
    <div class="sc-label">灯光开启</div>
  </div>
  <div class="status-card">
    <div class="sc-icon">${ICONS.climate24}</div>
    <div class="sc-value">${counts.climate}</div>
    <div class="sc-label">空调运行</div>
  </div>
  <div class="status-card">
    <div class="sc-icon">${ICONS.power24}</div>
    <div class="sc-value">${counts.power}</div>
    <div class="sc-label">实时功率</div>
  </div>
  <div class="status-card">
    <div class="sc-icon">${ICONS.security24}</div>
    <div class="sc-value">正常</div>
    <div class="sc-label">安防状态</div>
  </div>
</div>`,
  };
}

function getDomainCounts(hass: Hass) {
  let lightsOn = 0;
  let lightsTotal = 0;
  let climateActive = 0;
  let power = '-- kW';

  for (const [entityId, stateObj] of Object.entries(hass.states)) {
    const domain = entityId.split('.')[0];
    const state = stateObj.state;

    if (domain === 'light') {
      lightsTotal++;
      if (state === 'on') lightsOn++;
    }
    if (domain === 'climate' && state !== 'off') climateActive++;
    if (domain === 'sensor') {
      const uom = stateObj.attributes.unit_of_measurement as string;
      if ((uom === 'W' || uom === 'kW') && (entityId.includes('power') || entityId.includes('energy'))) {
        const val = parseFloat(state);
        power = uom === 'W' ? `${(val / 1000).toFixed(1)}kW` : `${val.toFixed(1)}kW`;
      }
    }
  }

  return { lights: { on: lightsOn, total: lightsTotal }, climate: climateActive, power };
}

// ─── SVG Icon Set ─────────────────────────────────────────────────────────

const ICONS = {
  light: `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" fill="currentColor"/></svg>`,
  climate: `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4z" fill="currentColor"/></svg>`,
  music: `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/></svg>`,
  light24: `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" fill="#F59E0B"/></svg>`,
  climate24: `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4z" fill="#3B82F6"/></svg>`,
  curtain24: `<svg width="24" height="24" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="1" stroke="#8B5CF6" stroke-width="2" fill="none"/><line x1="12" y1="3" x2="12" y2="21" stroke="#8B5CF6" stroke-width="2"/></svg>`,
  power24: `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z" fill="#8B5CF6"/></svg>`,
  security24: `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="#16A34A"/></svg>`,
};
