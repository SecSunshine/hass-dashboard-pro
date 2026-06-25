/**
 * Template: Home Dashboard View (v2.0)
 *
 * Generates the home overview page with:
 * - Gradient welcome card (greeting + environment stats + quick actions)
 * - Quick control strip (lights, climate, curtains with live indicators)
 * - Status monitoring grid (power, security with trend badges & progress bars)
 * - Scenes preview row
 *
 * All visual properties use CSS variables (--hdp-*) injected by generateDesignTokenCSS().
 */

import type { Hass, LovelaceCardConfig, StrategyConfig } from '../types';
import { generateDesignTokenCSS } from '../styles/design-tokens';
import type { ResolvedTokens } from '../utils/visual-config';

export function buildHomeView(hass: Hass, _config: StrategyConfig, tokens?: ResolvedTokens): LovelaceCardConfig[] {
  const greeting = getGreeting();
  const userName = hass.user?.name || '';

  return [
    buildWelcomeCard(hass, greeting, userName, tokens),
    buildQuickStrip(hass, tokens),
    buildStatusGrid(hass, tokens),
    buildScenesPreview(tokens),
  ];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

// ─── Gradient Welcome Card ────────────────────────────────────────────────

function buildWelcomeCard(hass: Hass, greeting: string, userName: string, tokens?: ResolvedTokens): LovelaceCardConfig {
  const indoors = getIndoorEnv(hass);

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .welcome-card {
    background: var(--hdp-gradient-primary);
    border-radius: var(--hdp-radius-lg);
    padding: 28px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 20px var(--hdp-primary-glow);
  }
  .welcome-card::before {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 40%; height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 100%);
  }
  .welcome-card::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.15);
  }
  .welcome-content {
    position: relative; z-index: 1;
    display: flex; justify-content: space-between; align-items: flex-start;
  }
  .welcome-left { flex: 1; }
  .welcome-greeting {
    font-size: 24px; font-weight: 700; color: white;
    letter-spacing: -0.3px; margin-bottom: 6px;
  }
  .welcome-subtitle {
    font-size: 13px; color: rgba(255,255,255,0.75);
    font-weight: 400; margin-bottom: 20px;
  }
  .welcome-stats { display: flex; gap: 24px; }
  .welcome-stat { display: flex; flex-direction: column; gap: 2px; }
  .welcome-stat-value {
    font-size: 20px; font-weight: 700; color: white;
    letter-spacing: -0.3px;
  }
  .welcome-stat-label {
    font-size: 11px; font-weight: 500;
    color: rgba(255,255,255,0.6);
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .welcome-right { display: flex; gap: 10px; }
  .welcome-action-btn {
    width: 48px; height: 48px; border-radius: 14px;
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: var(--hdp-transition);
    color: white;
  }
  .welcome-action-btn:hover {
    background: rgba(255,255,255,0.28);
    transform: translateY(-2px);
  }
  .welcome-action-btn svg { width: 20px; height: 20px; }
  @media (max-width: 480px) {
    .welcome-right { display: none; }
    .welcome-stats { gap: 12px; }
    .welcome-stat-value { font-size: 17px; }
    .welcome-card { padding: 22px; }
  }
</style>
<div class="welcome-card">
  <div class="welcome-content">
    <div class="welcome-left">
      <div class="welcome-greeting">${greeting}${userName ? '，' + userName : ''}</div>
      <div class="welcome-subtitle">室内环境舒适，所有设备运行正常</div>
      <div class="welcome-stats">
        <div class="welcome-stat">
          <div class="welcome-stat-value">${indoors.temp}</div>
          <div class="welcome-stat-label">温度</div>
        </div>
        <div class="welcome-stat">
          <div class="welcome-stat-value">${indoors.humidity}</div>
          <div class="welcome-stat-label">湿度</div>
        </div>
        <div class="welcome-stat">
          <div class="welcome-stat-value">${indoors.airQuality}</div>
          <div class="welcome-stat-label">空气</div>
        </div>
      </div>
    </div>
    <div class="welcome-right">
      <div class="welcome-action-btn" title="灯光">${ICONS.lightWhite}</div>
      <div class="welcome-action-btn" title="空调">${ICONS.climateWhite}</div>
      <div class="welcome-action-btn" title="音乐">${ICONS.musicWhite}</div>
    </div>
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

// ─── Quick Control Strip ──────────────────────────────────────────────────

function buildQuickStrip(hass: Hass, tokens?: ResolvedTokens): LovelaceCardConfig {
  const counts = getDomainCounts(hass);

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .quick-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--hdp-card-gap);
  }
  .quick-card {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    border: 1px solid var(--hdp-border);
    cursor: pointer;
    transition: var(--hdp-transition);
    position: relative; overflow: hidden;
  }
  .quick-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--hdp-shadow-elevated);
    border-color: transparent;
  }
  .quick-card-indicator {
    position: absolute;
    top: var(--hdp-card-padding); right: var(--hdp-card-padding);
    width: 8px; height: 8px; border-radius: 50%;
  }
  .quick-card-indicator--on {
    background: var(--hdp-success);
    box-shadow: 0 0 0 3px var(--hdp-success-light);
  }
  .quick-card-indicator--off {
    background: var(--hdp-text-muted);
  }
  .quick-card-icon {
    width: 42px; height: 42px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 14px;
  }
  .quick-card-icon svg { width: 22px; height: 22px; }
  .quick-card-icon--lights { background: var(--hdp-warning-light); color: var(--hdp-warning); }
  .quick-card-icon--climate { background: var(--hdp-primary-light); color: var(--hdp-primary); }
  .quick-card-icon--curtain { background: rgba(124,110,247,0.1); color: var(--hdp-accent-violet); }
  .quick-card-value {
    font-size: 22px; font-weight: 700; color: var(--hdp-text);
    letter-spacing: -0.3px; margin-bottom: 2px;
  }
  .quick-card-label {
    font-size: 12px; font-weight: 500; color: var(--hdp-text-muted);
  }
  @media (max-width: 480px) {
    .quick-card { padding: 14px; }
    .quick-card-value { font-size: 18px; }
    .quick-card-icon { width: 36px; height: 36px; margin-bottom: 10px; }
  }
