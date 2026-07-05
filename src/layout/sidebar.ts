/**
 * Sidebar — Desktop Navigation
 *
 * Generates the left sidebar HTML with:
 *   - Dashboard title/header
 *   - Home button
 *   - Floor-grouped area list with entity counts
 *   - Devices button
 *   - Settings gear (bottom)
 */

import type { Hass, AreaSummary, StrategyConfig } from '../types';
import { groupAreasByFloor } from '../utils/area-entities';
import { getAreaIcon } from '../strategies/dashboard-strategy';
import { escapeAttribute, escapeHTML } from '../utils/html';

export interface SidebarOptions {
  title: string;
  areas: AreaSummary[];
  hass: Hass;
  config: StrategyConfig;
  hiddenAreas: string[];
}

/**
 * Build the sidebar HTML string.
 */
export function buildSidebarHTML(opts: SidebarOptions): string {
  const { title, areas, hass, config, hiddenAreas } = opts;
  const visibleAreas = areas.filter(a => !hiddenAreas.includes(a.area_id));
  const floorGroups = groupAreasByFloor(hass);
  const showSettings = shouldShowSettings(hass, config);

  // Build floor sections
  const floorSections: string[] = [];
  const floors = Array.from(floorGroups.entries()).sort((a, b) => {
    if (a[0] === null) return 1;
    if (b[0] === null) return -1;
    return 0;
  });

  for (const [floorId, { floorName, areas: floorAreaIds }] of floors) {
    const floorAreas = visibleAreas.filter(a => floorAreaIds.includes(a.area_id));
    if (floorAreas.length === 0) continue;

    const areaItems = floorAreas.map(a => {
      const icon = getAreaIcon(a.area_name);
      const tempHTML = a.temp ? `<span class="sb-temp">${escapeHTML(a.temp)}</span>` : '';
      const areaId = escapeAttribute(a.area_id);
      return `<button class="sb-area-btn" data-area="${areaId}" data-action="show-view" onclick="hdpShowView('${areaId}')">
        <span class="sb-area-icon">${getAreaIconSVG(icon)}</span>
        <span class="sb-area-info">
          <span class="sb-area-name">${escapeHTML(a.area_name)}</span>
          <span class="sb-area-meta">${a.entity_count} 设备${tempHTML}</span>
        </span>
      </button>`;
    }).join('');

    const sectionTitle = floorName
      ? `<div class="sb-floor-label">${escapeHTML(floorName)}</div>`
      : '';

    floorSections.push(`${sectionTitle}<div class="sb-floor-group">${areaItems}</div>`);
  }

  return `<div class="sb-header">
    <div class="sb-title">${escapeHTML(title)}</div>
  </div>
  <nav class="sb-nav">
    <button class="sb-nav-btn sb-nav-btn--active" data-view="home" onclick="hdpShowView('home')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>首页</span>
    </button>
    <button class="sb-nav-btn" data-view="devices" onclick="hdpShowView('devices')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
      <span>设备</span>
    </button>
  </nav>
  <div class="sb-divider"></div>
  <div class="sb-areas">
    ${floorSections.join('')}
  </div>
  <div class="sb-footer" style="${showSettings ? '' : 'display:none'}">
    <button class="sb-nav-btn" data-view="settings" onclick="hdpShowView('settings')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      <span>设置</span>
    </button>
  </div>`;
}

export function shouldShowSettings(hass: Hass, config: StrategyConfig): boolean {
  const permissions = config.hdp_config?.permissions;
  if (permissions?.restrict_settings) return false;
  if (permissions?.restrict_non_admin && hass.user?.is_admin === false) return false;
  return true;
}

/**
 * Generate sidebar CSS styles.
 */
