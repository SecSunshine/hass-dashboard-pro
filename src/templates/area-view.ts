/**
 * Template: Area Detail View (v3.0)
 *
 * dwains-dashboard-next inspired area page:
 *   1. Area header — name + active/total + room climate
 *   2. Domain groups — each domain gets its own section with header + entity list
 *   3. Entity cards — domain-specific icons, toggle pills for controllable, values for sensors
 *
 * html-card-pro conventions:
 *   - All colors via HA theme tokens
 *   - No inline styles for colors
 *   - do_not_parse: true on every card
 *   - Hover: translateY(-2px), transition: all 0.2s ease
 */

import type { Hass, LovelaceCardConfig, EntityInfo } from '../types';
import { generateDesignTokenCSS } from '../styles/design-tokens';
import type { ResolvedTokens } from '../utils/visual-config';
import { bentoWrap, resolveCardSize } from '../utils/bento-layout';
import { DOMAIN_GROUPS } from '../types';
import { formatState, isEntityOn } from '../utils/area-entities';
import { buildDomainCard, getDomainCardCSS } from './entity-cards';
import { escapeAttribute, escapeHTML } from '../utils/html';
import { cardSkinClass, sanitizeCardSkin } from '../utils/card-skin';

// ─── Area-specific Skin Resolution (Phase 6) ────────────────────────────────

/**
 * Default area skin mapping by name keywords.
 * Used when user hasn't explicitly set a skin for an area.
 */
const AREA_SKIN_KEYWORDS: Array<{ keywords: string[]; skin: string }> = [
  { keywords: ['bedroom', '卧室', '主卧', '次卧', '客房'], skin: 'soft' },      // 柔影 — 温馨
  { keywords: ['living', '客厅', '起居'], skin: 'glass' },                      // 毛玻璃 — 通透大气
  { keywords: ['kitchen', '厨房', '厨房'], skin: 'classic' },                    // 经典 — 清晰实用
  { keywords: ['study', '书房', 'office', '办公室', '工作室'], skin: 'gradient' }, // 渐变 — 专注层次
  { keywords: ['bath', '卫生间', '浴室', '洗手间', ' toilet'], skin: 'glass' },   // 毛玻璃 — 干净明亮
  { keywords: ['balcony', '阳台', '露台'], skin: 'classic' },
  { keywords: ['garage', '车库'], skin: 'classic' },
  { keywords: ['dining', '餐厅', '饭厅'], skin: 'gradient' },
  { keywords: ['closet', '衣帽间', '更衣'], skin: 'soft' },
  { keywords: ['child', '儿童', '小孩', 'baby'], skin: 'soft' },
];

/**
 * Resolve the card skin for a specific area.
 * Priority: user's area_skins override → keyword-based default → global card_style.
 */
function resolveAreaSkin(areaId: string, areaName: string, areaSkins: Record<string, string> | undefined, globalSkin: string | undefined): string {
  // 1. User's explicit override for this area_id
  if (areaSkins && areaSkins[areaId]) {
    return sanitizeCardSkin(areaSkins[areaId]);
  }
  // 2. Keyword-based default (match area name)
  const lowerName = areaName.toLowerCase();
  for (const entry of AREA_SKIN_KEYWORDS) {
    if (entry.keywords.some(kw => lowerName.includes(kw.toLowerCase()))) {
      return entry.skin;
    }
  }
  // 3. Fall back to global card_style
  return sanitizeCardSkin(globalSkin);
}

export function buildAreaView(areaName: string, entities: EntityInfo[], hass: Hass, tokens?: ResolvedTokens): LovelaceCardConfig[] {
  const groups = groupByDomain(entities);

  const cards: LovelaceCardConfig[] = [];

  // 1. Area header
  cards.push(buildAreaHeader(areaName, entities, hass, tokens));

  // 2. One card per domain group (only if >1 group, else single flat grid)
  if (groups.length <= 1) {
    // Single domain — just show entity grid
    cards.push(buildEntityGrid(entities, tokens, undefined, hass));
  } else {
    // Multiple domains — show each as a grouped section
    for (const group of groups) {
      cards.push(buildDomainSection(group, tokens, undefined, hass));
    }
  }

  return cards;
}

/**
 * Build area content as raw HTML string (for embedding in layout card).
 * Phase 6: now accepts areaId and areaSkins for per-area skin resolution.
 */
