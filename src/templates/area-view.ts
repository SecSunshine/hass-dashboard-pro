/**
 * Template: Area Detail View (v2.1)
 *
 * html-card-pro compliant — HA native theme tokens, no inline styles,
 * do_not_parse: true, hover translateY(-2px), 10px radius spec.
 *
 * Cards:
 *   1. Area header (name + active/total counts)
 *   2. Domain badges bar (horizontal pill filters with SVG icons)
 *   3. Entity card grid (2-col, domain-specific icons, toggle pills)
 */

import type { Hass, LovelaceCardConfig, EntityInfo, DomainGroup } from '../types';
import { generateDesignTokenCSS } from '../styles/design-tokens';
import type { ResolvedTokens } from '../utils/visual-config';
import { DOMAIN_GROUPS } from '../types';
import { formatState, isEntityOn } from '../utils/area-entities';

export function buildAreaView(areaName: string, entities: EntityInfo[], hass: Hass, tokens?: ResolvedTokens): LovelaceCardConfig[] {
  const groups = groupByDomain(entities);

  return [
    buildAreaHeader(areaName, entities, tokens),
    ...(groups.length > 1 ? [buildBadgesBar(groups, tokens)] : []),
    buildEntityGrid(entities, tokens),
  ];
}

// ─── Area Header ──────────────────────────────────────────────────────────

function buildAreaHeader(areaName: string, entities: EntityInfo[], tokens?: ResolvedTokens): LovelaceCardConfig {
  const activeCount = entities.filter(e => isEntityOn(e.state, e.domain)).length;
  const totalCount = entities.length;

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .ah {
    padding: 2px 0 0 0;
  }
  .ah-name {
    font: inherit;
    font-size: 20px;
    font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 6px;
  }
  .ah-stats {
    display: flex;
    gap: 14px;
    align-items: center;
  }
  .ah-stat {
    font: inherit;
    font-size: 13px;
    color: var(--hdp-text-secondary);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .ah-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
  }
  .ah-dot--on { background: var(--hdp-success); }
  .ah-dot--off { background: var(--hdp-text-muted); }
</style>
<div class="ah">
  <div class="ah-name">${areaName}</div>
  <div class="ah-stats">
    <div class="ah-stat">
      <span class="ah-dot ah-dot--on"></span>
      ${activeCount} 个运行中
    </div>
    <div class="ah-stat">
      <span class="ah-dot ah-dot--off"></span>
      共 ${totalCount} 个设备
    </div>
  </div>
</div>`,
  };
}

// ─── Domain Badges ────────────────────────────────────────────────────────

function groupByDomain(entities: EntityInfo[]): DomainGroup[] {
  const groups = new Map<string, EntityInfo[]>();
  for (const entity of entities) {
    if (!groups.has(entity.domain)) groups.set(entity.domain, []);
    groups.get(entity.domain)!.push(entity);
  }
  return Array.from(groups.entries()).map(([domain, ents]) => ({
    domain,
    label: DOMAIN_GROUPS[domain]?.label || domain,
    entities: ents,
    badge_color: DOMAIN_GROUPS[domain]?.color || '#F1F5F9',
  }));
}

function buildBadgesBar(groups: DomainGroup[], tokens?: ResolvedTokens): LovelaceCardConfig {
  const badges = groups.map(g => {
    const activeCount = g.entities.filter(e => isEntityOn(e.state, e.domain)).length;
    const countHTML = activeCount > 0 ? `<span class="db-count">${activeCount}</span>` : '';
    return `<div class="db-pill" data-domain="${g.domain}">
      <span class="db-icon">${getBadgeIcon(g.domain)}</span>
      <span class="db-label">${g.label}</span>
      ${countHTML}
    </div>`;
  }).join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .db-bar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 2px 0;
  }
  .db-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 13px;
    border-radius: var(--hdp-radius-pill);
    background: var(--hdp-card-bg);
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-card);
    transition: all 0.2s ease;
    cursor: default;
  }
  .db-pill:hover {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-success-light);
  }
  .db-icon {
    width: 15px; height: 15px;
    display: flex; align-items: center;
    color: var(--hdp-primary);
  }
  .db-icon svg { width: 15px; height: 15px; }
  .db-label {
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--hdp-text);
  }
  .db-count {
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    color: var(--hdp-text-inverse);
    background: var(--hdp-primary);
    border-radius: 10px;
    padding: 1px 7px;
    min-width: 18px;
    text-align: center;
    line-height: 16px;
  }
</style>
<div class="db-bar">${badges}</div>`,
  };
}

