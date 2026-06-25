/**
 * Template: Home Dashboard View (v2.1)
 *
 * html-card-pro compliant:
 *   - All colors via HA theme tokens (--hdp-* → var(--primary-color), etc.)
 *   - No inline styles — all in <style> blocks
 *   - border-radius via --hdp-radius (10px spec)
 *   - do_not_parse: true on every card
 *   - Hover: translateY(-2px), transition: all 0.2s ease
 *
 * Cards:
 *   1. Welcome card (gradient hero + greeting + env stats)
 *   2. Quick strip (lights / climate / curtains with live data)
 *   3. Status grid (power + security from real HA entities)
 *   4. Scenes row (quick scene previews)
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

// ─── Welcome Card ─────────────────────────────────────────────────────────

function buildWelcomeCard(hass: Hass, greeting: string, userName: string, tokens?: ResolvedTokens): LovelaceCardConfig {
  const env = getIndoorEnv(hass);

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .hero {
    background: var(--hdp-gradient-primary);
    border-radius: var(--hdp-radius-lg);
    padding: 24px;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 40%; height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 100%);
  }
  .hero-body { position: relative; z-index: 1; }
  .hero-greeting {
    font: inherit;
    font-size: 22px;
    font-weight: 700;
    color: white;
    margin-bottom: 4px;
  }
  .hero-sub {
    font: inherit;
    font-size: 13px;
    color: rgba(255,255,255,0.7);
    margin-bottom: 20px;
  }
  .hero-stats {
    display: flex;
    gap: 20px;
  }
  .hero-stat-val {
    font: inherit;
    font-size: 20px;
    font-weight: 700;
    color: white;
  }
  .hero-stat-lbl {
    font: inherit;
    font-size: 11px;
    font-weight: 500;
    color: rgba(255,255,255,0.55);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  @media (max-width: 480px) {
    .hero { padding: 18px; }
    .hero-stats { gap: 14px; }
    .hero-stat-val { font-size: 17px; }
    .hero-greeting { font-size: 19px; }
  }
</style>
<div class="hero">
  <div class="hero-body">
    <div class="hero-greeting">${greeting}${userName ? '，' + userName : ''}</div>
    <div class="hero-sub">智能家居 · 一切尽在掌控</div>
    <div class="hero-stats">
      <div class="hero-stat">
        <div class="hero-stat-val">${env.temp}</div>
        <div class="hero-stat-lbl">温度</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-val">${env.humidity}</div>
        <div class="hero-stat-lbl">湿度</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-val">${env.air}</div>
        <div class="hero-stat-lbl">空气</div>
      </div>
    </div>
  </div>
</div>`,
  };
}

function getIndoorEnv(hass: Hass): { temp: string; humidity: string; air: string } {
  let temp = '--°C', humidity = '--%', air = '--';
  for (const [eid, s] of Object.entries(hass.states)) {
    const d = eid.split('.')[0];
    if (d !== 'sensor') continue;
    const uom = s.attributes.unit_of_measurement as string;
    if (uom === '°C' && temp === '--°C') temp = `${s.state}°C`;
    if (uom === '%' && humidity === '--%') humidity = `${s.state}%`;
    if ((eid.includes('pm25') || eid.includes('air_quality')) && air === '--') {
      const v = Number(s.state);
      air = v <= 35 ? '优' : v <= 75 ? '良' : '差';
    }
  }
  return { temp, humidity, air };
}

// ─── Quick Strip ──────────────────────────────────────────────────────────

function buildQuickStrip(hass: Hass, tokens?: ResolvedTokens): LovelaceCardConfig {
  const counts = getDomainCounts(hass);
  const cover = getCoverStatus(hass);

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .q-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--hdp-card-gap);
  }
  .q-card {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-card);
    transition: all 0.2s ease;
    position: relative;
    cursor: pointer;
  }
  .q-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--hdp-shadow-elevated);
  }
  .q-dot {
    position: absolute;
    top: var(--hdp-card-padding);
    right: var(--hdp-card-padding);
    width: 8px; height: 8px;
    border-radius: 50%;
  }
  .q-dot--on {
    background: var(--hdp-success);
    box-shadow: 0 0 0 3px var(--hdp-success-light);
  }
  .q-dot--off {
    background: var(--hdp-text-muted);
  }
  .q-icon {
    width: 40px; height: 40px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px;
  }
  .q-icon svg { width: 20px; height: 20px; }
  .q-icon--light { background: var(--hdp-warning-light); color: var(--hdp-warning); }
  .q-icon--climate { background: var(--hdp-info-light); color: var(--hdp-info); }
  .q-icon--cover { background: rgba(124,110,247,0.1); color: var(--hdp-accent); }
  .q-val {
    font: inherit;
    font-size: 22px;
    font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 2px;
  }
  .q-val-sub {
    font-size: 14px;
    font-weight: 400;
    color: var(--hdp-text-secondary);
  }
  .q-lbl {
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    color: var(--hdp-text-secondary);
  }
  @media (max-width: 480px) {
    .q-card { padding: 12px; }
    .q-val { font-size: 18px; }
    .q-icon { width: 34px; height: 34px; margin-bottom: 8px; }
    .q-icon svg { width: 17px; height: 17px; }
  }
</style>
<div class="q-strip">
  <div class="q-card">
    <div class="q-dot ${counts.lightsOn > 0 ? 'q-dot--on' : 'q-dot--off'}"></div>
    <div class="q-icon q-icon--light">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/></svg>
    </div>
    <div class="q-val">${counts.lightsOn}<span class="q-val-sub">/${counts.lightsTotal}</span></div>
    <div class="q-lbl">灯光开启</div>
  </div>
  <div class="q-card">
    <div class="q-dot ${counts.climate > 0 ? 'q-dot--on' : 'q-dot--off'}"></div>
    <div class="q-icon q-icon--climate">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0z"/></svg>
    </div>
    <div class="q-val">${counts.climate}</div>
    <div class="q-lbl">空调运行</div>
  </div>
  <div class="q-card">
    <div class="q-dot ${cover.openCount > 0 ? 'q-dot--on' : 'q-dot--off'}"></div>
    <div class="q-icon q-icon--cover">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="12" y1="3" x2="12" y2="21"/><path d="M3 8c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/></svg>
    </div>
    <div class="q-val">${cover.display}</div>
    <div class="q-lbl">窗帘状态</div>
  </div>
</div>`,
  };
}

// ─── Status Grid ──────────────────────────────────────────────────────────

function buildStatusGrid(hass: Hass, tokens?: ResolvedTokens): LovelaceCardConfig {
  const power = getPowerInfo(hass);
  const security = getSecurityInfo(hass);

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .sec-hdr {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    margin-top: 4px;
  }
  .sec-title {
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  .s-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--hdp-card-gap);
  }
  .s-card {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-card);
    transition: all 0.2s ease;
  }
  .s-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--hdp-shadow-elevated);
  }
  .s-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .s-icon {
    width: 34px; height: 34px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
  }
  .s-icon svg { width: 17px; height: 17px; }
  .s-icon--power { background: var(--hdp-info-light); color: var(--hdp-info); }
  .s-icon--sec { background: var(--hdp-success-light); color: var(--hdp-success); }
  .s-badge {
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--hdp-radius-pill);
  }
  .s-badge--ok { background: var(--hdp-success-light); color: var(--hdp-success); }
  .s-badge--warn { background: var(--hdp-warning-light); color: var(--hdp-warning); }
  .s-badge--danger { background: var(--hdp-danger-light); color: var(--hdp-danger); }
  .s-badge--info { background: var(--hdp-info-light); color: var(--hdp-info); }
  .s-val {
    font: inherit;
    font-size: 26px;
    font-weight: 700;
    color: var(--hdp-text);
    line-height: 1;
    margin-bottom: 4px;
  }
  .s-lbl {
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    color: var(--hdp-text-secondary);
  }
  .s-bar {
    margin-top: 10px;
    height: 4px;
    border-radius: 2px;
    background: var(--hdp-divider);
    overflow: hidden;
  }
  .s-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .s-bar-fill--normal { background: var(--hdp-gradient-primary); }
  .s-bar-fill--warn { background: var(--hdp-warning); }
  .s-bar-fill--green { background: var(--hdp-gradient-green); }
  .s-bar-fill--danger { background: var(--hdp-danger); }
  .s-bar-fill--empty { background: var(--hdp-divider); }
  @media (max-width: 480px) {
    .s-grid { grid-template-columns: 1fr; }
  }
</style>
<div class="sec-hdr">
  <div class="sec-title">实时监控</div>
</div>
<div class="s-grid">
  <div class="s-card">
    <div class="s-top">
      <div class="s-icon s-icon--power">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
      </div>
      <div class="s-badge ${power.percent >= 80 ? 's-badge--warn' : 's-badge--ok'}">${power.percent >= 80 ? '高负载' : '正常'}</div>
    </div>
    <div class="s-val">${power.display}</div>
    <div class="s-lbl">实时功率</div>
    <div class="s-bar">
      <div class="s-bar-fill s-bar-fill--${power.percent >= 80 ? 'warn' : 'normal'}" style="width: ${power.percent}%;"></div>
    </div>
  </div>
  <div class="s-card">
    <div class="s-top">
      <div class="s-icon s-icon--sec">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
      </div>
      <div class="s-badge ${security.badgeCls}">${security.badge}</div>
    </div>
    <div class="s-val">${security.status}</div>
    <div class="s-lbl">安防状态</div>
    <div class="s-bar">
      <div class="s-bar-fill s-bar-fill--${security.barStyle}" style="width: ${security.barPct}%;"></div>
    </div>
  </div>
</div>`,
  };
}

// ─── Scenes Row ───────────────────────────────────────────────────────────

function buildScenesPreview(tokens?: ResolvedTokens): LovelaceCardConfig {
  const scenes = [
    { name: '起床模式', cls: 'sc-icon--warm',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>' },
    { name: '离家模式', cls: 'sc-icon--info',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
    { name: '睡眠模式', cls: 'sc-icon--accent',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' },
    { name: '安防模式', cls: 'sc-icon--danger',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
  ];

  const cards = scenes.map(s => `
    <div class="sc-card">
      <div class="sc-icon ${s.cls}">${s.svg}</div>
      <div class="sc-name">${s.name}</div>
    </div>
  `).join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .sec-hdr {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    margin-top: 4px;
  }
  .sec-title {
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  .sc-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .sc-card {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: 14px;
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-card);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
  }
  .sc-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--hdp-shadow-elevated);
  }
  .sc-icon {
    width: 42px; height: 42px;
    border-radius: var(--hdp-radius);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 8px;
  }
  .sc-icon svg { width: 20px; height: 20px; }
  .sc-icon--warm { background: var(--hdp-warning-light); color: var(--hdp-warning); }
  .sc-icon--info { background: var(--hdp-info-light); color: var(--hdp-info); }
  .sc-icon--accent { background: rgba(124,110,247,0.1); color: var(--hdp-accent); }
  .sc-icon--danger { background: var(--hdp-danger-light); color: var(--hdp-danger); }
  .sc-name {
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    color: var(--hdp-text);
  }
  @media (max-width: 480px) {
    .sc-row { grid-template-columns: repeat(2, 1fr); }
  }
</style>
<div class="sec-hdr">
  <div class="sec-title">快捷场景</div>
</div>
<div class="sc-row">${cards}</div>`,
  };
}

// ─── Data Helpers ─────────────────────────────────────────────────────────

function getDomainCounts(hass: Hass) {
  let lightsOn = 0, lightsTotal = 0, climateActive = 0;
  for (const [eid, s] of Object.entries(hass.states)) {
    const d = eid.split('.')[0];
    if (d === 'light') { lightsTotal++; if (s.state === 'on') lightsOn++; }
    if (d === 'climate' && s.state !== 'off') climateActive++;
  }
  return { lightsOn, lightsTotal, climate: climateActive };
}

function getCoverStatus(hass: Hass): { display: string; openCount: number } {
  let open = 0, total = 0;
  for (const [eid, s] of Object.entries(hass.states)) {
    if (eid.split('.')[0] !== 'cover') continue;
    total++;
    if (s.state === 'open' || s.state === 'opening') open++;
  }
  if (total === 0) return { display: '--', openCount: 0 };
  if (open === 0) return { display: '已关闭', openCount: 0 };
  if (open === total) return { display: '已打开', openCount: open };
  return { display: `${open}/${total}`, openCount: open };
}

function getPowerInfo(hass: Hass): { display: string; percent: number } {
  for (const [eid, s] of Object.entries(hass.states)) {
    if (eid.split('.')[0] !== 'sensor') continue;
    const uom = s.attributes.unit_of_measurement as string;
    if ((uom === 'W' || uom === 'kW') && (eid.includes('power') || eid.includes('energy'))) {
      const v = parseFloat(s.state);
      if (isNaN(v)) continue;
      const w = uom === 'kW' ? v * 1000 : v;
      const display = w >= 1000 ? `${(w / 1000).toFixed(1)}kW` : `${Math.round(w)}W`;
      const percent = Math.min(100, Math.round((w / 8000) * 100));
      return { display, percent };
    }
  }
  return { display: '-- W', percent: 0 };
}

function getSecurityInfo(hass: Hass): {
  status: string; badge: string; badgeCls: string;
  iconBg: string; iconColor: string; barPct: number; barBg: string; barStyle: string;
} {
  for (const [eid, s] of Object.entries(hass.states)) {
    if (eid.split('.')[0] !== 'alarm_control_panel') continue;
    const st = s.state;
    if (st === 'armed_away' || st === 'armed_home' || st === 'armed_night')
      return { status: '已布防', badge: '安全', badgeCls: 's-badge--ok', iconBg: 'var(--hdp-success-light)', iconColor: 'var(--hdp-success)', barPct: 100, barBg: 'var(--hdp-gradient-green)', barStyle: 'green' };
    if (st === 'triggered')
      return { status: '报警中', badge: '警报', badgeCls: 's-badge--danger', iconBg: 'var(--hdp-danger-light)', iconColor: 'var(--hdp-danger)', barPct: 100, barBg: 'var(--hdp-danger)', barStyle: 'danger' };
    if (st === 'arming' || st === 'pending')
      return { status: '布防中', badge: '等待', badgeCls: 's-badge--warn', iconBg: 'var(--hdp-warning-light)', iconColor: 'var(--hdp-warning)', barPct: 60, barBg: 'var(--hdp-warning)', barStyle: 'warn' };
    return { status: '已撤防', badge: '未布防', badgeCls: 's-badge--info', iconBg: 'var(--hdp-info-light)', iconColor: 'var(--hdp-info)', barPct: 30, barBg: 'var(--hdp-gradient-primary)', barStyle: 'normal' };
  }

  let locked = 0, total = 0;
  for (const [eid, s] of Object.entries(hass.states)) {
    if (eid.split('.')[0] !== 'lock') continue;
    total++;
    if (s.state === 'locked') locked++;
  }
  if (total > 0) {
    const pct = Math.round((locked / total) * 100);
    return {
      status: `${locked}/${total}`, badge: pct === 100 ? '全部锁定' : '部分开启',
      badgeCls: pct === 100 ? 's-badge--ok' : 's-badge--warn',
      iconBg: pct === 100 ? 'var(--hdp-success-light)' : 'var(--hdp-warning-light)',
      iconColor: pct === 100 ? 'var(--hdp-success)' : 'var(--hdp-warning)',
      barPct: pct, barBg: pct === 100 ? 'var(--hdp-gradient-green)' : 'var(--hdp-warning)',
      barStyle: pct === 100 ? 'green' : 'warn',
    };
  }

  return { status: '--', badge: '无设备', badgeCls: 's-badge--info', iconBg: 'var(--hdp-info-light)', iconColor: 'var(--hdp-info)', barPct: 0, barBg: 'var(--hdp-divider)', barStyle: 'empty' };
}