export function buildAreaHTML(areaName: string, entities: EntityInfo[], hass: Hass, tokens?: ResolvedTokens, areaId?: string): string {
  const groups = groupByDomain(entities);
  const sections: string[] = [];
  const globalSkin = tokens?.card_style;
  const areaSkin = areaId ? resolveAreaSkin(areaId, areaName, tokens?.area_skins, globalSkin) : sanitizeCardSkin(globalSkin);
  const cs = tokens?.card_sizes;

  sections.push(bentoWrap(extractAreaHTML(buildAreaHeader(areaName, entities, hass, tokens)), resolveCardSize('area_header', 'wide', cs)));

  if (groups.length <= 1) {
    sections.push(bentoWrap(extractAreaHTML(buildEntityGrid(entities, tokens, areaSkin, hass)), resolveCardSize('area_grid', 'wide', cs)));
  } else {
    for (const group of groups) {
      // Small domain sections (≤4 entities) take half width, large ones full width
      const defaultSize = group.entities.length <= 4 ? 'md' : 'wide';
      sections.push(bentoWrap(extractAreaHTML(buildDomainSection(group, tokens, areaSkin, hass)), resolveCardSize(`area_domain_${group.domain}`, defaultSize, cs)));
    }
  }

  return sections.join('\n');
}

function extractAreaHTML(card: LovelaceCardConfig): string {
  const content = (card.content as string) || '';
  return content.replace(/<style>[\s\S]*?<\/style>/, '').trim();
}

// ─── Domain Grouping ───────────────────────────────────────────────────────

interface DomainSection {
  domain: string;
  label: string;
  entities: EntityInfo[];
  active_count: number;
  total: number;
  color_class: string;
}

