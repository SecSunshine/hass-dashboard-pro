/**
 * Template: Area Detail View (v2.0)
 *
 * Generates per-area view with:
 * - Pill-shaped domain filter badges with icon + count
 * - 2-column entity card grid with active-state accent bar
 * - Entity toggle with smooth 44px pill switch
 *
 * All visual properties use CSS variables (--hdp-*) injected by generateDesignTokenCSS().
 */

import type { Hass, LovelaceCardConfig, EntityInfo, DomainGroup } from '../types';
import { generateDesignTokenCSS } from '../styles/design-tokens';
import type { ResolvedTokens } from '../utils/visual-config';
import { DOMAIN_GROUPS } from '../types';
import { formatState, isEntityOn } from '../utils/area-entities';

export function buildAreaView(areaName: string, entities: EntityInfo[], hass: Hass, tokens?: ResolvedTokens): LovelaceCardConfig[] {
  const groups = groupByDomain(entities);

  return [
    buildAreaHeader(areaName, entities, groups, tokens),
    buildBadgesBar(groups, tokens),
    buildEntityGrid(entities, tokens),
  ];
}

// ─── Area Header ──────────────────────────────────────────────────────────

function buildAreaHeader(areaName: string, entities: EntityInfo[], groups: DomainGroup[], tokens?: ResolvedTokens): LovelaceCardConfig {
  const activeCount = entities.filter(e => isEntityOn(e.state, e.domain)).length;
  const totalCount = entities.length;

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .area-header {
    padding: 4px 0 0 0;
  }
  .area-name {
    font-size: 22px; font-weight: 700; color: var(--hdp-text);
    letter-spacing: -0.3px; margin-bottom: 6px;
  }
  .area-stats {
    display: flex; gap: 16px; align-items: center;
  }
  .area-stat {
    font-size: 13px; color: var(--hdp-text-secondary);
    display: flex; align-items: center; gap: 5px;
  }
  .stat-dot {
    width: 7px; height: 7px; border-radius: 50%;
  }
  .stat-dot--active { background: var(--hdp-success); }
  .stat-dot--total { background: var(--hdp-text-muted); }
</style>
<div class="area-header" data-component="area-header">
  <div class="area-name">${areaName}</div>
  <div class="area-stats">
    <div class="area-stat">
      <span class="stat-dot stat-dot--active"></span>
      ${activeCount} 个运行中
    </div>
    <div class="area-stat">
      <span class="stat-dot stat-dot--total"></span>
      共 ${totalCount} 个设备
    </div>
  </div>
</div>`,
  };
}

// ─── Category Badges (Pill Style) ─────────────────────────────────────────

function groupByDomain(entities: EntityInfo[]): DomainGroup[] {
  const groups = new Map<string, EntityInfo[]>();

  for (const entity of entities) {
    const domain = entity.domain;
    if (!groups.has(domain)) groups.set(domain, []);
    groups.get(domain)!.push(entity);
  }

  return Array.from(groups.entries()).map(([domain, ents]) => ({
    domain,
    label: DOMAIN_GROUPS[domain]?.label || domain,
    entities: ents,
    badge_color: DOMAIN_GROUPS[domain]?.color || '#F1F5F9',
  }));
}

function buildBadgesBar(groups: DomainGroup[], tokens?: ResolvedTokens): LovelaceCardConfig {
  const badges = groups
    .map((g) => {
      const iconSVG = getBadgeIcon(g.domain);
      const activeCount = g.entities.filter(e => isEntityOn(e.state, e.domain)).length;
      const countBadge = activeCount > 0
        ? `<span class="badge-count">${activeCount}</span>`
        : '';
      return `<div class="domain-badge" data-component="domain-badge" data-domain="${g.domain}">
        <span class="badge-icon">${iconSVG}</span>
        <span class="badge-label">${g.label}</span>
        ${countBadge}
      </div>`;
    })
    .join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .badges-bar {
    display: flex; gap: 8px; flex-wrap: wrap;
    padding: 2px 0;
  }
  .domain-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: var(--hdp-radius-pill);
    background: var(--hdp-card-bg);
    border: 1px solid var(--hdp-border);
    transition: var(--hdp-transition);
    cursor: default;
  }
  .domain-badge:hover {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow);
  }
  .badge-icon {
    width: 16px; height: 16px; display: flex; align-items: center;
    color: var(--hdp-primary);
  }
  .badge-icon svg { width: 16px; height: 16px; }
  .badge-label {
    font-size: 13px; font-weight: 600;
    color: var(--hdp-text);
  }
  .badge-count {
    font-size: 11px; font-weight: 700;
    color: var(--hdp-text-inverse);
    background: var(--hdp-primary);
    border-radius: 10px;
    padding: 1px 7px;
    min-width: 18px; text-align: center;
    line-height: 16px;
  }
</style>
<div class="badges-bar" data-component="domain-badges">${badges}</div>`,
  };
}

