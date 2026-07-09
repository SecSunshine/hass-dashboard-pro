/**
 * Bottom Navigation — Mobile Navigation Bar
 *
 * Visible only at ≤768px. Fixed to bottom of viewport.
 * 4 buttons: Home, Devices, Blueprint Pages, HA Menu.
 */

import type { BlueprintInstance } from '../types';
import { escapeAttribute, escapeHTML, escapeJSONAttribute } from '../utils/html';
import { safeBlueprintViewId } from '../utils/dom-id';

export interface BottomNavOptions {
  blueprintPages: BlueprintInstance[];
  showSettings?: boolean;
}

/**
 * Build the bottom navigation HTML string.
 */
export function buildBottomNavHTML(opts: BottomNavOptions): string {
  const pages = opts.blueprintPages;
  const settingsHTML = opts.showSettings === false
    ? ''
    : `<button class="bn-btn" data-view="settings" data-action="show-view" onclick="hdpShowView('settings')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      <span>设置</span>
    </button>`;

  // Blueprint pages button
  let pagesHTML = '';
  if (pages.length === 1) {
    const viewId = escapeAttribute(safeBlueprintViewId(pages[0].id));
    const viewArg = escapeJSONAttribute(safeBlueprintViewId(pages[0].id));
    pagesHTML = `<button class="bn-btn" data-view="${viewId}" data-action="show-view" onclick="hdpShowView(${viewArg})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span>${escapeHTML(pages[0].name)}</span>
    </button>`;
  } else if (pages.length > 1) {
    const items = pages.map(p => {
      const viewId = escapeAttribute(safeBlueprintViewId(p.id));
      const viewArg = escapeJSONAttribute(safeBlueprintViewId(p.id));
      return `<div class="bn-sheet-item" data-view="${viewId}" data-action="show-view" onclick="hdpShowView(${viewArg});hdpCloseSheet()">${escapeHTML(p.name)}</div>`;
    }).join('');
    pagesHTML = `<button class="bn-btn" onclick="hdpToggleSheet()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
      <span>页面</span>
    </button>
    <div class="bn-sheet" id="hdp-sheet" style="display:none">
      <div class="bn-sheet-header">蓝图页面</div>
      ${items}
    </div>`;
  }

  return `<div class="hdp-bottom-nav">
    <button class="bn-btn bn-btn--home" data-view="home" onclick="hdpShowView('home')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>首页</span>
    </button>
    <button class="bn-btn" data-view="devices" onclick="hdpShowView('devices')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
      <span>设备</span>
    </button>
    ${pagesHTML}
    ${settingsHTML}
    <button class="bn-btn" onclick="hdpToggleHAMenu()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      <span>菜单</span>
    </button>
  </div>`;
}

/**
 * Generate bottom nav CSS.
 */
export function getBottomNavCSS(): string {
  return `
    .hdp-bottom-nav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: var(--hdp-bottom-nav-height, 64px);
      background: var(--hdp-surface-card, var(--hdp-card-bg));
      border-top: 1px solid var(--hdp-border);
      box-shadow: var(--hdp-shadow-elevated, 0 -4px 24px rgba(0,0,0,0.1));
      z-index: 1000;
      justify-content: space-around;
      align-items: center;
      padding: 0 8px;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }
    .bn-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      border: 1px solid transparent;
      border-radius: var(--hdp-radius-sm, 8px);
      background: transparent;
      cursor: pointer;
      font: inherit;
      font-size: 10px;
      font-weight: 500;
      color: var(--hdp-text-muted);
      min-width: 52px;
      transition: color 0.15s, background 0.15s, border-color 0.15s;
      position: relative;
    }
    .bn-btn:hover {
      color: var(--hdp-primary);
      background: var(--hdp-control-bg-hover, var(--hdp-primary-light));
      border-color: var(--hdp-border);
    }
    .bn-btn--active {
      color: var(--hdp-primary);
      background: var(--hdp-primary-light, var(--hdp-control-bg-hover));
      border-color: color-mix(in srgb, var(--hdp-primary) 24%, var(--hdp-border));
    }
    .bn-btn svg {
      width: 22px; height: 22px;
    }
    .bn-sheet {
      position: fixed;
      bottom: var(--hdp-bottom-nav-height, 64px);
      left: 0;
      right: 0;
      background: var(--hdp-modal-bg, var(--hdp-card-bg));
      border-top: 1px solid var(--hdp-border);
      border-radius: 16px 16px 0 0;
      box-shadow: var(--hdp-shadow-elevated, 0 -4px 24px rgba(0,0,0,0.1));
      z-index: 1001;
      max-height: 50vh;
      overflow-y: auto;
      padding: 8px 0;
    }
    .bn-sheet-header {
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      color: var(--hdp-text-secondary);
      padding: 8px 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .bn-sheet-item {
      padding: 12px 16px;
      font: inherit;
      font-size: 14px;
      color: var(--hdp-text);
      cursor: pointer;
      transition: background 0.1s;
    }
    .bn-sheet-item:hover {
      background: var(--hdp-control-bg-hover, var(--hdp-divider));
    }
    @media (max-width: 768px) {
      .hdp-bottom-nav { display: flex; }
      .hdp-sidebar { display: none !important; }
      .hdp-resize-handle { display: none !important; }
      .hdp-main { padding-bottom: calc(var(--hdp-bottom-nav-height, 64px) + 16px); }
    }
  `;
}