function groupByDomain(entities: EntityInfo[]): DomainSection[] {
  const map = new Map<string, EntityInfo[]>();
  for (const e of entities) {
    if (!map.has(e.domain)) map.set(e.domain, []);
    map.get(e.domain)!.push(e);
  }

  // Sort by priority (controllable first, then sensors)
  const priority = ['light', 'switch', 'climate', 'cover', 'fan', 'lock', 'media_player', 'vacuum', 'camera', 'sensor', 'binary_sensor', 'button'];
  const sorted = Array.from(map.entries()).sort((a, b) => {
    const ai = priority.indexOf(a[0]);
    const bi = priority.indexOf(b[0]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return sorted.map(([domain, ents]) => ({
    domain,
    label: DOMAIN_GROUPS[domain]?.label || domain,
    entities: ents,
    active_count: ents.filter(e => isEntityOn(e.state, e.domain)).length,
    total: ents.length,
    color_class: getDomainColorClass(domain),
  }));
}

function getDomainColorClass(domain: string): string {
  const map: Record<string, string> = {
    light: 'warning',
    switch: 'accent',
    climate: 'info',
    cover: 'accent',
    fan: 'info',
    lock: 'danger',
    media_player: 'info',
    vacuum: 'success',
    camera: 'info',
    sensor: 'muted',
    binary_sensor: 'muted',
  };
  return map[domain] || 'muted';
}

// ─── Area Header ───────────────────────────────────────────────────────────

function buildAreaHeader(areaName: string, entities: EntityInfo[], hass: Hass, tokens?: ResolvedTokens): LovelaceCardConfig {
  const activeCount = entities.filter(e => isEntityOn(e.state, e.domain)).length;
  const totalCount = entities.length;

  // Find room-level climate (temp/humidity sensors in this area)
  let roomTemp = '', roomHum = '';
  for (const e of entities) {
    if (e.domain !== 'sensor') continue;
    if (e.unit === '°C' && !roomTemp) roomTemp = `${e.state}°C`;
    if (e.unit === '%' && (e.entity_id.includes('humidity') || e.entity_id.includes('humid')) && !roomHum) roomHum = `${e.state}%`;
  }

  // Find room power usage
  let roomPower = '';
  for (const e of entities) {
    if (e.domain !== 'sensor') continue;
    if (e.unit === 'W' || e.unit === 'kW') {
      const v = parseFloat(e.state);
      if (!isNaN(v)) {
        const w = e.unit === 'kW' ? v * 1000 : v;
        roomPower = w >= 1000 ? `${(w / 1000).toFixed(1)} kW` : `${Math.round(w)} W`;
        break;
      }
    }
  }

  const metaItems: string[] = [];
  metaItems.push(`<span class="ah-stat"><span class="ah-dot ah-dot--on"></span>${activeCount} 运行中</span>`);
  metaItems.push(`<span class="ah-stat"><span class="ah-dot ah-dot--off"></span>${totalCount} 设备</span>`);

  const envItems: string[] = [];
  if (roomTemp) envItems.push(`<span class="ah-env">${escapeHTML(roomTemp)}</span>`);
  if (roomHum) envItems.push(`<span class="ah-env">${escapeHTML(roomHum)}</span>`);
  if (roomPower) envItems.push(`<span class="ah-env ah-env--power">${escapeHTML(roomPower)}</span>`);

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .ah {
    padding: 2px 0 0 0;
    min-width: 0;
  }
  .ah-name {
    font: inherit;
    font-size: 22px;
    font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 8px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .ah-stats {
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: ${envItems.length > 0 ? '10px' : '0'};
  }
  .ah-stat {
    font: inherit;
    font-size: 13px;
    color: var(--hdp-text-secondary);
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .ah-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
  }
  .ah-dot--on { background: var(--hdp-success); }
  .ah-dot--off { background: var(--hdp-text-muted); }
  .ah-env-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .ah-env {
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    color: var(--hdp-text-secondary);
    background: var(--hdp-divider);
    padding: 4px 12px;
    border-radius: var(--hdp-radius-pill);
  }
  .ah-env--power {
    color: var(--hdp-warning);
    background: var(--hdp-warning-light);
  }
</style>
<div class="ah">
  <div class="ah-name">${escapeHTML(areaName)}</div>
  <div class="ah-stats">${metaItems.join('')}</div>
  ${envItems.length > 0 ? `<div class="ah-env-row">${envItems.join('')}</div>` : ''}
</div>`,
  };
}

// ─── Entity Card CSS (shared, injected into each card) ─────────────────────

const ENTITY_CARD_CSS = /* css */ `
  .ec {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-density-entity-padding, 14px);
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-card);
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    min-width: 0;
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
    min-width: 0;
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
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ec-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .ec-dot--on { background: var(--hdp-success); }
  .ec-dot--off { background: var(--hdp-text-muted); }
  .ec-toggle { flex-shrink: 0; }
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
  }
  .tg-knob--off { border: 1px solid var(--hdp-border); }
  .ec-val {
    font: inherit;
    font-size: 17px;
    font-weight: 700;
    color: var(--hdp-primary);
    margin-left: auto;
    flex: 0 1 45%;
    min-width: 0;
    max-width: 45%;
    overflow-wrap: anywhere;
    text-align: right;
  }
`;

// ─── Entity Card ───────────────────────────────────────────────────────────

function buildEntityCard(entity: EntityInfo, skin?: string, hass?: Hass): string {
  // Try domain-specific card first (climate, cover, lock, media_player, vacuum)
  if (hass) {
    const stateObj = hass.states[entity.entity_id];
    if (stateObj) {
      const domainCard = buildDomainCard(entity, stateObj, skin);
      if (domainCard) return domainCard;
    }
  }

  // Default card for light, switch, fan, sensor, etc.
  const active = isEntityOn(entity.state, entity.domain);
  const stateText = escapeHTML(formatState(entity));
  const iconSVG = getEntityIcon(entity.domain, active);
  const isSensor = entity.domain === 'sensor' || entity.domain === 'binary_sensor';
  const skinCls = skin ? cardSkinClass(skin) : '';
  const cardCls = active ? `ec ec--on ${skinCls}` : `ec ${skinCls}`;
  const entityId = escapeAttribute(entity.entity_id);

  const rightHTML = isSensor
    ? `<span class="ec-val">${stateText}</span>`
    : `<div class="ec-toggle">
        <div class="tg ${active ? 'tg--on' : 'tg--off'}">
          <div class="tg-knob ${active ? '' : 'tg-knob--off'}"></div>
        </div>
      </div>`;

  return `<div class="${cardCls}" data-entity="${entityId}" data-action="toggle">
    <div class="ec-bar"></div>
    <div class="ec-row">
      <div class="ec-ico ${active ? 'ec-ico--on' : 'ec-ico--off'}">${iconSVG}</div>
      <div class="ec-info">
        <div class="ec-name">${escapeHTML(entity.name)}</div>
        <div class="ec-state">
          <span class="ec-dot ${active ? 'ec-dot--on' : 'ec-dot--off'}"></span>
          ${stateText}
        </div>
      </div>
      ${rightHTML}
    </div>
  </div>`;
}

// ─── Domain Section (with entity card CSS) ─────────────────────────────────

function buildDomainSection(group: DomainSection, tokens?: ResolvedTokens, areaSkin?: string, hass?: Hass): LovelaceCardConfig {
  const skin = areaSkin || tokens?.card_style;
  const cards = group.entities.map(e => buildEntityCard(e, skin, hass)).join('');
  const countBadge = group.active_count > 0
    ? `<span class="ds-cnt ds-cnt--${group.color_class}">${group.active_count}/${group.total}</span>`
    : `<span class="ds-cnt ds-cnt--off">${group.total}</span>`;

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .ds-hdr {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    min-width: 0;
  }
  .ds-icon {
    width: 28px; height: 28px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
  }
  .ds-icon svg { width: 15px; height: 15px; }
  .ds-icon--warning { background: var(--hdp-warning-light); color: var(--hdp-warning); }
  .ds-icon--info { background: var(--hdp-info-light); color: var(--hdp-info); }
  .ds-icon--success { background: var(--hdp-success-light); color: var(--hdp-success); }
  .ds-icon--danger { background: var(--hdp-danger-light); color: var(--hdp-danger); }
  .ds-icon--accent { background: rgba(124,110,247,0.1); color: var(--hdp-accent); }
  .ds-icon--muted { background: var(--hdp-divider); color: var(--hdp-text-muted); }
  .ds-label {
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    color: var(--hdp-text);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .ds-cnt {
    font: inherit;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--hdp-radius-pill);
  }
  .ds-cnt--warning { background: var(--hdp-warning-light); color: var(--hdp-warning); }
  .ds-cnt--info { background: var(--hdp-info-light); color: var(--hdp-info); }
  .ds-cnt--success { background: var(--hdp-success-light); color: var(--hdp-success); }
  .ds-cnt--danger { background: var(--hdp-danger-light); color: var(--hdp-danger); }
  .ds-cnt--accent { background: rgba(124,110,247,0.1); color: var(--hdp-accent); }
  .ds-cnt--off { background: var(--hdp-divider); color: var(--hdp-text-muted); }
  .ds-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--hdp-card-gap);
    min-width: 0;
  }
  @media (max-width: 480px) {
    .ds-grid { grid-template-columns: 1fr; }
  }
  ${ENTITY_CARD_CSS}
  ${getDomainCardCSS()}
</style>
<div class="ds-hdr">
  <div class="ds-icon ds-icon--${group.color_class}">${getSectionIcon(group.domain)}</div>
  <span class="ds-label">${escapeHTML(group.label)}</span>
  ${countBadge}
</div>
<div class="ds-grid">${cards}</div>`,
  };
}

function buildEntityGrid(entities: EntityInfo[], tokens?: ResolvedTokens, areaSkin?: string, hass?: Hass): LovelaceCardConfig {
  const skin = areaSkin || tokens?.card_style;
  const cards = entities.map(e => buildEntityCard(e, skin, hass)).join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .eg {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--hdp-card-gap);
    min-width: 0;
  }
  @media (max-width: 480px) {
    .eg { grid-template-columns: 1fr; }
  }
  ${ENTITY_CARD_CSS}
  ${getDomainCardCSS()}
</style>
<div class="eg">${cards}</div>`,
  };
}

// ─── Section Icons ─────────────────────────────────────────────────────────

function getSectionIcon(domain: string): string {
  const c = 'currentColor';
  switch (domain) {
    case 'light':
      return `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/></svg>`;
    case 'switch':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3" fill="${c}" opacity="0.4"/></svg>`;
    case 'climate':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0z"/></svg>`;
    case 'cover':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`;
    case 'fan':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`;
    case 'lock':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    case 'media_player':
      return `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
    case 'vacuum':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>`;
    case 'camera':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`;
    case 'sensor':
    case 'binary_sensor':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="${c}" opacity="0.3"/></svg>`;
    case 'button':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="${c}"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="3" fill="${c}" opacity="0.3"/></svg>`;
  }
}

// ─── Entity Icons ──────────────────────────────────────────────────────────

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
    case 'vacuum':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>`;
    case 'camera':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`;
    case 'sensor':
    case 'binary_sensor':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="${c}" opacity="0.4"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="3" fill="${c}" opacity="0.4"/></svg>`;
  }
}