</style>
<div class="quick-strip">
  <div class="quick-card">
    <div class="quick-card-indicator ${counts.lights.on > 0 ? 'quick-card-indicator--on' : 'quick-card-indicator--off'}"></div>
    <div class="quick-card-icon quick-card-icon--lights">${ICONS.light24}</div>
    <div class="quick-card-value">${counts.lights.on}/${counts.lights.total}</div>
    <div class="quick-card-label">灯光开启</div>
  </div>
  <div class="quick-card">
    <div class="quick-card-indicator ${counts.climate > 0 ? 'quick-card-indicator--on' : 'quick-card-indicator--off'}"></div>
    <div class="quick-card-icon quick-card-icon--climate">${ICONS.climate24}</div>
    <div class="quick-card-value">${counts.climate}</div>
    <div class="quick-card-label">空调运行</div>
  </div>
  <div class="quick-card">
    <div class="quick-card-indicator quick-card-indicator--off"></div>
    <div class="quick-card-icon quick-card-icon--curtain">${ICONS.curtain24}</div>
    <div class="quick-card-value">关闭</div>
    <div class="quick-card-label">窗帘状态</div>
  </div>
</div>`,
  };
}

// ─── Status Monitoring Grid ───────────────────────────────────────────────

function buildStatusGrid(hass: Hass, tokens?: ResolvedTokens): LovelaceCardConfig {
  const power = getPowerReading(hass);

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px; margin-top: 6px;
  }
  .section-title {
    font-size: 16px; font-weight: 700; color: var(--hdp-text);
    letter-spacing: -0.2px;
  }
  .section-action {
    font-size: 13px; font-weight: 600; color: var(--hdp-primary);
    cursor: pointer; transition: var(--hdp-transition);
    padding: 4px 10px; border-radius: var(--hdp-radius-sm);
  }
  .section-action:hover { background: var(--hdp-primary-light); }
  .status-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--hdp-card-gap);
  }
  .status-card {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    border: 1px solid var(--hdp-border);
    transition: var(--hdp-transition);
  }
  .status-card-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px;
  }
  .status-card-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .status-card-icon svg { width: 18px; height: 18px; }
  .status-card-trend {
    font-size: 11px; font-weight: 600;
    padding: 3px 8px; border-radius: var(--hdp-radius-pill);
  }
  .trend--up { background: var(--hdp-success-light); color: var(--hdp-success); }
  .trend--stable { background: var(--hdp-primary-light); color: var(--hdp-primary); }
  .status-card-value {
    font-size: 28px; font-weight: 700; color: var(--hdp-text);
    letter-spacing: -0.5px; line-height: 1; margin-bottom: 4px;
  }
  .status-card-label {
    font-size: 12px; font-weight: 500; color: var(--hdp-text-muted);
  }
  .status-card-bar {
    margin-top: 12px; height: 4px; border-radius: 2px;
    background: var(--hdp-divider); overflow: hidden;
  }
  .status-card-bar-fill {
    height: 100%; border-radius: 2px;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @media (max-width: 768px) {
    .status-grid { grid-template-columns: 1fr; }
  }
</style>
<div class="section-header">
  <div class="section-title">实时监控</div>
</div>
<div class="status-grid">
  <div class="status-card">
    <div class="status-card-header">
      <div class="status-card-icon" style="background: var(--hdp-primary-light); color: var(--hdp-primary);">
        ${ICONS.power18}
      </div>
      <div class="status-card-trend trend--up">+12%</div>
    </div>
    <div class="status-card-value">${power}</div>
    <div class="status-card-label">实时功率</div>
    <div class="status-card-bar">
      <div class="status-card-bar-fill" style="width: 45%; background: var(--hdp-gradient-primary);"></div>
    </div>
  </div>
  <div class="status-card">
    <div class="status-card-header">
      <div class="status-card-icon" style="background: var(--hdp-success-light); color: var(--hdp-success);">
        ${ICONS.security18}
      </div>
      <div class="status-card-trend trend--stable">正常</div>
    </div>
    <div class="status-card-value">布防</div>
    <div class="status-card-label">安防状态</div>
    <div class="status-card-bar">
      <div class="status-card-bar-fill" style="width: 100%; background: var(--hdp-gradient-green);"></div>
    </div>
  </div>
</div>`,
  };
}