function getBadgeIcon(domain: string): string {
  const c = 'currentColor';
  switch (domain) {
    case 'light':
      return `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/></svg>`;
    case 'climate':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0z"/></svg>`;
    case 'cover':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`;
    case 'fan':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`;
    case 'media_player':
      return `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
    case 'switch':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="8" cy="12" r="3" fill="${c}" opacity="0.4"/></svg>`;
    case 'lock':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    case 'sensor':
    case 'binary_sensor':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="${c}" opacity="0.4"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="3" fill="${c}" opacity="0.4"/></svg>`;
  }
}

// ─── Entity Grid ──────────────────────────────────────────────────────────

function buildEntityGrid(entities: EntityInfo[], tokens?: ResolvedTokens): LovelaceCardConfig {
  const top = entities.slice(0, 12);
  const cards = top.map(e => buildEntityCard(e)).join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .eg {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--hdp-card-gap);
  }
  @media (max-width: 480px) {
    .eg { grid-template-columns: 1fr; }
  }

  .ec {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: 14px;
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-card);
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
    cursor: pointer;
  }
  .ec:hover {
    transform: translateY(-2px);
    box-shadow: var(--hdp-shadow-elevated);
  }
  .ec--on {
    border-color: var(--hdp-primary);
  }

  .ec-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--hdp-gradient-primary);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .ec--on .ec-bar { opacity: 1; }

  .ec-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ec-ico {
    width: 38px; height: 38px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s ease;
  }
  .ec-ico svg { width: 19px; height: 19px; }
  .ec-ico--off { background: var(--hdp-divider); color: var(--hdp-text-muted); }
  .ec-ico--on { background: var(--hdp-primary-light); color: var(--hdp-primary); }

  .ec-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ec-name {
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--hdp-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ec-state {
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ec-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .ec-dot--on { background: var(--hdp-success); }
  .ec-dot--off { background: var(--hdp-text-muted); }

  .ec-toggle {
    flex-shrink: 0;
  }
  .tg {
    width: 44px; height: 24px;
    border-radius: 12px;
    display: flex; align-items: center;
    padding: 2px;
    transition: background 0.2s ease;
    cursor: pointer;
  }
  .tg--on { background: var(--hdp-primary); justify-content: flex-end; }
  .tg--off { background: var(--hdp-divider); justify-content: flex-start; }
  .tg-knob {
    width: 20px; height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    transition: transform 0.2s ease;
  }
  .tg-knob--off { border: 1px solid var(--hdp-border); }

  .ec-val {
    font: inherit;
    font-size: 17px;
    font-weight: 700;
    color: var(--hdp-primary);
    margin-left: auto;
    flex-shrink: 0;
  }
</style>
<div class="eg">${cards}</div>`,
  };
}

function buildEntityCard(entity: EntityInfo): string {
  const active = isEntityOn(entity.state, entity.domain);
  const stateText = formatState(entity);
  const iconSVG = getEntityIcon(entity.domain, active);
  const isSensor = entity.domain === 'sensor' || entity.domain === 'binary_sensor';
  const cardCls = active ? 'ec ec--on' : 'ec';

  const rightHTML = isSensor
    ? `<span class="ec-val">${stateText}</span>`
    : `<div class="ec-toggle">
        <div class="tg ${active ? 'tg--on' : 'tg--off'}">
          <div class="tg-knob ${active ? '' : 'tg-knob--off'}"></div>
        </div>
      </div>`;

  return `<div class="${cardCls}" data-entity="${entity.entity_id}">
    <div class="ec-bar"></div>
    <div class="ec-row">
      <div class="ec-ico ${active ? 'ec-ico--on' : 'ec-ico--off'}">${iconSVG}</div>
      <div class="ec-info">
        <div class="ec-name">${entity.name}</div>
        <div class="ec-state">
          <span class="ec-dot ${active ? 'ec-dot--on' : 'ec-dot--off'}"></span>
          ${stateText}
        </div>
      </div>
      ${rightHTML}
    </div>
  </div>`;
}

// ─── Entity Icons ─────────────────────────────────────────────────────────

function getEntityIcon(domain: string, active: boolean): string {
  const c = 'currentColor';
  switch (domain) {
    case 'light':
      return `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/></svg>`;
    case 'climate':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0z"/></svg>`;
    case 'cover':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9" opacity="0.5"/><line x1="3" y1="15" x2="21" y2="15" opacity="0.3"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`;
    case 'fan':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`;
    case 'media_player':
      return `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
    case 'switch':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="${active ? 16 : 8}" cy="12" r="4" fill="${c}" opacity="0.5"/></svg>`;
    case 'lock':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1" fill="${c}"/></svg>`;
    case 'sensor':
    case 'binary_sensor':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="${c}" opacity="0.4"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="3" fill="${c}" opacity="0.4"/></svg>`;
  }
}