function getBadgeIcon(domain: string): string {
  const c = 'currentColor';
  switch (domain) {
    case 'light':
      return `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" fill="${c}" opacity="0.85"/></svg>`;
    case 'climate':
      return `<svg viewBox="0 0 24 24" fill="none"><path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4z" fill="${c}" opacity="0.85"/></svg>`;
    case 'cover':
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="${c}" stroke-width="2"/><line x1="3" y1="12" x2="21" y2="12" stroke="${c}" stroke-width="2"/></svg>`;
    case 'fan':
      return `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="${c}" stroke-width="2"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="${c}" stroke-width="2" opacity="0.4"/></svg>`;
    case 'media_player':
      return `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="${c}" opacity="0.85"/></svg>`;
    case 'switch':
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="1" y="5" width="22" height="14" rx="7" stroke="${c}" stroke-width="2"/><circle cx="8" cy="12" r="3" fill="${c}" opacity="0.4"/></svg>`;
    case 'lock':
      return `<svg viewBox="0 0 24 24" fill="none"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z" stroke="${c}" stroke-width="2"/></svg>`;
    case 'sensor':
    case 'binary_sensor':
      return `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="${c}" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="${c}" opacity="0.5"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="${c}" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="${c}" opacity="0.5"/></svg>`;
  }
}

// ─── Entity Card Grid ─────────────────────────────────────────────────────

