/**
 * Template: Devices View (v4.0)
 *
 * Shows all home entities grouped by domain.
 * Serves as the "All Devices" section in the monolithic layout card.
 *
 * Layout:
 *   1. Domain summary chips — horizontal scroll row
 *   2. Per-domain sections — each with header, count badge, entity grid
 *
 * html-card-pro conventions:
 *   - All colors via HA theme tokens (--hdp-*)
 *   - No inline styles for colors
 *   - Hover: translateY(-2px), transition: all 0.2s ease
 */

import type { Hass, EntityInfo, StrategyConfig } from '../types';
import { DOMAIN_GROUPS } from '../types';
import type { ResolvedTokens } from '../utils/visual-config';
import { bentoWrap, resolveCardSize } from '../utils/bento-layout';
import { isEntityOn, formatState } from '../utils/area-entities';
import { buildDomainCard, getDomainCardCSS } from './entity-cards';
import { collectVisibleEntities, getDashboardFilters } from '../utils/dashboard-model';
import { escapeAttribute, escapeHTML } from '../utils/html';
import { cardSkinClass, sanitizeCardSkin } from '../utils/card-skin';
import { resolveSlottedCard, sortSlottedCards, type SlottedCard } from '../utils/card-slots';
import { formatTemperatureCelsius, isTemperatureUnit, normalizeTemperatureToCelsius } from '../utils/temperature';

// ─── Main Export ────────────────────────────────────────────────────────────

/**
 * Build the "All Devices" HTML content (for embedding in the layout card).
 * Returns raw HTML string without outer <style> token block (layout card provides tokens).
 */