function getPowerReading(hass: Hass): string {
  for (const [entityId, stateObj] of Object.entries(hass.states)) {
    const domain = entityId.split('.')[0];
    if (domain === 'sensor') {
      const uom = stateObj.attributes.unit_of_measurement as string;
      if ((uom === 'W' || uom === 'kW') && (entityId.includes('power') || entityId.includes('energy'))) {
        const val = parseFloat(stateObj.state);
        return uom === 'W' ? `${(val / 1000).toFixed(1)}kW` : `${val.toFixed(1)}kW`;
      }
    }
  }
  return '-- kW';
}

// ─── Scenes Preview Row ───────────────────────────────────────────────────

function buildScenesPreview(tokens?: ResolvedTokens): LovelaceCardConfig {
  const scenes = [
    { name: '起床模式', icon: ICONS.sun, bg: 'var(--hdp-warning-light)', stroke: 'var(--hdp-warning)' },
    { name: '离家模式', icon: ICONS.home, bg: 'var(--hdp-primary-light)', stroke: 'var(--hdp-primary)' },
    { name: '睡眠模式', icon: ICONS.moon, bg: 'rgba(124,110,247,0.1)', stroke: 'var(--hdp-accent-violet)' },
    { name: '安防模式', icon: ICONS.shield, bg: 'var(--hdp-danger-light)', stroke: 'var(--hdp-danger)' },
  ];

  const scenesHTML = scenes.map(s => `
    <div class="scene-card">
      <div class="scene-card-icon" style="background: ${s.bg};">
        ${s.icon}
      </div>
      <div class="scene-card-name">${s.name}</div>
    </div>
  `).join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px; margin-top: 6px;
  }
  .section-title {
    font-size: 16px; font-weight: 700; color: var(--hdp-text);
    letter-spacing: -0.2px;
  }
  .scenes-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .scene-card {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: 16px;
    border: 1px solid var(--hdp-border);
    cursor: pointer; transition: var(--hdp-transition);
    text-align: center;
  }
  .scene-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--hdp-shadow-elevated);
    border-color: transparent;
  }
  .scene-card-icon {
    width: 44px; height: 44px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 10px;
  }
  .scene-card-icon svg { width: 22px; height: 22px; }
  .scene-card-name {
    font-size: 12px; font-weight: 600; color: var(--hdp-text);
  }
  @media (max-width: 768px) {
    .scenes-row { grid-template-columns: repeat(2, 1fr); }
  }
</style>
<div class="section-header">
  <div class="section-title">快捷场景</div>
</div>
<div class="scenes-row">${scenesHTML}</div>`,
  };
}

// ─── Domain Counts ────────────────────────────────────────────────────────

function getDomainCounts(hass: Hass) {
  let lightsOn = 0;
  let lightsTotal = 0;
  let climateActive = 0;

  for (const [entityId, stateObj] of Object.entries(hass.states)) {
    const domain = entityId.split('.')[0];
    const state = stateObj.state;
    if (domain === 'light') {
      lightsTotal++;
      if (state === 'on') lightsOn++;
    }
    if (domain === 'climate' && state !== 'off') climateActive++;
  }

  return { lights: { on: lightsOn, total: lightsTotal }, climate: climateActive };
}

// ─── SVG Icon Set ─────────────────────────────────────────────────────────

const ICONS = {
  // White icons for welcome card buttons
  lightWhite: `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" fill="currentColor"/></svg>`,
  climateWhite: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0z"/></svg>`,
  musicWhite: `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/></svg>`,

  // 24px colored icons for quick strip
  light24: `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" fill="currentColor"/></svg>`,
  climate24: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0z"/></svg>`,
  curtain24: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="12" y1="3" x2="12" y2="21"/><path d="M3 8c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/></svg>`,

  // 18px icons for status cards
  power18: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`,
  security18: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>`,

  // Scene icons
  sun: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>`,
  home: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  moon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  shield: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
};