function buildEntityGrid(entities: EntityInfo[], tokens?: ResolvedTokens): LovelaceCardConfig {
  const top = entities.slice(0, 12);
  const cards = top.map(entity => buildEntityCardHTML(entity)).join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .entity-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--hdp-card-gap);
  }
  @media (max-width: 480px) {
    .entity-grid { grid-template-columns: 1fr; }
  }

  .entity-card {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: 16px;
    position: relative;
    overflow: hidden;
    box-shadow: var(--hdp-shadow-card);
    border: 1px solid var(--hdp-border);
    cursor: pointer;
    transition: var(--hdp-transition);
  }
  .entity-card:active { transform: scale(0.98); }
  .entity-card--active {
    border-color: var(--hdp-primary);
    box-shadow: var(--hdp-shadow-card), 0 0 0 3px var(--hdp-primary-glow);
  }

  /* Active accent bar */
  .entity-accent-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--hdp-gradient-primary);
    opacity: 0;
    transition: opacity var(--hdp-motion-base) var(--hdp-motion-easing);
  }
  .entity-card--active .entity-accent-bar { opacity: 1; }

  .entity-inner {
    display: flex; align-items: center; gap: 12px;
    padding-top: 2px;
  }

  .entity-icon-wrap {
    width: 40px; height: 40px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background var(--hdp-motion-base) var(--hdp-motion-easing);
  }
  .entity-icon-wrap--off {
    background: var(--hdp-divider);
  }
  .entity-icon-wrap--on {
    background: var(--hdp-primary-light);
  }
  .entity-icon-wrap svg { width: 20px; height: 20px; }

  .entity-info {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 3px;
  }
  .entity-name {
    font-size: 14px; font-weight: 600; color: var(--hdp-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .entity-state {
    font-size: 12px; color: var(--hdp-text-secondary);
    display: flex; align-items: center; gap: 4px;
  }
  .state-indicator {
    width: 6px; height: 6px; border-radius: 50%;
    flex-shrink: 0;
  }
  .state-indicator--on { background: var(--hdp-success); }
  .state-indicator--off { background: var(--hdp-text-muted); }

  .entity-toggle {
    flex-shrink: 0;
  }
  .toggle-pill {
    width: 44px; height: 26px; border-radius: 13px;
    display: flex; align-items: center;
    padding: 2px;
    transition: background var(--hdp-motion-base) var(--hdp-motion-easing);
    cursor: pointer;
  }
  .toggle-pill--on {
    background: var(--hdp-primary);
    justify-content: flex-end;
  }
  .toggle-pill--off {
    background: var(--hdp-divider);
    justify-content: flex-start;
  }
  .toggle-knob {
    width: 22px; height: 22px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    transition: transform var(--hdp-motion-base) var(--hdp-motion-easing);
  }
  .toggle-knob--off {
    border: 1px solid var(--hdp-border);
  }

  /* Sensor-only cards (no toggle) */
  .entity-card--sensor .entity-inner { gap: 12px; }
  .sensor-value {
    font-size: 18px; font-weight: 700;
    color: var(--hdp-primary);
    margin-left: auto; flex-shrink: 0;
  }
</style>
<div class="entity-grid" data-component="entity-grid">
  ${cards}
</div>`,
  };
}

function buildEntityCardHTML(entity: EntityInfo): string {
  const active = isEntityOn(entity.state, entity.domain);
  const stateText = formatState(entity);
  const iconSVG = getEntityIcon(entity.domain, active);
  const cardClass = active ? 'entity-card entity-card--active' : 'entity-card';
  const isSensor = entity.domain === 'sensor' || entity.domain === 'binary_sensor';

  const toggleHTML = isSensor
    ? `<span class="sensor-value">${stateText}</span>`
    : `<div class="entity-toggle">
        <div class="toggle-pill ${active ? 'toggle-pill--on' : 'toggle-pill--off'}">
          <div class="toggle-knob ${active ? '' : 'toggle-knob--off'}"></div>
        </div>
      </div>`;

  return `<div class="${cardClass} ${isSensor ? 'entity-card--sensor' : ''}" data-entity="${entity.entity_id}" data-component="entity-card">
    <div class="entity-accent-bar"></div>
    <div class="entity-inner">
      <div class="entity-icon-wrap ${active ? 'entity-icon-wrap--on' : 'entity-icon-wrap--off'}">
        ${iconSVG}
      </div>
      <div class="entity-info">
        <div class="entity-name">${entity.name}</div>
        <div class="entity-state">
          <span class="state-indicator ${active ? 'state-indicator--on' : 'state-indicator--off'}"></span>
          ${stateText}
        </div>
      </div>
      ${toggleHTML}
    </div>
  </div>`;
}

// ─── Entity Domain Icons ──────────────────────────────────────────────────

function getEntityIcon(domain: string, active: boolean): string {
  const activeColor = 'var(--hdp-primary)';
  const inactiveColor = 'var(--hdp-text-muted)';
  const c = active ? activeColor : inactiveColor;

  switch (domain) {
    case 'light':
      return `<svg viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" fill="${c}"/>
        ${active ? '<line x1="12" y1="1" x2="12" y2="0" stroke="' + c + '" stroke-width="1.5" stroke-linecap="round"/><line x1="4.22" y1="4.22" x2="3.51" y2="3.51" stroke="' + c + '" stroke-width="1.5" stroke-linecap="round"/><line x1="19.78" y1="4.22" x2="20.49" y2="3.51" stroke="' + c + '" stroke-width="1.5" stroke-linecap="round"/>' : ''}
      </svg>`;
    case 'climate':
      return `<svg viewBox="0 0 24 24" fill="none">
        <path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4z" fill="${c}" opacity="0.85"/>
        ${active ? '<circle cx="12" cy="17" r="2" fill="white" opacity="0.6"/>' : ''}
      </svg>`;
    case 'cover':
      return `<svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="${c}" stroke-width="2"/>
        <line x1="3" y1="9" x2="21" y2="9" stroke="${c}" stroke-width="1.5" opacity="0.5"/>
        <line x1="3" y1="15" x2="21" y2="15" stroke="${c}" stroke-width="1.5" opacity="0.3"/>
        <line x1="12" y1="3" x2="12" y2="21" stroke="${c}" stroke-width="2"/>
      </svg>`;
    case 'fan':
      return `<svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill="${c}"/>
        <path d="M12 9c0-2.5-1-5-3.5-5S4 6.5 4 9c0 2 1.5 3 3.5 3" stroke="${c}" stroke-width="1.5" fill="${c}" opacity="${active ? 0.6 : 0.3}"/>
        <path d="M15 12c2.5 0 5-1 5-3.5S17.5 4 15 4c-2 0-3 1.5-3 3.5" stroke="${c}" stroke-width="1.5" fill="${c}" opacity="${active ? 0.6 : 0.3}" transform="rotate(90 12 12)"/>
        <path d="M12 15c0 2.5 1 5 3.5 5S20 17.5 20 15c0-2-1.5-3-3.5-3" stroke="${c}" stroke-width="1.5" fill="${c}" opacity="${active ? 0.6 : 0.3}"/>
        <path d="M9 12c-2.5 0-5 1-5 3.5S6.5 20 9 20c2 0 3-1.5 3-3.5" stroke="${c}" stroke-width="1.5" fill="${c}" opacity="${active ? 0.6 : 0.3}" transform="rotate(90 12 12)"/>
      </svg>`;
    case 'media_player':
      return `<svg viewBox="0 0 24 24" fill="none">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="${c}" opacity="0.85"/>
      </svg>`;
    case 'switch':
      return `<svg viewBox="0 0 24 24" fill="none">
        <rect x="1" y="5" width="22" height="14" rx="7" stroke="${c}" stroke-width="2"/>
        <circle cx="${active ? 16 : 8}" cy="12" r="4" fill="${c}" opacity="0.6"/>
      </svg>`;
    case 'lock':
      return `<svg viewBox="0 0 24 24" fill="none">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z" fill="${c}" opacity="0.15" stroke="${c}" stroke-width="1.5"/>
        <circle cx="12" cy="15" r="2" fill="${c}"/>
      </svg>`;
    case 'sensor':
    case 'binary_sensor':
      return `<svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="${c}" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="${c}" opacity="0.5"/>
        ${active ? '<circle cx="12" cy="12" r="9" fill="' + c + '" opacity="0.08"/>' : ''}
      </svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="4" stroke="${c}" stroke-width="2"/>
        <circle cx="12" cy="12" r="3" fill="${c}" opacity="0.5"/>
      </svg>`;
  }
}