export function buildDevicesHTML(hass: Hass, config: StrategyConfig, tokens?: ResolvedTokens): string {
  const allEntities: EntityInfo[] = collectVisibleEntities(hass, getDashboardFilters(config));

  // Group by domain
  const domainMap = new Map<string, EntityInfo[]>();
  for (const e of allEntities) {
    if (!domainMap.has(e.domain)) domainMap.set(e.domain, []);
    domainMap.get(e.domain)!.push(e);
  }
  for (const entities of domainMap.values()) sortEntitiesForDisplay(entities);

  // Sort: controllable first, then sensors
  const priority = ['light', 'switch', 'climate', 'cover', 'fan', 'lock', 'media_player', 'vacuum', 'camera', 'sensor', 'binary_sensor', 'button'];
  const sorted = Array.from(domainMap.entries()).sort((a, b) => {
    const activeDiff = b[1].filter(e => isEntityOn(e.state, e.domain)).length - a[1].filter(e => isEntityOn(e.state, e.domain)).length;
    if (activeDiff !== 0) return activeDiff;
    const ai = priority.indexOf(a[0]);
    const bi = priority.indexOf(b[0]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Summary chips (horizontal scroll row)
  const chipsHTML = sorted.map(([domain, entities]) => {
    const label = DOMAIN_GROUPS[domain]?.label || domain;
    const activeCount = entities.filter(e => isEntityOn(e.state, e.domain)).length;
    const safeDomain = escapeAttribute(domain);
    return `<button type="button" class="dv-chip" data-domain="${safeDomain}" data-action="scroll-domain">
      <span class="dv-chip-label">${escapeHTML(label)}</span>
      <span class="dv-chip-count">${activeCount}/${entities.length}</span>
    </button>`;
  }).join('');

  // Domain sections
  const skin = sanitizeCardSkin(tokens?.card_style);
  const cs = tokens?.card_sizes;
  const slottedSections: SlottedCard[] = sorted.map(([domain, entities], index) => {
    const sectionHTML = buildDomainSection(domain, entities, skin, hass, config);
    const defaultSize = entities.length <= 4 ? 'md' : 'wide';
    return resolveSlottedCard(
      config,
      `device.domain.${domain}`,
      sectionHTML,
      resolveCardSize(`device_domain_${domain}`, defaultSize, cs),
      index + 1,
    );
  });
  const sectionsHTML = sortSlottedCards(slottedSections)
    .map(section => bentoWrap(section.html, section.size))
    .join('');
  const chipsSlot = resolveSlottedCard(
    config,
    'devices.chips',
    `<div class="dv-chips">${chipsHTML}</div>`,
    resolveCardSize('devices_chips', 'wide', cs),
    0,
  );

  return `
<style>
  .dv-chips {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 8px;
    margin-bottom: 16px;
    scrollbar-width: none;
  }
  .dv-chips::-webkit-scrollbar { display: none; }
  .dv-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    max-width: min(220px, 68vw);
    padding: 6px 14px;
    border-radius: var(--hdp-radius-pill, 20px);
    background: var(--hdp-surface-card, var(--hdp-card-bg));
    border: 1px solid var(--hdp-border);
    appearance: none;
    font: inherit;
    font-size: 13px;
    color: var(--hdp-text);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
    min-height: 44px;
  }
  .dv-chip:hover {
    transform: translateY(-2px);
    border-color: var(--hdp-primary);
    background: var(--hdp-surface-raised, var(--hdp-card-bg));
  }
  .dv-chip-label {
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dv-chip-count {
    flex: 0 0 auto;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: var(--hdp-radius-pill, 20px);
    background: var(--hdp-primary-light, rgba(79,110,247,0.1));
    color: var(--hdp-primary);
  }
  .dv-section {
    margin-bottom: 0;
    min-width: 0;
  }
  .dv-section-hdr {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    min-width: 0;
  }
  .dv-section-icon {
    width: 28px; height: 28px;
    border-radius: var(--hdp-radius-sm, 8px);
    display: flex; align-items: center; justify-content: center;
  }
  .dv-section-icon svg { width: 15px; height: 15px; }
  .dv-section-label {
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    color: var(--hdp-text);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .dv-section-cnt {
    font: inherit;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--hdp-radius-pill, 20px);
    background: var(--hdp-primary-light, rgba(79,110,247,0.1));
    color: var(--hdp-primary);
  }
  .dv-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--hdp-card-gap, 12px);
    min-width: 0;
  }
  @media (max-width: 480px) {
    .dv-grid { grid-template-columns: minmax(0, 1fr); }
  }
  .dv-empty {
    text-align: center;
    padding: 60px 20px;
    color: var(--hdp-text-secondary);
    font: inherit;
    font-size: 14px;
  }
  ${getDeviceEntityCardCSS()}
  ${getDomainCardCSS()}
</style>
${chipsSlot.hidden ? '' : bentoWrap(chipsSlot.html, chipsSlot.size)}
${sectionsHTML || bentoWrap('<div class="dv-empty">暂无设备</div>', resolveCardSize('devices_empty', 'wide', cs))}`;
}

/**
 * Generate devices view JavaScript for the main script block.
 * Includes hdpScrollToDomain for domain chip navigation.
 */
export function generateDevicesJS(): string {
  return `
window.hdpScrollToDomain = function(domain) {
  var targetDomain = String(domain || '');
  var el = document.getElementById('dv-domain-' + targetDomain);
  if (!el && targetDomain.indexOf('.') > -1) {
    el = document.getElementById('dv-domain-' + targetDomain.split('.')[0]);
  }
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.hdpShowDeviceDomain = function(domain) {
  if (typeof window.hdpOpenDeviceDomainModal === 'function') {
    window.hdpOpenDeviceDomainModal(domain);
    return;
  }
  if (typeof window.hdpShowView === 'function') window.hdpShowView('devices');
  window.setTimeout(function() {
    if (typeof window.hdpScrollToDomain === 'function') window.hdpScrollToDomain(domain);
  }, 80);
};`;
}

// ─── Domain Section ─────────────────────────────────────────────────────────

function buildDomainSection(domain: string, entities: EntityInfo[], skin?: string, hass?: Hass, config?: StrategyConfig): string {
  const label = DOMAIN_GROUPS[domain]?.label || domain;
  const activeCount = entities.filter(e => isEntityOn(e.state, e.domain)).length;
  const iconColor = getDomainColor(domain);

  const cardsHTML = entities.map(e => buildDeviceEntityCard(e, skin, hass, config)).join('');

  const safeDomain = escapeAttribute(domain);

  return `<div class="dv-section" id="dv-domain-${safeDomain}">
    <div class="dv-section-hdr">
      <div class="dv-section-icon" style="background: ${iconColor.bg}; color: ${iconColor.fg};">
        ${getDomainIconSVG(domain)}
      </div>
      <span class="dv-section-label">${escapeHTML(label)}</span>
      <span class="dv-section-cnt">${activeCount}/${entities.length}</span>
    </div>
    <div class="dv-grid">${cardsHTML}</div>
  </div>`;
}

function sortEntitiesForDisplay(entities: EntityInfo[]): void {
  entities.sort((a, b) => {
    const activeDiff = Number(isEntityOn(b.state, b.domain)) - Number(isEntityOn(a.state, a.domain));
    if (activeDiff !== 0) return activeDiff;
    const unavailableDiff = Number(isUnavailable(a.state)) - Number(isUnavailable(b.state));
    if (unavailableDiff !== 0) return unavailableDiff;
    return a.name.localeCompare(b.name);
  });
}

function isUnavailable(state: string): boolean {
  return state === 'unavailable' || state === 'unknown';
}

// ─── Entity Card CSS (shared) ───────────────────────────────────────────────

function getDeviceEntityCardCSS(): string {
  return `
  .dvc {
    background: var(--hdp-surface-card, var(--hdp-card-bg));
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
  .dvc:hover {
    transform: translateY(-2px);
    box-shadow: var(--hdp-shadow-elevated);
  }
  .dvc[role="button"]:focus-visible {
    outline: 2px solid var(--hdp-primary);
    outline-offset: 2px;
  }
  .dvc--on { border-color: var(--hdp-primary); }
  .dvc-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--hdp-gradient-primary);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .dvc--on .dvc-bar { opacity: 1; }
  .dvc-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .dvc-ico {
    width: 38px; height: 38px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s ease;
  }
  .dvc-ico svg { width: 19px; height: 19px; }
  .dvc-ico--off { background: var(--hdp-divider); color: var(--hdp-text-muted); }
  .dvc-ico--on { background: var(--hdp-primary-light); color: var(--hdp-primary); }
  .dvc-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .dvc-name {
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--hdp-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dvc-state {
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
  .dvc-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dvc-dot--on { background: var(--hdp-success); }
  .dvc-dot--off { background: var(--hdp-text-muted); }
  .dvc-area {
    font: inherit;
    font-size: 11px;
    color: var(--hdp-text-muted);
    margin-top: 2px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dvc-val {
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
  .dvc-toggle { flex-shrink: 0; }
  .dvc-tg {
    width: 44px; height: 24px;
    border-radius: 12px;
    display: flex; align-items: center;
    padding: 2px;
    transition: background 0.2s ease;
    cursor: pointer;
  }
  .dvc-tg--on { background: var(--hdp-primary); justify-content: flex-end; }
  .dvc-tg--off { background: var(--hdp-divider); justify-content: flex-start; }
  .dvc-tg-knob {
    width: 20px; height: 20px;
    border-radius: 50%;
    background: var(--hdp-surface-card, var(--hdp-card-bg));
    box-shadow: var(--hdp-shadow-card, 0 1px 3px color-mix(in srgb, var(--hdp-text, CanvasText) 15%, transparent));
  }
  .dvc-tg-knob--off { border: 1px solid var(--hdp-border); }`;
}

// ─── Entity Card ────────────────────────────────────────────────────────────

function buildDeviceEntityCard(entity: EntityInfo, skin?: string, hass?: Hass, config?: StrategyConfig): string {
  let generated = '';
  const slotContext = {
    entity: entity.entity_id,
    name: entity.name,
    state: formatDeviceState(entity, hass),
    area: entity.area_name,
    domain: entity.domain,
  };
  // Try domain-specific card first (climate, cover, lock, media_player, vacuum)
  if (hass) {
    const stateObj = hass.states[entity.entity_id];
    if (stateObj) {
      const domainCard = buildDomainCard(entity, stateObj, skin);
      if (domainCard) generated = domainCard;
    }
  }

  if (generated) {
    return resolveSlottedCard(config || { type: 'custom:hass-dashboard-pro' }, `entity.domain.${entity.domain}`, generated, 'md', 0, slotContext).html;
  }

  // Default card for light, switch, fan, sensor, etc.
  const active = isEntityOn(entity.state, entity.domain);
  const stateText = escapeHTML(formatDeviceState(entity, hass));
  const iconSVG = getEntityIconSVG(entity.domain, active);
  const isSensor = entity.domain === 'sensor' || entity.domain === 'binary_sensor';
  const skinCls = cardSkinClass(skin);
  const cardCls = active ? `dvc dvc--on ${skinCls}` : `dvc ${skinCls}`;
  const entityId = escapeAttribute(entity.entity_id);
  const cardAttrs = isSensor
    ? `data-entity="${entityId}"`
    : `data-entity="${entityId}" data-action="toggle" role="button" tabindex="0" aria-pressed="${active ? 'true' : 'false'}"`;

  const rightHTML = isSensor
    ? `<span class="dvc-val">${stateText}</span>`
    : `<div class="dvc-toggle">
        <div class="dvc-tg ${active ? 'dvc-tg--on' : 'dvc-tg--off'}">
          <div class="dvc-tg-knob ${active ? '' : 'dvc-tg-knob--off'}"></div>
        </div>
      </div>`;

  generated = `<div class="${cardCls}" ${cardAttrs}>
    <div class="dvc-bar"></div>
    <div class="dvc-row">
      <div class="dvc-ico ${active ? 'dvc-ico--on' : 'dvc-ico--off'}">${iconSVG}</div>
      <div class="dvc-info">
        <div class="dvc-name">${escapeHTML(entity.name)}</div>
        <div class="dvc-state">
          <span class="dvc-dot ${active ? 'dvc-dot--on' : 'dvc-dot--off'}"></span>
          ${stateText}
        </div>
        <div class="dvc-area">${escapeHTML(entity.area_name)}</div>
      </div>
      ${rightHTML}
    </div>
  </div>`;
  return resolveSlottedCard(config || { type: 'custom:hass-dashboard-pro' }, `entity.domain.${entity.domain}`, generated, 'md', 0, slotContext).html;
}

// ─── Domain Color Map ───────────────────────────────────────────────────────

function formatDeviceState(entity: EntityInfo, hass?: Hass): string {
  if (isDeviceTemperatureSensor(entity, hass)) {
    const celsius = normalizeTemperatureToCelsius(entity.state, entity.unit);
    if (!isNaN(celsius)) return formatTemperatureCelsius(celsius);
  }
  return formatState(entity);
}

function isDeviceTemperatureSensor(entity: EntityInfo, hass?: Hass): boolean {
  if (entity.domain !== 'sensor' && entity.domain !== 'number') return false;
  const attrs = hass?.states[entity.entity_id]?.attributes || {};
  const deviceClass = attrs.device_class;
  const lowerId = entity.entity_id.toLowerCase();
  return deviceClass === 'temperature'
    || isTemperatureUnit(entity.unit)
    || lowerId.includes('temperature')
    || lowerId.includes('temp');
}

function getDomainColor(domain: string): { bg: string; fg: string } {
  const map: Record<string, { bg: string; fg: string }> = {
    light:        { bg: 'var(--hdp-warning-light, rgba(254,243,199,0.5))', fg: 'var(--hdp-warning, #D97706)' },
    switch:       { bg: 'rgba(124,110,247,0.1)', fg: 'var(--hdp-accent, #7C6EF7)' },
    climate:      { bg: 'var(--hdp-info-light, rgba(219,234,254,0.5))', fg: 'var(--hdp-info, #3B82F6)' },
    fan:          { bg: 'var(--hdp-success-light, rgba(236,253,245,0.5))', fg: 'var(--hdp-success, #16A34A)' },
    cover:        { bg: 'rgba(124,110,247,0.1)', fg: 'var(--hdp-accent, #7C6EF7)' },
    lock:         { bg: 'var(--hdp-danger-light, rgba(254,226,226,0.5))', fg: 'var(--hdp-danger, #EF4444)' },
    media_player: { bg: 'var(--hdp-info-light, rgba(219,234,254,0.5))', fg: 'var(--hdp-info, #3B82F6)' },
    vacuum:       { bg: 'var(--hdp-success-light, rgba(236,253,245,0.5))', fg: 'var(--hdp-success, #16A34A)' },
    camera:       { bg: 'var(--hdp-divider, color-mix(in srgb, var(--hdp-text, CanvasText) 6%, transparent))', fg: 'var(--hdp-text-muted)' },
    sensor:       { bg: 'var(--hdp-divider, color-mix(in srgb, var(--hdp-text, CanvasText) 6%, transparent))', fg: 'var(--hdp-text-muted)' },
    binary_sensor:{ bg: 'var(--hdp-divider, color-mix(in srgb, var(--hdp-text, CanvasText) 6%, transparent))', fg: 'var(--hdp-text-muted)' },
    button:       { bg: 'rgba(124,110,247,0.1)', fg: 'var(--hdp-accent, #7C6EF7)' },
  };
  return map[domain] || { bg: 'var(--hdp-divider, color-mix(in srgb, var(--hdp-text, CanvasText) 6%, transparent))', fg: 'var(--hdp-text-muted)' };
}

// ─── Domain Icons (SVG) ─────────────────────────────────────────────────────

function getDomainIconSVG(domain: string): string {
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

// ─── Entity Icons (SVG) ─────────────────────────────────────────────────────

function getEntityIconSVG(domain: string, active: boolean): string {
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
