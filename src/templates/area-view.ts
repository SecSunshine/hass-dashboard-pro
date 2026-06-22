/**
 * Template: Area Detail View
 *
 * Generates per-area view with:
 * - Category badges (lights, climate, switches, etc.)
 * - Entity control cards with toggle switches
 * - Custom card placeholder
 *
 * All visual properties use CSS variables (--hdp-*) for runtime theme switching.
 */

import type { Hass, LovelaceCardConfig, EntityInfo, DomainGroup } from '../types';
import { generateDesignTokenCSS } from '../styles/design-tokens';
import type { ResolvedTokens } from '../utils/visual-config';
import { DOMAIN_GROUPS } from '../types';
import { formatState, isEntityOn } from '../utils/area-entities';

export function buildAreaView(areaName: string, entities: EntityInfo[], hass: Hass, tokens?: ResolvedTokens): LovelaceCardConfig[] {
  const groups = groupByDomain(entities);

  return [
    buildBadgesBar(groups, tokens),
    ...buildEntityCards(entities, tokens),
  ];
}

// ─── Category Badges ──────────────────────────────────────────────────────

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
  const badgesHTML = groups
    .map((g) => {
      const textColor = getTextColorForBadge(g.badge_color);
      return `<div class="badge" style="background: ${g.badge_color};">
        <span class="badge-label" style="color: ${textColor};">${g.label} ${g.entities.length}</span>
      </div>`;
    })
    .join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .badges-bar { display: flex; gap: 10px; flex-wrap: wrap; }
  .badge {
    display: inline-flex; align-items: center;
    padding: 6px 10px; border-radius: 20px;
  }
  .badge-label { font-size: 12px; font-weight: 600; }
</style>
<div class="badges-bar">${badgesHTML}</div>`,
  };
}

function getTextColorForBadge(bg: string): string {
  const map: Record<string, string> = {
    '#FEF3C7': '#92400E',
    '#DBEAFE': '#1E40AF',
    '#EDE9FE': '#5B21B6',
    '#ECFDF5': '#065F46',
    '#FEE2E2': '#991B1B',
    '#F1F5F9': '#475569',
  };
  return map[bg] || '#64748B';
}

// ─── Entity Control Cards ─────────────────────────────────────────────────

function buildEntityCards(entities: EntityInfo[], tokens?: ResolvedTokens): LovelaceCardConfig[] {
  const top = entities.slice(0, 8);
  return top.map((entity) => buildEntityCard(entity, tokens));
}

function buildEntityCard(entity: EntityInfo, tokens?: ResolvedTokens): LovelaceCardConfig {
  const active = isEntityOn(entity.state, entity.domain);
  const stateText = formatState(entity);
  const iconSVG = getDomainIcon(entity.domain, active);
  const cardId = `hdp-entity-${entity.entity_id.replace(/\./g, '-')}`;

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .entity-card {
    background: var(--hdp-card-bg); border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding); display: flex; align-items: center;
    gap: 14px; box-shadow: var(--hdp-shadow-card);
    cursor: pointer; transition: transform 0.15s ease;
  }
  .entity-card:active { transform: scale(0.98); }
  .entity-icon { width: 28px; height: 28px; flex-shrink: 0; }
  .entity-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .entity-name { font-size: 15px; font-weight: 600; color: var(--hdp-text); }
  .entity-status { font-size: 12px; color: var(--hdp-text-secondary); }
  .entity-toggle {
    width: 44px; height: 26px; border-radius: 20px;
    display: flex; align-items: center; flex-shrink: 0;
    transition: background 0.2s ease;
  }
  .entity-toggle--on { background: var(--hdp-primary); justify-content: center; }
  .entity-toggle--off { background: var(--hdp-divider); justify-content: flex-start; }
  .toggle-knob {
    width: 22px; height: 22px; background: white; border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
  .toggle-knob--off { border: 1px solid var(--hdp-border); }
</style>
<ha-card style="--ha-card-box-shadow: none; margin: 0; border: none;">
  <div class="entity-card" id="${cardId}" data-entity="${entity.entity_id}">
    <div class="entity-icon">${iconSVG}</div>
    <div class="entity-info">
      <div class="entity-name">${entity.name}</div>
      <div class="entity-status">${stateText}</div>
    </div>
    <div class="entity-toggle ${active ? 'entity-toggle--on' : 'entity-toggle--off'}">
      <div class="toggle-knob ${active ? '' : 'toggle-knob--off'}"></div>
    </div>
  </div>
</ha-card>`,
  };
}

function getDomainIcon(domain: string, active: boolean): string {
  const color = active ? '#F59E0B' : '#94A3B8';
  switch (domain) {
    case 'light':
      return `<svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" fill="${active ? '#F59E0B' : '#94A3B8'}"/></svg>`;
    case 'climate':
      return `<svg width="28" height="28" viewBox="0 0 24 24"><path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4z" fill="${active ? '#3B82F6' : '#94A3B8'}"/></svg>`;
    case 'cover':
      return `<svg width="28" height="28" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="1" stroke="${active ? '#8B5CF6' : '#94A3B8'}" stroke-width="2" fill="none"/><line x1="12" y1="3" x2="12" y2="21" stroke="${active ? '#8B5CF6' : '#94A3B8'}" stroke-width="2"/></svg>`;
    case 'fan':
      return `<svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 13c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-9c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="${active ? '#16A34A' : '#94A3B8'}"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="none" stroke="${active ? '#16A34A' : '#94A3B8'}" stroke-width="2"/></svg>`;
    case 'media_player':
      return `<svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="${color}"/></svg>`;
    case 'switch':
      return `<svg width="28" height="28" viewBox="0 0 24 24"><path d="M13 3h-2v10h2V3zm2.83 2.17l-1.42 1.42C15.66 7.54 16.5 9.16 16.5 11c0 2.76-2.24 5-5 5s-5-2.24-5-5c0-1.84.84-3.46 2.09-4.41L7.17 5.17C5.28 6.76 4 9.26 4 12c0 4.41 3.59 8 8 8s8-3.59 8-8c0-2.74-1.28-5.24-3.17-6.83z" fill="${active ? '#8B5CF6' : '#94A3B8'}"/></svg>`;
    case 'lock':
      return `<svg width="28" height="28" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" fill="${color}"/></svg>`;
    case 'sensor':
    case 'binary_sensor':
      return `<svg width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="${color}" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="4" fill="${color}" opacity="0.6"/></svg>`;
    default:
      return `<svg width="28" height="28" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4" stroke="${color}" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" fill="${color}"/></svg>`;
  }
}