export function getSidebarCSS(): string {
  return `
    .hdp-sidebar {
      width: var(--hdp-sidebar-width, 260px);
      min-width: 200px;
      max-width: 400px;
      height: 100vh;
      background: var(--hdp-card-bg);
      border-right: 1px solid var(--hdp-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: sticky;
      top: 0;
      flex-shrink: 0;
    }
    .sb-header {
      padding: 20px 16px 12px;
    }
    .sb-title {
      font: inherit;
      font-size: 18px;
      font-weight: 700;
      color: var(--hdp-text);
    }
    .sb-nav {
      padding: 0 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sb-nav-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--hdp-radius);
      border: none;
      background: transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      width: 100%;
      text-align: left;
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      color: var(--hdp-text-secondary);
    }
    .sb-nav-btn:hover {
      background: var(--hdp-divider);
      color: var(--hdp-text);
    }
    .sb-nav-btn--active {
      background: var(--hdp-primary-light, rgba(79,110,247,0.1));
      color: var(--hdp-primary);
      font-weight: 600;
    }
    .sb-nav-btn svg {
      width: 20px; height: 20px;
      flex-shrink: 0;
    }
    .sb-divider {
      height: 1px;
      background: var(--hdp-border);
      margin: 8px 16px;
    }
    .sb-areas {
      flex: 1;
      overflow-y: auto;
      padding: 0 8px;
    }
    .sb-floor-label {
      font: inherit;
      font-size: 11px;
      font-weight: 700;
      color: var(--hdp-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 12px 6px;
    }
    .sb-floor-group {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .sb-area-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: var(--hdp-radius);
      border: none;
      background: transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      width: 100%;
      text-align: left;
      font: inherit;
      font-size: 13px;
      color: var(--hdp-text-secondary);
    }
    .sb-area-btn:hover {
      background: var(--hdp-divider);
      color: var(--hdp-text);
    }
    .sb-area-btn--active {
      background: var(--hdp-primary-light, rgba(79,110,247,0.1));
      color: var(--hdp-primary);
      font-weight: 600;
    }
    .sb-area-icon {
      width: 28px; height: 28px;
      border-radius: var(--hdp-radius-sm);
      background: var(--hdp-divider);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .sb-area-btn--active .sb-area-icon {
      background: var(--hdp-primary-light, rgba(79,110,247,0.15));
      color: var(--hdp-primary);
    }
    .sb-area-icon svg {
      width: 16px; height: 16px;
    }
    .sb-area-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }
    .sb-area-name {
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      color: inherit;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sb-area-meta {
      font: inherit;
      font-size: 11px;
      color: var(--hdp-text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sb-temp {
      font-weight: 600;
      color: var(--hdp-text-secondary);
    }
    .sb-footer {
      padding: 8px;
      border-top: 1px solid var(--hdp-border);
    }
    .hdp-resize-handle {
      width: 4px;
      cursor: col-resize;
      background: transparent;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .hdp-resize-handle:hover,
    .hdp-resize-handle:active {
      background: var(--hdp-primary);
    }
  `;
}

// ─── Area Icon SVGs ────────────────────────────────────────────────────────

function getAreaIconSVG(mdiName: string): string {
  const c = 'currentColor';
  const icons: Record<string, string> = {
    'mdi:sofa': `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M4 11v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"/><path d="M4 15v2M20 15v2"/></svg>`,
    'mdi:chef-hat': `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>`,
    'mdi:bed-king': `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
    'mdi:bed': `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
    'mdi:shower': `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M4 4l16 0"/><path d="M4 12l16 0"/><path d="M8 4l0 8"/><path d="M16 4l0 8"/></svg>`,
    'mdi:door': `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><circle cx="15" cy="12" r="1" fill="${c}"/></svg>`,
    'mdi:car': `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17v2M19 17v2"/><circle cx="7.5" cy="14.5" r="1.5" fill="${c}"/><circle cx="16.5" cy="14.5" r="1.5" fill="${c}"/></svg>`,
    'mdi:flower': `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
    'mdi:desk': `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="2" y="6" width="20" height="4" rx="1"/><path d="M4 10v8M20 10v8M8 14h8"/></svg>`,
    'mdi:home-outline': `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  };
  return icons[mdiName] || icons['mdi:home-outline'];
}
